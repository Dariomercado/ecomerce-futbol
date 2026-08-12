import type { Prisma, PrismaClient } from "@prisma/client";

import type { GuestOrder, OrderLine } from "./contracts";
import type { ProviderOrderEvidence } from "../payments/contracts";
import { applyAuthoritativeProviderState } from "../payments/state-machine";

export type ReservationLine = Pick<OrderLine, "variantId" | "quantity">;
export type WebhookReceiptInput = { provider: string; applicationId: string; topic: string; notificationId: string; resourceId: string; rawBodySha256: string; action?: string; liveMode?: boolean; providerCreatedAt?: Date; requestId?: string; signatureTimestamp?: string; signatureVersion?: string };
const serializable = { isolationLevel: "Serializable" as Prisma.TransactionIsolationLevel };
export const RECONCILIATION_POLICY = { maxAttempts: 7, initialBackoffMs: 60_000, maximumBackoffMs: 3_600_000 } as const;

/** Persists one validated order and its stock reservation atomically. */
export async function reserveOrder(prisma: PrismaClient, order: GuestOrder, statusCapabilityHash: string) {
  return prisma.$transaction(async (tx) => {
    for (const line of order.lines) {
      if (!line.variantId) continue;
      const updated = await tx.productVariant.updateMany({ where: { id: line.variantId, stock: { gte: line.quantity }, isActive: true }, data: { stock: { decrement: line.quantity } } });
      if (updated.count !== 1) throw new Error("STOCK_RESERVATION_UNAVAILABLE");
    }
    return tx.order.create({ data: { id: order.id, userId: order.userId, contactEmail: order.contact.email, contactFullName: order.contact.fullName, contactPhone: order.contact.phone, shippingAddress: order.shippingAddress, currency: order.currency, total: order.total, statusCapabilityHash, lines: { create: order.lines.map((line) => ({ productId: line.productId, variantId: line.variantId, name: line.name, quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: line.lineTotal })) }, reservations: { create: order.lines.filter((line) => line.variantId).map((line) => ({ variantId: line.variantId!, quantity: line.quantity })) } }, include: { lines: true, reservations: true } });
  }, serializable);
}

export async function claimWebhookReceipt(prisma: PrismaClient, input: WebhookReceiptInput, now = new Date(), leaseMs = 300_000) {
  return retrySerializable(() => claimReceipt(prisma, input, now, leaseMs));
}
async function claimReceipt(prisma: PrismaClient, input: WebhookReceiptInput, now: Date, leaseMs: number) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.webhookReceipt.findUnique({ where: { provider_applicationId_topic_notificationId: pickIdentity(input) } });
    const leaseUntil = new Date(now.getTime() + leaseMs);
    if (!existing) return { claimed: true, receipt: await tx.webhookReceipt.create({ data: { ...input, state: "PROCESSING", attemptCount: 1, leaseUntil, lastAttemptAt: now } }) };
    if (existing.state === "PROCESSED" || (existing.leaseUntil && existing.leaseUntil > now)) return { claimed: false, receipt: existing };
    return { claimed: true, receipt: await tx.webhookReceipt.update({ where: { id: existing.id }, data: { state: "PROCESSING", attemptCount: { increment: 1 }, leaseUntil, lastAttemptAt: now, lastErrorCode: null } }) };
  }, serializable);
}

