import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it, vi } from "vitest";

import { claimWebhookReceipt, completeReceiptAndApplyEvidence, createPrismaPaymentRepository, createPrismaPostPaymentRepository, leaseDuePaymentAttempts, RECONCILIATION_POLICY, reconciliationBackoff } from "./order-repository";

const receipt = { provider: "mercado_pago", applicationId: "app-1", topic: "order", notificationId: "notification-1", resourceId: "order-1", rawBodySha256: "a".repeat(64) };

describe("durable checkout repository", () => {
  it("claims a composite receipt once, recovers an expired lease, and increments retry counters", async () => {
    const db = receiptDb();
    const first = await claimWebhookReceipt(db as never, receipt, new Date("2026-08-05T10:00:00Z"));
    const duplicate = await claimWebhookReceipt(db as never, receipt, new Date("2026-08-05T10:00:01Z"));
    const retry = await claimWebhookReceipt(db as never, receipt, new Date("2026-08-05T10:05:01Z"));
    expect(first.claimed).toBe(true);
    expect(duplicate.claimed).toBe(false);
    expect(retry).toMatchObject({ claimed: true, receipt: { attemptCount: 2, state: "PROCESSING" } });
  });

  it("uses stable (nextReconcileAt,id) ordering and leases only conditional winners", async () => {
    const db = attemptsDb([
      { id: "b", status: "PENDING", nextReconcileAt: new Date("2026-08-05T10:00:00Z"), reconcileLeaseUntil: null },
      { id: "a", status: "PENDING", nextReconcileAt: new Date("2026-08-05T10:00:00Z"), reconcileLeaseUntil: null },
      { id: "c", status: "PENDING", nextReconcileAt: new Date("2026-08-05T10:01:00Z"), reconcileLeaseUntil: null },
    ]);
    const leased = await leaseDuePaymentAttempts(db as never, new Date("2026-08-05T10:00:00Z"), 2, 60_000);
    expect(leased.map((attempt) => attempt.id)).toEqual(["a", "b"]);
    expect(db.claims).toEqual(["a", "b"]);
  });
});

function receiptDb() {
  const rows: Array<Record<string, unknown>> = [];
  const db = {
    $transaction: async (fn: (tx: unknown) => unknown) => fn(db),
    webhookReceipt: {
      findUnique: async ({ where }: { where: { provider_applicationId_topic_notificationId: typeof receipt } }) => rows.find((row) => row.provider === where.provider_applicationId_topic_notificationId.provider && row.applicationId === where.provider_applicationId_topic_notificationId.applicationId && row.topic === where.provider_applicationId_topic_notificationId.topic && row.notificationId === where.provider_applicationId_topic_notificationId.notificationId) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => { const row = { id: "r1", ...data }; rows.push(row); return row; },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { const row = rows.find((item) => item.id === where.id)!; const normalized = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === "object" && value && "increment" in value ? Number(row[key]) + Number((value as { increment: number }).increment) : value])); Object.assign(row, normalized); return row; },
    },
  };
  return db;
}

function attemptsDb(rows: Array<Record<string, unknown>>) {
  const db = {
    claims: [] as string[],
    paymentAttempt: {
      findMany: async ({ take }: { take: number }) => [...rows].sort((left, right) => ((left.nextReconcileAt as Date).getTime() - (right.nextReconcileAt as Date).getTime()) || String(left.id).localeCompare(String(right.id))).slice(0, take),
      updateMany: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { const row = rows.find((item) => item.id === where.id)!; if (row.reconcileLeaseUntil) return { count: 0 }; Object.assign(row, data); db.claims.push(where.id); return { count: 1 }; },
    },
  };
  return db;
}

const postgresUrl = process.env.DATABASE_URL ?? "postgresql://ecomerce_futbol:ecomerce_futbol_password@localhost:5432/ecomerce_futbol?schema=public";
const postgres = new PrismaClient({ datasources: { db: { url: postgresUrl } } });

