import { describe, expect, it, vi } from "vitest";

import { createMercadoPagoOrdersGateway } from "./mercado-pago-orders-gateway";
import { reconcileProviderOrder, submitPayment } from "./service";
import { loadPaymentConfig } from "./config";
import { MercadoPagoProviderError } from "./mercado-pago-orders-gateway";

const config = loadPaymentConfig({ PAYMENTS_ENABLED: "true", MERCADO_PAGO_ACCESS_TOKEN: "secret", PAYMENT_METHOD_IDS: "visa" });
const card = { cardToken: "card-token", paymentMethodId: "visa", paymentType: "credit_card" as const, installments: 1 };
const input = { orderId: "11111111-1111-4111-8111-111111111111", intentId: "22222222-2222-4222-8222-222222222222", intentToken: "intent", card, total: 18000, currency: "ARS" as const, payerEmail: "buyer@example.com" };

function repository() {
  const attempts = new Map<string, { id: string; orderId: string; intentId: string; idempotencyKey: string; payloadHash: string; status: "CREATED" | "DISPATCHING" | "PENDING" | "PAID" | "FAILED" }>();
  const reservations = new Map<string, "ACTIVE" | "CONSUMED" | "RELEASED">();
  const events: string[] = [];
  let uniqueConflictOnce = false;
  return {
    attempts, reservations, events,
    conflictOnce() { uniqueConflictOnce = true; },
    async findAttempt(orderId: string, intentId: string) { return attempts.get(`${orderId}:${intentId}`) ?? null; },
    async createAttempt(attempt: { orderId: string; intentId: string; idempotencyKey: string; payloadHash: string }) {
      const key = `${attempt.orderId}:${attempt.intentId}`;
      if (uniqueConflictOnce) { uniqueConflictOnce = false; attempts.set(key, { id: "winner", ...attempt, status: "DISPATCHING" }); reservations.set("winner", "ACTIVE"); throw new Error("UNIQUE_ATTEMPT_CONFLICT"); }
      if (attempts.has(key)) throw new Error("UNIQUE_ATTEMPT_CONFLICT");
      const created = { id: "attempt-1", ...attempt, status: "CREATED" as const }; attempts.set(key, created); reservations.set(created.id, "ACTIVE"); return created;
    },
    async claimDispatch(attemptId: string) { const attempt = [...attempts.values()].find((candidate) => candidate.id === attemptId); if (!attempt || attempt.status !== "CREATED") return null; attempt.status = "DISPATCHING"; return attempt; },
    async markPending(attemptId: string) { const attempt = byId(attempts, attemptId); attempt.status = "PENDING"; events.push("retain"); },
    async settleProviderEvidence(input: { attemptId: string; evidence: ReturnType<typeof pendingEvidence>; outcome: "PENDING" | "PAID" | "FAILED" }) {
      const attempt = byId(attempts, input.attemptId);
      attempt.status = input.outcome;
      reservations.set(input.attemptId, input.outcome === "PAID" ? "CONSUMED" : input.outcome === "FAILED" ? "RELEASED" : "ACTIVE");
      events.push(`evidence:${input.evidence.id}:${input.outcome}`);
    },
    async markPaidAndConsume(attemptId: string) { const attempt = byId(attempts, attemptId); if (reservations.get(attemptId) === "RELEASED") throw new Error("RESERVATION_ALREADY_RELEASED"); attempt.status = "PAID"; reservations.set(attemptId, "CONSUMED"); events.push("consume"); },
    async markFailedAndRelease(attemptId: string) { const attempt = byId(attempts, attemptId); if (reservations.get(attemptId) !== "ACTIVE") return; attempt.status = "FAILED"; reservations.set(attemptId, "RELEASED"); events.push("release"); },
  };
}