export async function completeReceiptAndApplyEvidence(prisma: PrismaClient, input: { receiptId: string; attemptId: string; orderId: string; evidence: ProviderOrderEvidence; outcome: "PENDING" | "PAID" | "FAILED"; now?: Date }) {
  const now = input.now ?? new Date();
  return prisma.$transaction(async (tx) => {
    const receipt = await tx.webhookReceipt.findUniqueOrThrow({ where: { id: input.receiptId } });
    if (receipt.state !== "PROCESSING") throw new Error("RECEIPT_NOT_CLAIMED");
    const attempt = await tx.paymentAttempt.findUniqueOrThrow({ where: { id: input.attemptId } });
    const order = await tx.order.findUniqueOrThrow({ where: { id: input.orderId } });
    if (attempt.orderId !== order.id) throw new Error("ATTEMPT_ORDER_MISMATCH");
    const transition = applyAuthoritativeProviderState({ status: attempt.status === "PAID" ? "PAID" : attempt.status === "FAILED" ? "FAILED" : "PENDING", providerUpdatedAt: attempt.providerUpdatedAt?.toISOString(), orderStatus: attempt.providerOrderStatus ?? undefined, paymentStatus: attempt.providerPaymentStatus ?? undefined }, input.evidence);
    const outcome = transition.state.status;
    if (transition.action === "lookup_and_alert") return tx.webhookReceipt.update({ where: { id: input.receiptId }, data: { state: "RETRYABLE_FAILED", leaseUntil: null, lastErrorCode: transition.alert } });
    const attemptStatus = outcome;
    const orderStatus = outcome === "PAID" ? "PAID" : outcome === "FAILED" ? "PAYMENT_FAILED" : "PAYMENT_PENDING";
    await tx.paymentAttempt.update({ where: { id: input.attemptId }, data: { status: attemptStatus, providerOrderId: input.evidence.id, providerPaymentId: input.evidence.payment.id, providerOrderStatus: input.evidence.status, providerPaymentStatus: input.evidence.payment.status, providerStatusDetail: input.evidence.statusDetail, providerUpdatedAt: new Date(input.evidence.updatedAt), nextReconcileAt: outcome === "PENDING" ? new Date(now.getTime() + boundedBackoff(attempt.reconcileCount)) : null, reconcileLeaseUntil: null } });
    await tx.order.update({ where: { id: input.orderId }, data: { status: orderStatus } });
    if (outcome === "PAID") await tx.stockReservation.updateMany({ where: { orderId: input.orderId, status: "ACTIVE" }, data: { status: "CONSUMED" } });
    if (outcome === "FAILED") {
      const reservations = await tx.stockReservation.findMany({ where: { orderId: input.orderId, status: "ACTIVE" } });
      for (const reservation of reservations) await tx.productVariant.update({ where: { id: reservation.variantId }, data: { stock: { increment: reservation.quantity } } });
      await tx.stockReservation.updateMany({ where: { orderId: input.orderId, status: "ACTIVE" }, data: { status: "RELEASED" } });
    }
    const completed = await tx.webhookReceipt.updateMany({ where: { id: input.receiptId, state: "PROCESSING" }, data: { state: "PROCESSED", processedAt: now, leaseUntil: null, lastErrorCode: null } });
    if (completed.count !== 1) throw new Error("RECEIPT_CLAIM_LOST");
    return tx.webhookReceipt.findUniqueOrThrow({ where: { id: input.receiptId } });
  }, serializable);
}

export async function leaseDuePaymentAttempts(prisma: PrismaClient, now: Date, limit: number, leaseMs: number) {
  const candidates = await prisma.paymentAttempt.findMany({ where: { status: "PENDING", nextReconcileAt: { lte: now }, OR: [{ reconcileLeaseUntil: null }, { reconcileLeaseUntil: { lte: now } }] }, orderBy: [{ nextReconcileAt: "asc" }, { id: "asc" }], take: limit });
  const leaseUntil = new Date(now.getTime() + leaseMs); const leased = [];
  for (const candidate of candidates) {
    const winner = await prisma.paymentAttempt.updateMany({ where: { id: candidate.id, status: "PENDING", OR: [{ reconcileLeaseUntil: null }, { reconcileLeaseUntil: { lte: now } }] }, data: { reconcileLeaseUntil: leaseUntil, reconcileCount: { increment: 1 } } });
    if (winner.count === 1) leased.push({ ...candidate, reconcileLeaseUntil: leaseUntil });
  }
  return leased;
}

