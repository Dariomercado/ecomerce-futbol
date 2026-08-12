import type { LocalPaymentState, PaymentResult, ProviderOrderEvidence } from "./contracts";
import type { PaymentConfig } from "./config";

export function isAllowedCardRail(config: PaymentConfig, card: { paymentMethodId: string; paymentType: string }): boolean {
  return config.enabled && (card.paymentType === "credit_card" || card.paymentType === "debit_card") && config.supportedMethodIds.has(card.paymentMethodId);
}

export function redactedPaymentLog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactedPaymentLog);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, isSensitiveLogKey(key) ? "[REDACTED]" : redactedPaymentLog(nested)]));
}

function isSensitiveLogKey(key: string): boolean {
  const normalized = key.replace(/[_\s-]/g, "").toLowerCase();
  return ["pan", "cvv", "cvc", "securitycode"].includes(normalized) || /token|secret|authorization|password|card|provider.*(?:message|detail)/i.test(key);
}

export function terminalResult(attemptId: string, nextAction: "none" | "contact_support"): PaymentResult {
  return nextAction === "none"
    ? { kind: "failed_terminal", attemptId, nextAction, error: { code: "PAYMENT_DECLINED", nextAction, message: "Payment could not be completed." } }
    : { kind: "failed_terminal", attemptId, nextAction, error: { code: "PAYMENT_REQUIRES_SUPPORT", nextAction, message: "Payment could not be completed." } };
}

export type StateTransition = { state: LocalPaymentState; action: "none" | "lookup_and_alert"; alert?: "EQUAL_TIMESTAMP_CONFLICT" };

export function applyAuthoritativeProviderState(current: LocalPaymentState, evidence: ProviderOrderEvidence): StateTransition {
  const currentTime = current.providerUpdatedAt ? Date.parse(current.providerUpdatedAt) : Number.NEGATIVE_INFINITY;
  const evidenceTime = Date.parse(evidence.updatedAt);
  if (!Number.isFinite(evidenceTime) || current.status === "PAID" || current.status === "FAILED" || evidenceTime < currentTime) return { state: current, action: "none" };
  const sameEvidence = current.orderStatus === evidence.status && current.paymentStatus === evidence.payment.status;
  if (evidenceTime === currentTime) return sameEvidence ? { state: current, action: "none" } : { state: current, action: "lookup_and_alert", alert: "EQUAL_TIMESTAMP_CONFLICT" };
  const state = { providerUpdatedAt: evidence.updatedAt, orderStatus: evidence.status, paymentStatus: evidence.payment.status };
  if (isAccredited(evidence)) return { state: { status: "PAID", ...state }, action: "none" };
  if (["rejected", "cancelled", "failed"].includes(evidence.status) || ["rejected", "cancelled", "failed"].includes(evidence.payment.status)) return { state: { status: "FAILED", ...state }, action: "none" };
  return { state: { status: "PENDING", ...state }, action: "none" };
}

export function isAccredited(evidence: ProviderOrderEvidence): boolean { return evidence.status === "processed" && evidence.statusDetail === "accredited" && evidence.payment.status === "processed" && evidence.payment.statusDetail === "accredited"; }
