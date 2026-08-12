import { describe, expect, it } from "vitest";

import { loadPaymentConfig } from "./config";
import { applyAuthoritativeProviderState, isAllowedCardRail, redactedPaymentLog, terminalResult } from "./state-machine";

describe("payment state machine", () => {
  it("rejects disabled payments and unsupported rails before dispatch", () => {
    expect(isAllowedCardRail(loadPaymentConfig({ PAYMENTS_ENABLED: "false" }), { paymentMethodId: "visa", paymentType: "credit_card" })).toBe(false);
    const enabled = loadPaymentConfig({ PAYMENTS_ENABLED: "true", MERCADO_PAGO_ACCESS_TOKEN: "secret", PAYMENT_METHOD_IDS: "visa" });
    expect(isAllowedCardRail(enabled, { paymentMethodId: "visa", paymentType: "credit_card" })).toBe(true);
    expect(isAllowedCardRail(enabled, { paymentMethodId: "pix", paymentType: "account_money" })).toBe(false);
  });

  it("redacts secrets, card tokens, and provider details from payment logs", () => {
    expect(redactedPaymentLog({ accessToken: "secret", cardToken: "token", providerMessage: "declined", allowed: "value" })).toEqual({ accessToken: "[REDACTED]", cardToken: "[REDACTED]", providerMessage: "[REDACTED]", allowed: "value" });
  });

  it("redacts raw card aliases recursively without hiding ordinary business numbers", () => {
    expect(redactedPaymentLog({ pan: "4111111111111111", cvv: "123", cvc: "999", security_code: "321", nested: { items: [{ Cvv: "456" }, { securityCode: "654" }], orderNumber: 42 } })).toEqual({ pan: "[REDACTED]", cvv: "[REDACTED]", cvc: "[REDACTED]", security_code: "[REDACTED]", nested: { items: [{ Cvv: "[REDACTED]" }, { securityCode: "[REDACTED]" }], orderNumber: 42 } });
  });

  it("keeps terminal result next action correlated with its safe error", () => {
    expect(terminalResult("attempt-1", "none")).toMatchObject({ nextAction: "none", error: { nextAction: "none" } });
    expect(terminalResult("attempt-2", "contact_support")).toMatchObject({ nextAction: "contact_support", error: { nextAction: "contact_support" } });
  });

  it("requires newer processed/accredited evidence on both order and payment paths to pay", () => {
    const pending = { status: "PENDING" as const, providerUpdatedAt: "2026-08-04T10:00:00.000Z" };
    expect(applyAuthoritativeProviderState(pending, evidence("2026-08-04T10:01:00.000Z", "processed", "accredited", "in_process", "pending")).state.status).toBe("PENDING");
    expect(applyAuthoritativeProviderState(pending, evidence("2026-08-04T10:01:00.000Z", "processed", "accredited", "processed", "accredited")).state.status).toBe("PAID");
  });

  it("keeps terminal failure absorbing and escalates equal-time conflicts to lookup and alert", () => {
    const failed = { status: "FAILED" as const, providerUpdatedAt: "2026-08-04T10:01:00.000Z", orderStatus: "rejected", paymentStatus: "rejected" };
    expect(applyAuthoritativeProviderState(failed, evidence("2026-08-04T10:02:00.000Z", "processed", "accredited", "processed", "accredited")).state).toEqual(failed);
    const equalConflict = applyAuthoritativeProviderState({ status: "PENDING" as const, providerUpdatedAt: "2026-08-04T10:01:00.000Z", orderStatus: "in_process", paymentStatus: "pending" }, evidence("2026-08-04T10:01:00.000Z", "processed", "accredited", "processed", "accredited"));
    expect(equalConflict).toMatchObject({ action: "lookup_and_alert", alert: "EQUAL_TIMESTAMP_CONFLICT" });
  });
});

function evidence(updatedAt: string, status: string, statusDetail: string, paymentStatus: string, paymentStatusDetail: string) {
  return { id: "order-1", status, statusDetail, updatedAt, payment: { id: "payment-1", status: paymentStatus, statusDetail: paymentStatusDetail } };
}
