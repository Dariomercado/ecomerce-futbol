import { createHash, randomUUID } from "node:crypto";
import type { CardToken, PaymentResult, ProviderOrderEvidence } from "./contracts";
import type { PaymentConfig } from "./config";
import type { MercadoPagoOrdersGateway, MercadoPagoProviderError } from "./mercado-pago-orders-gateway";
import { isAccredited, isAllowedCardRail, terminalResult } from "./state-machine";

type AttemptStatus = "CREATED" | "DISPATCHING" | "PENDING" | "PAID" | "FAILED";
export type PaymentAttempt = { id: string; orderId: string; intentId: string; idempotencyKey: string; payloadHash: string; status: AttemptStatus };
export type PaymentRepository = { findAttempt(orderId: string, intentId: string): Promise<PaymentAttempt | null>; createAttempt(input: Pick<PaymentAttempt, "orderId" | "intentId" | "idempotencyKey" | "payloadHash">): Promise<PaymentAttempt>; claimDispatch(attemptId: string): Promise<PaymentAttempt | null>; markPending(attemptId: string): Promise<void>; settleProviderEvidence(input: { attemptId: string; evidence: ProviderOrderEvidence; outcome: "PENDING" | "PAID" | "FAILED" }): Promise<void>; markFailedAndRelease(attemptId: string): Promise<void> };
export type PaymentSubmission = { orderId: string; intentId: string; intentToken: string; card: CardToken; total: number; currency: "ARS"; payerEmail: string };
export async function submitPayment({ config, repository, gateway, input }: { config: PaymentConfig; repository: PaymentRepository; gateway: Pick<MercadoPagoOrdersGateway, "createOrder">; input: PaymentSubmission }): Promise<PaymentResult> { if (!isUuid(input.intentId)) return invalid(); if (!config.enabled) return { kind: "failed_terminal", attemptId: "", nextAction: "none", error: { code: "PAYMENTS_DISABLED", nextAction: "none", message: "Payment could not be completed." } }; if (!isAllowedCardRail(config, input.card)) return { kind: "failed_terminal", attemptId: "", nextAction: "none", error: { code: "UNSUPPORTED_PAYMENT_METHOD", nextAction: "none", message: "Payment could not be completed." } }; const payloadHash = fingerprint(input); const existing = await repository.findAttempt(input.orderId, input.intentId); if (existing) return replayResult(existing, payloadHash); let attempt: PaymentAttempt; try { attempt = await repository.createAttempt({ orderId: input.orderId, intentId: input.intentId, idempotencyKey: randomUUID(), payloadHash }); } catch (error) { if (!(error instanceof Error) || error.message !== "UNIQUE_ATTEMPT_CONFLICT") throw error; const winner = await repository.findAttempt(input.orderId, input.intentId); if (!winner) throw error; return replayResult(winner, payloadHash); } const claimed = await repository.claimDispatch(attempt.id); if (!claimed) return replayResult(attempt, payloadHash); try { const evidence = await gateway.createOrder({ idempotencyKey: claimed.idempotencyKey, externalReference: input.orderId, total: input.total, currency: input.currency, payerEmail: input.payerEmail, card: input.card }); return settleAttempt(repository, claimed.id, evidence); } catch (error) { if (isTerminalProviderError(error)) { await repository.markFailedAndRelease(claimed.id); const providerError = isTerminalProviderError(error) ? error : undefined; return { kind: "failed_terminal", attemptId: claimed.id, nextAction: "none", error: { code: "PAYMENT_DECLINED", nextAction: "none", message: "Payment could not be completed.", ...(providerError ? { providerStatus: providerError.failure.status } : {}) } }; } await repository.markPending(claimed.id); return { kind: "pending", attemptId: claimed.id, nextAction: "retry_same_intent" }; } }