describe("durable checkout repository on PostgreSQL", () => {
  afterAll(async () => { await postgres.$disconnect(); });

  it("allows exactly one concurrent PostgreSQL receipt claim and exactly one stale-lease recovery", async () => {
    const notificationId = randomUUID();
    const input = { ...receipt, notificationId };
    const firstNow = new Date("2026-08-05T10:00:00Z");
    const firstClaims = await Promise.all(Array.from({ length: 8 }, () => claimWebhookReceipt(postgres, input, firstNow, 1_000)));
    expect(firstClaims.filter((result) => result.claimed)).toHaveLength(1);
    expect((await postgres.webhookReceipt.findUniqueOrThrow({ where: { provider_applicationId_topic_notificationId: { provider: input.provider, applicationId: input.applicationId, topic: input.topic, notificationId } } })).attemptCount).toBe(1);

    const recovered = await Promise.all(Array.from({ length: 8 }, () => claimWebhookReceipt(postgres, input, new Date("2026-08-05T10:00:02Z"), 1_000)));
    expect(recovered.filter((result) => result.claimed)).toHaveLength(1);
    expect((await postgres.webhookReceipt.findUniqueOrThrow({ where: { provider_applicationId_topic_notificationId: { provider: input.provider, applicationId: input.applicationId, topic: input.topic, notificationId } } })).attemptCount).toBe(2);
  });
});
describe("receipt-bound reconciliation on PostgreSQL", () => {
  it("does not mutate an attempt or order until the durable receipt is claimed", async () => {
    const orderId = randomUUID();
    const attemptId = randomUUID();
    const receiptId = randomUUID();
    await postgres.order.create({ data: { id: orderId, contactEmail: "buyer@example.com", contactFullName: "Buyer", contactPhone: "123", shippingAddress: {}, total: 100, statusCapabilityHash: "capability" } });
    await postgres.paymentAttempt.create({ data: { id: attemptId, orderId, intentId: randomUUID(), idempotencyKey: randomUUID(), payloadHash: "hash", status: "PENDING" } });
    await postgres.webhookReceipt.create({ data: { id: receiptId, provider: "mercado_pago", applicationId: "app-atomic", topic: "order", notificationId: randomUUID(), resourceId: "mp-order", rawBodySha256: "b".repeat(64), state: "RECEIVED" } });
    const providerOrderId = `mp-${randomUUID()}`;
    const input = { receiptId, attemptId, orderId, outcome: "PAID" as const, evidence: { id: providerOrderId, externalReference: orderId, status: "processed", statusDetail: "accredited", updatedAt: "2026-08-05T10:00:00.000Z", payment: { id: `pay-${randomUUID()}`, status: "processed", statusDetail: "accredited" } } };
    await expect(completeReceiptAndApplyEvidence(postgres, input)).rejects.toThrow("RECEIPT_NOT_CLAIMED");
    await expect(postgres.paymentAttempt.findUniqueOrThrow({ where: { id: attemptId } })).resolves.toMatchObject({ status: "PENDING" });
    await expect(postgres.order.findUniqueOrThrow({ where: { id: orderId } })).resolves.toMatchObject({ status: "PENDING_CONFIRMATION" });

    await postgres.webhookReceipt.update({ where: { id: receiptId }, data: { state: "PROCESSING" } });
    await completeReceiptAndApplyEvidence(postgres, input);
    await expect(postgres.paymentAttempt.findUniqueOrThrow({ where: { id: attemptId } })).resolves.toMatchObject({ status: "PAID", providerOrderId });
    await expect(postgres.order.findUniqueOrThrow({ where: { id: orderId } })).resolves.toMatchObject({ status: "PAID" });
    await expect(postgres.webhookReceipt.findUniqueOrThrow({ where: { id: receiptId } })).resolves.toMatchObject({ state: "PROCESSED" });
  });
});


describe("durable reconciliation policy on PostgreSQL", () => {
  it("persists bounded backoff exhaustion as a durable alert", async () => {
    const orderId = randomUUID();
    const attemptId = randomUUID();
    await postgres.order.create({ data: { id: orderId, contactEmail: "retry@example.com", contactFullName: "Retry", contactPhone: "456", shippingAddress: {}, total: 100, statusCapabilityHash: "capability" } });
    await postgres.paymentAttempt.create({ data: { id: attemptId, orderId, intentId: randomUUID(), idempotencyKey: randomUUID(), payloadHash: "hash", status: "PENDING", reconcileCount: RECONCILIATION_POLICY.maxAttempts } });
    await createPrismaPaymentRepository(postgres).markReconcilePending(attemptId, "PROVIDER_LOOKUP_RETRYABLE");
    await expect(postgres.paymentAttempt.findUniqueOrThrow({ where: { id: attemptId } })).resolves.toMatchObject({ nextReconcileAt: null, reconcileLastError: "RECONCILIATION_EXHAUSTED:PROVIDER_LOOKUP_RETRYABLE" });
  });
});