describe("payment service", () => {
  it("rejects changed payload replay and handles concurrent unique-create conflict without a second dispatch", async () => {
    const repo = repository(); const createOrder = vi.fn().mockResolvedValue(pendingEvidence());
    await submitPayment({ config, repository: repo, gateway: { createOrder }, input });
    await expect(submitPayment({ config, repository: repo, gateway: { createOrder }, input: { ...input, total: 19000 } })).resolves.toMatchObject({ kind: "failed_terminal", nextAction: "contact_support" });
    const raced = repository(); raced.conflictOnce();
    await expect(Promise.all([submitPayment({ config, repository: raced, gateway: { createOrder }, input }), submitPayment({ config, repository: raced, gateway: { createOrder }, input })])).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ kind: "pending" })]));
    expect(createOrder).toHaveBeenCalledTimes(1);
  });

  it("retains timeout/crash reservations, releases terminal failure once, and never pays a released attempt", async () => {
    const timeoutRepo = repository(); const timeout = vi.fn().mockRejectedValue(new Error("timeout"));
    await submitPayment({ config, repository: timeoutRepo, gateway: { createOrder: timeout }, input });
    await submitPayment({ config, repository: timeoutRepo, gateway: { createOrder: timeout }, input });
    expect(timeoutRepo.events).toEqual(["retain"]); expect(timeout).toHaveBeenCalledTimes(1);
    const failedRepo = repository(); const rejected = vi.fn().mockResolvedValue({ ...pendingEvidence(), status: "rejected", statusDetail: "cc_rejected" });
    await submitPayment({ config, repository: failedRepo, gateway: { createOrder: rejected }, input });
    await submitPayment({ config, repository: failedRepo, gateway: { createOrder: rejected }, input });
    expect(failedRepo.events).toEqual(["evidence:MP-1:FAILED"]); expect(failedRepo.reservations.get("attempt-1")).toBe("RELEASED");
  });

  it("sends automatic immediate capture and maps payment-level provider evidence", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "MP-3", external_reference: input.orderId, status: "processed", status_detail: "accredited", last_updated_date: "2026-08-04T10:00:00.000Z", transactions: { payments: [{ id: "pay-1", status: "processed", status_detail: "accredited" }] } }), { status: 201 }));
    const gateway = createMercadoPagoOrdersGateway({ accessToken: "secret", fetch }); const result = await gateway.createOrder({ idempotencyKey: "33333333-3333-4333-8333-333333333333", externalReference: input.orderId, total: input.total, currency: input.currency, payerEmail: input.payerEmail, card: { ...card, issuerId: "issuer-ignored" } });
    expect(result.payment).toMatchObject({ status: "processed", statusDetail: "accredited" });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ processing_mode: "automatic", capture_mode: "automatic" });
    expect(JSON.parse(fetch.mock.calls[0][1].body).transactions.payments[0].payment_method).not.toHaveProperty("issuer_id");
  });
});

function byId(attempts: Map<string, { id: string; status: "CREATED" | "DISPATCHING" | "PENDING" | "PAID" | "FAILED" }>, id: string) { const attempt = [...attempts.values()].find((candidate) => candidate.id === id); if (!attempt) throw new Error("MISSING_ATTEMPT"); return attempt; }
function pendingEvidence() { return { id: "MP-1", externalReference: input.orderId, status: "in_process", statusDetail: "pending", updatedAt: "2026-08-04T10:00:00.000Z", payment: { id: "pay-1", status: "in_process", statusDetail: "pending" } }; }

