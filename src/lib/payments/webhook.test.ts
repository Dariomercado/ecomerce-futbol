import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reconcileProviderOrder } from "./service";
import { createMercadoPagoWebhookSignature, sha256RawWebhookBody, verifyMercadoPagoWebhookSignature } from "./webhook";

const claimWebhookReceipt = vi.fn();
const completeReceiptAndApplyEvidence = vi.fn();
const findFirst = vi.fn();
const update = vi.fn();
const loadPaymentConfig = vi.fn();
const createMercadoPagoOrdersGateway = vi.fn();
vi.mock("@/lib/checkout/order-repository", () => ({ claimWebhookReceipt, completeReceiptAndApplyEvidence }));
vi.mock("@/lib/prisma", () => ({ prisma: { paymentAttempt: { findFirst }, webhookReceipt: { update } } }));
vi.mock("@/lib/payments/config", () => ({ loadPaymentConfig }));
vi.mock("@/lib/payments/mercado-pago-orders-gateway", () => ({ createMercadoPagoOrdersGateway }));

const evidence = { id: "mp-order", externalReference: "local-order", status: "in_process", statusDetail: "pending", updatedAt: "2026-08-05T10:00:00.000Z", payment: { id: "mp-payment", status: "in_process", statusDetail: "pending" } };

describe("provider reconciliation", () => {
  it("performs provider lookup before the database evidence transition", async () => {
    const events: string[] = [];
    const repository = { applyProviderEvidence: vi.fn(async () => { events.push("transaction"); }), markReconcilePending: vi.fn() };
    const gateway = { getOrder: vi.fn(async () => { events.push("lookup"); return evidence; }) };
    await reconcileProviderOrder({ repository, gateway, attempt: { id: "attempt", orderId: "local-order", providerOrderId: "mp-order" } });
    expect(events).toEqual(["lookup", "transaction"]);
  });

  it.each([undefined, { ...evidence, externalReference: "another-order" }, { ...evidence, payment: null }])("keeps missing, mismatched, or invalid evidence pending", async (providerEvidence) => {
    const repository = { applyProviderEvidence: vi.fn(), markReconcilePending: vi.fn() };
    await reconcileProviderOrder({ repository, gateway: { getOrder: vi.fn(async () => providerEvidence) as never }, attempt: { id: "attempt", orderId: "local-order", providerOrderId: "mp-order" } });
    expect(repository.applyProviderEvidence).not.toHaveBeenCalled();
    expect(repository.markReconcilePending).toHaveBeenCalledWith("attempt", expect.any(String));
  });
});

describe("Mercado Pago webhook signature", () => {
  const secret = "webhook-secret";
  const dataId = "ORD01ABC";
  const requestId = "request-123";
  const timestamp = "1742505638683";

  it("validates the documented data-id HMAC manifest without changing case", () => {
    const xSignature = createMercadoPagoWebhookSignature({ secret, dataId, requestId, timestamp });
    expect(verifyMercadoPagoWebhookSignature({ secret, dataId, requestId, xSignature })).toBe(true);
    expect(verifyMercadoPagoWebhookSignature({ secret, dataId: dataId.toLowerCase(), requestId, xSignature })).toBe(false);
  });

  it("rejects malformed or tampered signature inputs", () => {
    const xSignature = createMercadoPagoWebhookSignature({ secret, dataId, requestId, timestamp });
    expect(verifyMercadoPagoWebhookSignature({ secret, dataId, requestId, xSignature: xSignature.replace("v1=", "v1=0") })).toBe(false);
    expect(verifyMercadoPagoWebhookSignature({ secret, dataId, xSignature })).toBe(false);
  });
});