describe("reservation transitions and reconciliation schedule on PostgreSQL", () => {
  it("persists immediate provider evidence and the paid stock transition atomically", async () => {
    const fixture = await activeReservationFixture();
    const evidence = fixture.input("processed", "processed").evidence;

    await createPrismaPaymentRepository(postgres).settleProviderEvidence({ attemptId: fixture.attemptId, evidence, outcome: "PAID" });

    await expect(postgres.paymentAttempt.findUniqueOrThrow({ where: { id: fixture.attemptId } })).resolves.toMatchObject({ status: "PAID", providerOrderId: evidence.id, providerPaymentId: evidence.payment.id });
    await expect(postgres.order.findUniqueOrThrow({ where: { id: fixture.orderId } })).resolves.toMatchObject({ status: "PAID" });
    await expect(postgres.stockReservation.findUniqueOrThrow({ where: { id: fixture.reservationId } })).resolves.toMatchObject({ status: "CONSUMED" });
  });

  it("consumes or releases ACTIVE reservations with the receipt-bound reconciliation", async () => {
    const paid = await activeReservationFixture();
    await completeReceiptAndApplyEvidence(postgres, paid.input("processed", "processed"));
    await expect(postgres.stockReservation.findUniqueOrThrow({ where: { id: paid.reservationId } })).resolves.toMatchObject({ status: "CONSUMED" });
    await expect(postgres.productVariant.findUniqueOrThrow({ where: { id: paid.variantId } })).resolves.toMatchObject({ stock: 9 });

    const failed = await activeReservationFixture();
    await completeReceiptAndApplyEvidence(postgres, failed.input("rejected", "rejected"));
    await expect(postgres.stockReservation.findUniqueOrThrow({ where: { id: failed.reservationId } })).resolves.toMatchObject({ status: "RELEASED" });
    await expect(postgres.productVariant.findUniqueOrThrow({ where: { id: failed.variantId } })).resolves.toMatchObject({ stock: 10 });
  });

  it("rolls back order, attempt, and reservation when a mid-transition write fails", async () => {
    const fixture = await activeReservationFixture();
    const failingPrisma = { $transaction: async (work: (tx: unknown) => Promise<unknown>, options: unknown) => postgres.$transaction(async (tx) => work(new Proxy(tx, { get(target, property, receiver) { if (property !== "stockReservation") return Reflect.get(target, property, receiver); return new Proxy(target.stockReservation, { get(delegate, method, delegateReceiver) { if (method === "updateMany") return async () => { throw new Error("INJECTED_RESERVATION_FAILURE"); }; return Reflect.get(delegate, method, delegateReceiver); } }); } }) as never), options as never) };
    await expect(completeReceiptAndApplyEvidence(failingPrisma as never, fixture.input("processed", "processed"))).rejects.toThrow("INJECTED_RESERVATION_FAILURE");
    await expect(postgres.paymentAttempt.findUniqueOrThrow({ where: { id: fixture.attemptId } })).resolves.toMatchObject({ status: "PENDING", providerOrderId: null });
    await expect(postgres.order.findUniqueOrThrow({ where: { id: fixture.orderId } })).resolves.toMatchObject({ status: "PENDING_CONFIRMATION" });
    await expect(postgres.stockReservation.findUniqueOrThrow({ where: { id: fixture.reservationId } })).resolves.toMatchObject({ status: "ACTIVE" });
  });

  it("executes initial, exponential, and capped retry schedules", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-08-05T10:00:00Z"));
    try {
      const repository = createPrismaPaymentRepository(postgres);
      const fixtures = [];
      for (const reconcileCount of [0, 1, 6]) {
        const orderId = randomUUID(); const attemptId = randomUUID();
        await postgres.order.create({ data: { id: orderId, contactEmail: `${attemptId}@example.com`, contactFullName: "Retry", contactPhone: "456", shippingAddress: {}, total: 100, statusCapabilityHash: "capability" } });
        await postgres.paymentAttempt.create({ data: { id: attemptId, orderId, intentId: randomUUID(), idempotencyKey: randomUUID(), payloadHash: "hash", status: "PENDING", reconcileCount } });
        await repository.markReconcilePending(attemptId, "PROVIDER_LOOKUP_RETRYABLE");
        fixtures.push({ reconcileCount, attempt: await postgres.paymentAttempt.findUniqueOrThrow({ where: { id: attemptId } }) });
      }
      for (const { reconcileCount, attempt } of fixtures) expect(attempt.nextReconcileAt).toEqual(new Date(Date.now() + reconciliationBackoff(reconcileCount)));
      const delays = fixtures.map(({ attempt }) => { expect(attempt.nextReconcileAt).not.toBeNull(); return attempt.nextReconcileAt!.getTime() - Date.now(); });
      expect(delays).toEqual([60_000, 120_000, 3_600_000]);
    } finally { vi.useRealTimers(); }
  });
});