describe("Mercado Pago order lookup boundary", () => {
  it.each([401, 403, 429, 500])("keeps documented GET failure %i outside the transaction", async (status) => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status }));
    const gateway = createMercadoPagoOrdersGateway({ accessToken: "secret", fetch });
    const repository = { applyProviderEvidence: vi.fn(), markReconcilePending: vi.fn() };
    await reconcileProviderOrder({ repository, gateway, attempt: { id: "attempt", orderId: "local-order", providerOrderId: "mp-order" } });
    expect(repository.applyProviderEvidence).not.toHaveBeenCalled();
    expect(repository.markReconcilePending).toHaveBeenCalledWith("attempt", status === 401 || status === 403 ? "PROVIDER_CONFIGURATION_ALERT" : "PROVIDER_LOOKUP_RETRYABLE");
  });

  it("preserves a bounded diagnostic for non-JSON provider errors", async () => {
    const gateway = createMercadoPagoOrdersGateway({ accessToken: "secret", fetch: vi.fn().mockResolvedValue(new Response("upstream unavailable", { status: 502 })) });
    await expect(gateway.createOrder({ idempotencyKey: "33333333-3333-4333-8333-333333333333", externalReference: input.orderId, total: input.total, currency: input.currency, payerEmail: input.payerEmail, card })).rejects.toMatchObject({ failure: { status: 502, category: "provider" } });
  });

  it("releases the reservation when sandbox rejects the payer email before creating an order", async () => {
    const repo = repository();
    const rejected = vi.fn().mockRejectedValue(new MercadoPagoProviderError({ status: 400, category: "validation", correlationId: "mpf_1234abcd5678ef90" }));
    const result = await submitPayment({ config, repository: repo, gateway: { createOrder: rejected }, input });
    expect(result).toMatchObject({ kind: "failed_terminal", nextAction: "none", error: { providerStatus: 400 } });
    expect(repo.events).toEqual(["release"]);
  });

  it("maps a future HTTPS provider challenge to action_required without consuming the reservation", async () => {
    const repo = repository();
    const challenge = { url: "https://3ds.example.test/challenge", expiresAt: new Date(Date.now() + 60_000).toISOString() };
    const result = await submitPayment({ config, repository: repo, gateway: { createOrder: vi.fn().mockResolvedValue({ ...pendingEvidence(), challenge }) }, input });
    expect(result).toEqual({ kind: "action_required", attemptId: "attempt-1", nextAction: "complete_3ds", challenge });
    expect(repo.events).toEqual(["evidence:MP-1:PENDING"]);
  });

  it("does not expose an unsafe or expired provider challenge", async () => {
    const repo = repository();
    const result = await submitPayment({ config, repository: repo, gateway: { createOrder: vi.fn().mockResolvedValue({ ...pendingEvidence(), challenge: { url: "http://3ds.example.test/challenge", expiresAt: "2020-01-01T00:00:00.000Z" } }) }, input });
    expect(result).toMatchObject({ kind: "pending", nextAction: "retry_same_intent" });
    expect(repo.events).toEqual(["evidence:MP-1:PENDING"]);
  });

  it("keeps a GET timeout pending without entering the evidence transition", async () => {
    const repository = { applyProviderEvidence: vi.fn(), markReconcilePending: vi.fn() };
    await reconcileProviderOrder({ repository, gateway: { getOrder: vi.fn().mockRejectedValue(new Error("timeout")) }, attempt: { id: "attempt", orderId: "local-order", providerOrderId: "mp-order" } });
    expect(repository.applyProviderEvidence).not.toHaveBeenCalled();
    expect(repository.markReconcilePending).toHaveBeenCalledWith("attempt", "PROVIDER_LOOKUP_RETRYABLE");
  });
  it("keeps 404 and malformed GET evidence pending", async () => {
    const missingGateway = createMercadoPagoOrdersGateway({ accessToken: "secret", fetch: vi.fn().mockResolvedValue(new Response("{}", { status: 404 })) });
    const malformedGateway = createMercadoPagoOrdersGateway({ accessToken: "secret", fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "mp-order" }), { status: 200 })) });
    for (const gateway of [missingGateway, malformedGateway]) {
      const repository = { applyProviderEvidence: vi.fn(), markReconcilePending: vi.fn() };
      await reconcileProviderOrder({ repository, gateway, attempt: { id: "attempt", orderId: "local-order", providerOrderId: "mp-order" } });
      expect(repository.applyProviderEvidence).not.toHaveBeenCalled();
      expect(repository.markReconcilePending).toHaveBeenCalledWith("attempt", expect.any(String));
    }
  });

  it("persists the provider order identity before returning an immediately paid result", async () => {
    const repo = repository();
    const evidence = { ...pendingEvidence(), id: "MP-paid-order", status: "processed", statusDetail: "accredited", payment: { id: "pay-paid", status: "processed", statusDetail: "accredited" } };

    await expect(submitPayment({ config, repository: repo, gateway: { createOrder: vi.fn().mockResolvedValue(evidence) }, input })).resolves.toMatchObject({ kind: "paid" });

    expect(repo.events).toEqual(["evidence:MP-paid-order:PAID"]);
  });
});