describe("Mercado Pago webhook route", () => {
  const secret = "webhook-secret";
  const notification = { id: "notification-1", application_id: "app-1", type: "order", action: "order.updated", live_mode: false, date_created: "2026-08-12T00:00:00.000Z", data: { id: "ORD01ABC" } };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = secret;
    claimWebhookReceipt.mockResolvedValueOnce({ claimed: true, receipt: { id: "receipt-1" } }).mockResolvedValueOnce({ claimed: false, receipt: { id: "receipt-1", state: "PROCESSED" } });
    loadPaymentConfig.mockReturnValue({ accessToken: "server-secret" });
    createMercadoPagoOrdersGateway.mockReturnValue({ getOrder: vi.fn().mockResolvedValue({ id: "ORD01ABC", externalReference: "local-order", status: "in_process", statusDetail: "pending", updatedAt: "2026-08-12T00:00:00.000Z", payment: { id: "payment-1", status: "in_process", statusDetail: "pending" } }) });
    findFirst.mockResolvedValue({ id: "attempt-1", orderId: "local-order" });
  });

  afterEach(() => {
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  });

  it("acknowledges one signed receipt and acknowledges its durable duplicate", async () => {
    const { POST } = await import("@/app/api/webhooks/mercado-pago/route");
    const request = () => {
      const requestId = "request-123";
      const xSignature = createMercadoPagoWebhookSignature({ secret, dataId: "ORD01ABC", requestId, timestamp: "1742505638683" });
      return new Request("http://localhost/api/webhooks/mercado-pago?data.id=ORD01ABC", { method: "POST", headers: { "content-type": "application/json", "x-request-id": requestId, "x-signature": xSignature }, body: JSON.stringify(notification) });
    };

    const first = await POST(request());
    const duplicate = await POST(request());

    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(200);
    expect(claimWebhookReceipt).toHaveBeenCalledTimes(2);
    expect(createMercadoPagoOrdersGateway).toHaveBeenCalledWith({ accessToken: "server-secret" });
    expect(completeReceiptAndApplyEvidence).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ receiptId: "receipt-1", attemptId: "attempt-1", orderId: "local-order" }));
    expect(claimWebhookReceipt).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ provider: "mercado_pago", applicationId: "app-1", topic: "order", notificationId: "notification-1", resourceId: "ORD01ABC", rawBodySha256: expect.stringMatching(/^[a-f0-9]{64}$/) }));
  });

  it("keeps a duplicate with a processing lease retryable until the worker can be recovered", async () => {
    claimWebhookReceipt.mockReset();
    claimWebhookReceipt.mockResolvedValue({ claimed: false, receipt: { id: "receipt-1", state: "PROCESSING", leaseUntil: new Date("2026-08-12T00:05:00.000Z") } });
    const { POST } = await import("@/app/api/webhooks/mercado-pago/route");
    const requestId = "request-123";
    const xSignature = createMercadoPagoWebhookSignature({ secret, dataId: "ORD01ABC", requestId, timestamp: "1742505638683" });

    const response = await POST(new Request("http://localhost/api/webhooks/mercado-pago?data.id=ORD01ABC", { method: "POST", headers: { "x-request-id": requestId, "x-signature": xSignature }, body: JSON.stringify(notification) }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "WEBHOOK_RETRY" });
    expect(createMercadoPagoOrdersGateway).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
    expect(completeReceiptAndApplyEvidence).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("processes a signed sandbox-shaped notification without a top-level id and deduplicates its derived receipt", async () => {
    const { POST } = await import("@/app/api/webhooks/mercado-pago/route");
    const sandboxNotification = {
      application_id: "app-1",
      type: "order",
      data: { id: "ORD01ABC" },
    };
    const body = JSON.stringify(sandboxNotification);
    const notificationId = `derived:v1:${sha256RawWebhookBody(body)}`;
    const request = () => {
      const requestId = "request-123";
      const xSignature = createMercadoPagoWebhookSignature({ secret, dataId: "ORD01ABC", requestId, timestamp: "1742505638683" });
      return new Request("http://localhost/api/webhooks/mercado-pago?data.id=ORD01ABC", { method: "POST", headers: { "content-type": "application/json", "x-request-id": requestId, "x-signature": xSignature }, body });
    };

    const first = await POST(request());
    const duplicate = await POST(request());

    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ received: true });
    expect(duplicate.status).toBe(200);
    expect(claimWebhookReceipt).toHaveBeenCalledTimes(2);
    expect(claimWebhookReceipt).toHaveBeenNthCalledWith(1, expect.anything(), expect.objectContaining({
      provider: "mercado_pago",
      applicationId: "app-1",
      topic: "order",
      notificationId,
      resourceId: "ORD01ABC",
    }));
    expect(completeReceiptAndApplyEvidence).toHaveBeenCalledTimes(1);
    expect(createMercadoPagoOrdersGateway).toHaveBeenCalledTimes(1);
  });

  it("rejects an unsigned or query/body-mismatched receipt before persistence", async () => {
    const { POST } = await import("@/app/api/webhooks/mercado-pago/route");
    const unsigned = await POST(new Request("http://localhost/api/webhooks/mercado-pago?data.id=ORD01ABC", { method: "POST", body: JSON.stringify(notification) }));
    const requestId = "request-123";
    const xSignature = createMercadoPagoWebhookSignature({ secret, dataId: "OTHER", requestId, timestamp: "1742505638683" });
    const mismatch = await POST(new Request("http://localhost/api/webhooks/mercado-pago?data.id=OTHER", { method: "POST", headers: { "x-request-id": requestId, "x-signature": xSignature }, body: JSON.stringify(notification) }));

    expect(unsigned.status).toBe(401);
    expect(mismatch.status).toBe(400);
    expect(claimWebhookReceipt).not.toHaveBeenCalled();
  });


  it("keeps a claimed receipt retryable when authoritative lookup fails", async () => {
    createMercadoPagoOrdersGateway.mockReturnValue({ getOrder: vi.fn().mockRejectedValue(new Error("timeout")) });
    const { POST } = await import("@/app/api/webhooks/mercado-pago/route");
    const requestId = "request-123";
    const xSignature = createMercadoPagoWebhookSignature({ secret, dataId: "ORD01ABC", requestId, timestamp: "1742505638683" });

    const response = await POST(new Request("http://localhost/api/webhooks/mercado-pago?data.id=ORD01ABC", { method: "POST", headers: { "x-request-id": requestId, "x-signature": xSignature }, body: JSON.stringify(notification) }));

    expect(response.status).toBe(503);
    expect(update).toHaveBeenCalledWith({ where: { id: "receipt-1" }, data: expect.objectContaining({ state: "RETRYABLE_FAILED" }) });
  });
});