describe("post-payment terminal reservation transitions", () => {
  it("releases CONSUMED reservations and restores stock exactly once across a refund retry", async () => {
    const fixture = postPaymentMemoryFixture({ orderStatus: "PAID", reservationStatus: "CONSUMED", operation: "refund" });
    const repository = createPrismaPostPaymentRepository(fixture.db as never);

    await repository.completeOperation(fixture.orderId, "refund", { id: fixture.providerOrderId, status: "refunded" });
    await repository.completeOperation(fixture.orderId, "refund", { id: fixture.providerOrderId, status: "refunded" });

    expect(fixture.read()).toMatchObject({ order: { status: "REFUNDED" }, reservation: { status: "RELEASED" }, stock: 10 });
  });

  it("releases ACTIVE reservations exactly once when cancelling an eligible order", async () => {
    const fixture = postPaymentMemoryFixture({ orderStatus: "PAYMENT_PENDING", reservationStatus: "ACTIVE", operation: "cancel" });
    const repository = createPrismaPostPaymentRepository(fixture.db as never);

    await repository.completeOperation(fixture.orderId, "cancel", { id: fixture.providerOrderId, status: "cancelled" });
    await repository.completeOperation(fixture.orderId, "cancel", { id: fixture.providerOrderId, status: "cancelled" });

    expect(fixture.read()).toMatchObject({ order: { status: "CANCELLED" }, reservation: { status: "RELEASED" }, stock: 10 });
  });

  it("settles a concurrent cancellation and verified action webhook without duplicate stock or a serialization failure", async () => {
    const fixture = postPaymentMemoryFixture({ orderStatus: "PAYMENT_PENDING", reservationStatus: "ACTIVE", operation: "cancel", withReceipt: true });
    const repository = createPrismaPostPaymentRepository(fixture.db as never);
    const evidence = fixture.evidence("cancelled", "cancelled");

    await expect(Promise.all([
      repository.completeOperation(fixture.orderId, "cancel", { id: fixture.providerOrderId, status: "cancelled" }),
      completeReceiptAndApplyEvidence(fixture.db as never, { receiptId: fixture.receiptId!, attemptId: fixture.attemptId!, orderId: fixture.orderId, outcome: "PENDING", evidence }),
    ])).resolves.toHaveLength(2);

    expect(fixture.read()).toMatchObject({ order: { status: "CANCELLED" }, reservation: { status: "RELEASED" }, stock: 10 });
  });

  it("releases consumed stock for a refund receipt once and only acknowledges a later terminal receipt", async () => {
    const fixture = postPaymentMemoryFixture({ orderStatus: "PAID", reservationStatus: "CONSUMED", operation: "refund", withReceipt: true });
    const evidence = fixture.evidence("refunded", "refunded");

    await completeReceiptAndApplyEvidence(fixture.db as never, { receiptId: fixture.receiptId!, attemptId: fixture.attemptId!, orderId: fixture.orderId, outcome: "PENDING", evidence });
    expect(fixture.read()).toMatchObject({ order: { status: "REFUNDED" }, reservation: { status: "RELEASED" }, stock: 10, receipt: { state: "PROCESSED" } });

    const lateReceiptId = fixture.claimLateReceipt();
    await completeReceiptAndApplyEvidence(fixture.db as never, { receiptId: lateReceiptId, attemptId: fixture.attemptId!, orderId: fixture.orderId, outcome: "PENDING", evidence });

    expect(fixture.read()).toMatchObject({ order: { status: "REFUNDED" }, reservation: { status: "RELEASED" }, stock: 10, receipt: { id: lateReceiptId, state: "PROCESSED" } });
  });

  it("retries a serializable action-webhook race instead of exposing a serialization failure", async () => {
    const fixture = postPaymentMemoryFixture({ orderStatus: "PAYMENT_PENDING", reservationStatus: "ACTIVE", operation: "cancel", withReceipt: true });
    let rejectFirstTransaction = true;
    const racingDb = {
      ...fixture.db,
      $transaction: async (work: (tx: unknown) => Promise<unknown>) => {
        if (rejectFirstTransaction) {
          rejectFirstTransaction = false;
          const error = Object.assign(new Error("simulated serializable action-webhook conflict"), { code: "P2034" });
          throw error;
        }
        return fixture.db.$transaction(work);
      },
    };
    const repository = createPrismaPostPaymentRepository(racingDb as never);
    const evidence = fixture.evidence("cancelled", "cancelled");

    await expect(Promise.all([
      completeReceiptAndApplyEvidence(racingDb as never, { receiptId: fixture.receiptId!, attemptId: fixture.attemptId!, orderId: fixture.orderId, outcome: "PENDING", evidence }),
      repository.completeOperation(fixture.orderId, "cancel", { id: fixture.providerOrderId, status: "cancelled" }),
    ])).resolves.toHaveLength(2);

    expect(fixture.read()).toMatchObject({ order: { status: "CANCELLED" }, reservation: { status: "RELEASED" }, stock: 10 });
  });

  it("rolls back the order, ledger, reservation, and stock when a terminal release fails", async () => {
    const fixture = postPaymentMemoryFixture({ orderStatus: "PAYMENT_PENDING", reservationStatus: "ACTIVE", operation: "cancel", failReservationUpdate: true });

    await expect(createPrismaPostPaymentRepository(fixture.db as never).completeOperation(fixture.orderId, "cancel", { id: fixture.providerOrderId, status: "cancelled" })).rejects.toThrow("INJECTED_TERMINAL_RELEASE_FAILURE");
    expect(fixture.read()).toMatchObject({ order: { status: "PAYMENT_PENDING" }, reservation: { status: "ACTIVE" }, stock: 9, operation: { status: "RUNNING" } });
  });
});

