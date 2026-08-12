import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it, vi } from "vitest";

import { claimWebhookReceipt, completeReceiptAndApplyEvidence, createPrismaPaymentRepository, leaseDuePaymentAttempts, RECONCILIATION_POLICY, reconciliationBackoff } from "./order-repository";

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
afterAll(async () => { await postgres.$disconnect(); });