type ReconciliationRepository = { applyProviderEvidence(input: { attemptId: string; orderId: string; evidence: ProviderOrderEvidence }): Promise<void>; markReconcilePending(attemptId: string, errorCode: string): Promise<void> };
export async function reconcileProviderOrder({ repository, gateway, attempt }: { repository: ReconciliationRepository; gateway: Pick<MercadoPagoOrdersGateway, "getOrder">; attempt: { id: string; orderId: string; providerOrderId: string | null } }) { if (!attempt.providerOrderId) return repository.markReconcilePending(attempt.id, "PROVIDER_ORDER_ID_MISSING"); let evidence: ProviderOrderEvidence | undefined; try { evidence = await gateway.getOrder(attempt.providerOrderId); } catch (error) { return repository.markReconcilePending(attempt.id, lookupFailureCode(error)); } if (!isValidEvidence(evidence) || evidence.externalReference !== attempt.orderId) return repository.markReconcilePending(attempt.id, "PROVIDER_EVIDENCE_UNSAFE"); await repository.applyProviderEvidence({ attemptId: attempt.id, orderId: attempt.orderId, evidence }); }

async function settleAttempt(repository: PaymentRepository, attemptId: string, evidence: ProviderOrderEvidence): Promise<PaymentResult> {
  if (isAccredited(evidence)) {
    await repository.settleProviderEvidence({ attemptId, evidence, outcome: "PAID" });
    return { kind: "paid", attemptId, nextAction: "none" };
  }
  if (isUsableChallenge(evidence.challenge)) {
    await repository.settleProviderEvidence({ attemptId, evidence, outcome: "PENDING" });
    return { kind: "action_required", attemptId, nextAction: "complete_3ds", challenge: evidence.challenge };
  }
  if (["rejected", "cancelled", "failed"].includes(evidence.status) || ["rejected", "cancelled", "failed"].includes(evidence.payment.status)) {
    await repository.settleProviderEvidence({ attemptId, evidence, outcome: "FAILED" });
    return terminalResult(attemptId, "none");
  }
  await repository.settleProviderEvidence({ attemptId, evidence, outcome: "PENDING" });
  return { kind: "pending", attemptId, nextAction: "retry_same_intent" };
}
function isUsableChallenge(challenge: ProviderOrderEvidence["challenge"]): challenge is { url: string; expiresAt: string } {
  if (!challenge || !/^https:\/\//i.test(challenge.url)) return false;
  const expiresAt = Date.parse(challenge.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
function isValidEvidence(evidence: ProviderOrderEvidence | undefined): evidence is ProviderOrderEvidence { return Boolean(evidence && evidence.id && evidence.externalReference && evidence.status && evidence.statusDetail && evidence.updatedAt && evidence.payment?.id && evidence.payment.status && evidence.payment.statusDetail); }
function isTerminalProviderError(error: unknown): error is MercadoPagoProviderError {
  return isMercadoPagoProviderError(error) && [400, 401, 403, 409].includes(error.failure.status);
}
function lookupFailureCode(error: unknown) {
  if (isMercadoPagoProviderError(error) && ["authentication", "authorization"].includes(error.failure.category)) {
    return "PROVIDER_CONFIGURATION_ALERT";
  }
  return "PROVIDER_LOOKUP_RETRYABLE";
}
function isMercadoPagoProviderError(error: unknown): error is MercadoPagoProviderError {
  if (!(error instanceof Error) || error.name !== "MercadoPagoProviderError") return false;
  const failure = (error as { failure?: unknown }).failure;
  return Boolean(failure && typeof failure === "object" && typeof (failure as { status?: unknown }).status === "number"
    && typeof (failure as { category?: unknown }).category === "string"
    && typeof (failure as { correlationId?: unknown }).correlationId === "string");
}
function replayResult(attempt: PaymentAttempt, payloadHash: string): PaymentResult { if (attempt.payloadHash !== payloadHash) return terminalResult(attempt.id, "contact_support"); if (attempt.status === "PAID") return { kind: "paid", attemptId: attempt.id, nextAction: "none" }; if (attempt.status === "FAILED") return terminalResult(attempt.id, "none"); return { kind: "pending", attemptId: attempt.id, nextAction: "retry_same_intent" }; }
function invalid(): PaymentResult { return { kind: "failed_terminal", attemptId: "", nextAction: "none", error: { code: "INVALID_PAYMENT_INTENT", nextAction: "none", message: "Payment could not be completed." } }; }
function isUuid(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
function fingerprint(input: PaymentSubmission): string { return createHash("sha256").update(JSON.stringify({ intentToken: input.intentToken, card: input.card, total: input.total, currency: input.currency, payerEmail: input.payerEmail })).digest("hex"); }