async function activeReservationFixture() {
  const id = randomUUID(); const category = await postgres.category.create({ data: { name: `Category ${id}`, slug: `category-${id}`, description: "Test category" } });
  const brand = await postgres.brand.create({ data: { name: `Brand ${id}`, slug: `brand-${id}`, description: "Test brand" } });
  const product = await postgres.product.create({ data: { name: `Product ${id}`, slug: `product-${id}`, description: "Test product", categoryId: category.id, brandId: brand.id, price: 100, status: "PUBLISHED" } });
  const variant = await postgres.productVariant.create({ data: { productId: product.id, name: "Test variant", stock: 9, isActive: true } });
  const orderId = randomUUID(); const attemptId = randomUUID(); const receiptId = randomUUID(); const reservationId = randomUUID();
  await postgres.order.create({ data: { id: orderId, contactEmail: `${id}@example.com`, contactFullName: "Buyer", contactPhone: "123", shippingAddress: {}, total: 100, statusCapabilityHash: "capability" } });
  await postgres.paymentAttempt.create({ data: { id: attemptId, orderId, intentId: randomUUID(), idempotencyKey: randomUUID(), payloadHash: "hash", status: "PENDING" } });
  await postgres.stockReservation.create({ data: { id: reservationId, orderId, variantId: variant.id, quantity: 1, status: "ACTIVE" } });
  await postgres.webhookReceipt.create({ data: { id: receiptId, provider: "mercado_pago", applicationId: "app-reservation", topic: "order", notificationId: randomUUID(), resourceId: `mp-${id}`, rawBodySha256: "c".repeat(64), state: "PROCESSING" } });
  return { orderId, attemptId, receiptId, reservationId, variantId: variant.id, input: (status: string, paymentStatus: string) => ({ receiptId, attemptId, orderId, outcome: "PENDING" as const, evidence: { id: `mp-${id}`, externalReference: orderId, status, statusDetail: status === "processed" ? "accredited" : status, updatedAt: "2026-08-05T10:00:00.000Z", payment: { id: `pay-${id}`, status: paymentStatus, statusDetail: paymentStatus === "processed" ? "accredited" : paymentStatus } } }) };
}