export function createPrismaPaymentRepository(prisma: PrismaClient) {
  return {
    async findAttempt(orderId: string, intentId: string) { return prisma.paymentAttempt.findUnique({ where: { orderId_intentId: { orderId, intentId } } }); },
    async createAttempt(input: { orderId: string; intentId: string; idempotencyKey: string; payloadHash: string }) { try { return await prisma.paymentAttempt.create({ data: input }); } catch (error) { if (isUnique(error)) throw new Error("UNIQUE_ATTEMPT_CONFLICT"); throw error; } },
    async claimDispatch(id: string) { const winner = await prisma.paymentAttempt.updateMany({ where: { id, status: "CREATED" }, data: { status: "DISPATCHING" } }); return winner.count ? prisma.paymentAttempt.findUnique({ where: { id } }) : null; },
    async markPending(id: string) { await prisma.paymentAttempt.update({ where: { id }, data: { status: "PENDING", nextReconcileAt: new Date(), reconcileLeaseUntil: null } }); },
    async markPaidAndConsume(id: string) { const attempt = await prisma.paymentAttempt.findUniqueOrThrow({ where: { id } }); await completeReceiptFreeOutcome(prisma, attempt.id, attempt.orderId, "PAID"); },
    async markFailedAndRelease(id: string) { const attempt = await prisma.paymentAttempt.findUniqueOrThrow({ where: { id } }); await completeReceiptFreeOutcome(prisma, attempt.id, attempt.orderId, "FAILED"); },
    async applyProviderEvidence(input: { attemptId: string; orderId: string; evidence: ProviderOrderEvidence }) { await prisma.paymentAttempt.update({ where: { id: input.attemptId }, data: { providerOrderId: input.evidence.id, providerPaymentId: input.evidence.payment.id, providerOrderStatus: input.evidence.status, providerPaymentStatus: input.evidence.payment.status, providerStatusDetail: input.evidence.statusDetail, providerUpdatedAt: new Date(input.evidence.updatedAt), status: "PENDING", nextReconcileAt: new Date(), reconcileLeaseUntil: null } }); },
    async markReconcilePending(id: string, errorCode: string) {
      await prisma.$transaction(async (tx) => {
        const attempt = await tx.paymentAttempt.findUniqueOrThrow({ where: { id } });
        const exhausted = attempt.reconcileCount >= RECONCILIATION_POLICY.maxAttempts;
        await tx.paymentAttempt.update({ where: { id }, data: {
          status: "PENDING",
          reconcileLeaseUntil: null,
          reconcileLastError: exhausted ? `RECONCILIATION_EXHAUSTED:${errorCode}` : errorCode,
          nextReconcileAt: exhausted ? null : new Date(Date.now() + reconciliationBackoff(attempt.reconcileCount)),
        } });
      }, serializable);
    },
  };
}

async function completeReceiptFreeOutcome(prisma: PrismaClient, attemptId: string, orderId: string, outcome: "PAID" | "FAILED") { return prisma.$transaction(async (tx) => { await tx.paymentAttempt.update({ where: { id: attemptId }, data: { status: outcome, reconcileLeaseUntil: null } }); await tx.order.update({ where: { id: orderId }, data: { status: outcome === "PAID" ? "PAID" : "PAYMENT_FAILED" } }); if (outcome === "PAID") await tx.stockReservation.updateMany({ where: { orderId, status: "ACTIVE" }, data: { status: "CONSUMED" } }); else { const reservations = await tx.stockReservation.findMany({ where: { orderId, status: "ACTIVE" } }); for (const reservation of reservations) await tx.productVariant.update({ where: { id: reservation.variantId }, data: { stock: { increment: reservation.quantity } } }); await tx.stockReservation.updateMany({ where: { orderId, status: "ACTIVE" }, data: { status: "RELEASED" } }); } }, serializable); }
function pickIdentity(input: WebhookReceiptInput) { return { provider: input.provider, applicationId: input.applicationId, topic: input.topic, notificationId: input.notificationId }; }
export function reconciliationBackoff(count: number) { return Math.min(RECONCILIATION_POLICY.maximumBackoffMs, RECONCILIATION_POLICY.initialBackoffMs * 2 ** Math.min(count, 6)); }
function boundedBackoff(count: number) { return reconciliationBackoff(count); }
function isUnique(error: unknown) { return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002"; }
function isSerializableConflict(error: unknown) { return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2034"; }
async function retrySerializable<T>(work: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try { return await work(); }
    catch (error) { lastError = error; if (!isUnique(error) && !isSerializableConflict(error)) throw error; }
  }
  throw lastError;
}