function postPaymentMemoryFixture({ orderStatus, reservationStatus, operation, withReceipt = false, failReservationUpdate = false }: { orderStatus: "PAID" | "PAYMENT_PENDING"; reservationStatus: "ACTIVE" | "CONSUMED"; operation: "cancel" | "refund"; withReceipt?: boolean; failReservationUpdate?: boolean }) {
  const orderId = randomUUID(); const providerOrderId = `mp-${randomUUID()}`; const reservationId = randomUUID();
  let state = { order: { id: orderId, status: orderStatus }, reservation: { id: reservationId, orderId, variantId: "variant-1", quantity: 1, status: reservationStatus }, stock: 9, operation: { status: "RUNNING" }, attempt: { id: "attempt-1", orderId, status: "PENDING" }, receipt: { id: "receipt-1", state: "PROCESSING" } };
  const db = {
    $transaction: async (work: (tx: unknown) => Promise<unknown>) => {
      const before = structuredClone(state);
      const tx = {
        order: {
          findUniqueOrThrow: async () => ({ ...state.order, reservations: [{ ...state.reservation }] }),
          findUnique: async () => ({ ...state.order, reservations: [{ ...state.reservation }] }),
          update: async ({ data }: { data: { status: typeof orderStatus | "CANCELLED" | "REFUNDED" } }) => Object.assign(state.order, data),
        },
        stockReservation: {
          findMany: async ({ where }: { where: { status: string } }) => state.reservation.status === where.status ? [{ ...state.reservation }] : [],
          updateMany: async ({ where, data }: { where: { status?: string }; data: { status: string } }) => { if (failReservationUpdate) throw new Error("INJECTED_TERMINAL_RELEASE_FAILURE"); if (!where.status || state.reservation.status === where.status) state.reservation.status = data.status as typeof state.reservation.status; return { count: 1 }; },
        },
        productVariant: { update: async ({ data }: { data: { stock: { increment: number } } }) => { state.stock += data.stock.increment; } },
        postPaymentOperation: { update: async ({ data }: { data: { status: string } }) => Object.assign(state.operation, data) },
        paymentAttempt: { findUniqueOrThrow: async () => ({ ...state.attempt }), update: async () => state.attempt },
        webhookReceipt: {
          findUniqueOrThrow: async () => ({ ...state.receipt }),
          findUnique: async () => ({ ...state.receipt }),
          update: async ({ data }: { data: { state?: string } }) => Object.assign(state.receipt, data),
          updateMany: async ({ data }: { data: { state?: string } }) => { Object.assign(state.receipt, data); return { count: 1 }; },
        },
      };
      try { return await work(tx); } catch (error) { state = before; throw error; }
    },
  };
  return {
    db,
    orderId,
    providerOrderId,
    reservationId,
    receiptId: withReceipt ? state.receipt.id : undefined,
    attemptId: withReceipt ? state.attempt.id : undefined,
    claimLateReceipt: () => {
      const id = "receipt-late";
      state.receipt = { id, state: "PROCESSING" };
      return id;
    },
    evidence: (status: string, paymentStatus: string) => ({ id: providerOrderId, externalReference: orderId, status, statusDetail: status, updatedAt: "2026-08-16T10:00:00.000Z", payment: { id: "payment-1", status: paymentStatus, statusDetail: paymentStatus } }),
    read: () => structuredClone(state),
  };
}
afterAll(async () => { await postgres.$disconnect(); });
