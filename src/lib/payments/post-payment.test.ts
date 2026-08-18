import { describe, expect, it, vi } from "vitest";
import { executePostPaymentOperation, getPostPaymentProviderFailure } from "./post-payment";
import { createMercadoPagoOrdersGateway } from "./mercado-pago-orders-gateway";

function repo(status: "PAID" | "PAYMENT_PENDING" = "PAID") {
  const operation = new Map<string, { idempotencyKey: string; status: "RUNNING" | "COMPLETED" }>();
  return {
    operation,
    async getOrderForOperation() { return { status, providerOrderId: "mp-order" }; },
    async findOperation(orderId: string, type: string) { return operation.get(`${orderId}:${type}`) ?? null; },
    async createOperation(input: { orderId: string; operation: "cancel" | "refund"; idempotencyKey: string }) { const value = { idempotencyKey: input.idempotencyKey, status: "RUNNING" as const }; operation.set(`${input.orderId}:${input.operation}`, value); return value; },
    async completeOperation(orderId: string, type: "cancel" | "refund") { const found = operation.get(`${orderId}:${type}`); if (found) found.status = "COMPLETED"; },
  };
}

describe("post-payment operations", () => {
  it("uses Orders API cancel and refund paths with idempotency", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "mp-order", status: "cancelled" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "mp-order", status: "refunded" }), { status: 201 }));
    const gateway = createMercadoPagoOrdersGateway({ accessToken: "secret", fetch });
    await gateway.cancelOrder("mp-order", "cancel-key");
    await gateway.refundOrder("mp-order", "refund-key");
    expect(fetch.mock.calls[0][0]).toContain("/v1/orders/mp-order/cancel");
    expect(fetch.mock.calls[1][0]).toContain("/v1/orders/mp-order/refund");
    expect(fetch.mock.calls[0][1].headers["X-Idempotency-Key"]).toBe("cancel-key");
    expect(fetch.mock.calls[1][1].headers["X-Idempotency-Key"]).toBe("refund-key");
  });
  it("uses the documented cancel endpoint and stable idempotency key", async () => {
    const repository = repo("PAYMENT_PENDING"); const cancelOrder = vi.fn().mockResolvedValue({ id: "mp-order", status: "cancelled" });
    await executePostPaymentOperation({ repository, gateway: { cancelOrder, refundOrder: vi.fn() }, orderId: "order-1", operation: "cancel" });
    expect(cancelOrder).toHaveBeenCalledWith("mp-order", expect.any(String));
    await expect(executePostPaymentOperation({ repository, gateway: { cancelOrder, refundOrder: vi.fn() }, orderId: "order-1", operation: "cancel" })).rejects.toThrow("ALREADY_COMPLETED");
  });
  it("only refunds paid orders", async () => {
    const repository = repo("PAYMENT_PENDING");
    await expect(executePostPaymentOperation({ repository, gateway: { cancelOrder: vi.fn(), refundOrder: vi.fn() }, orderId: "order-1", operation: "refund" })).rejects.toThrow("NOT_REFUNDABLE");
  });

  it("reports a completed ledger before rejecting the order lifecycle", async () => {
    const repository = repo("PAID");
    repository.operation.set("order-1:cancel", { idempotencyKey: "completed-key", status: "COMPLETED" });
    const cancelOrder = vi.fn();

    await expect(executePostPaymentOperation({ repository, gateway: { cancelOrder, refundOrder: vi.fn() }, orderId: "order-1", operation: "cancel" }))
      .rejects.toThrow("POST_PAYMENT_OPERATION_ALREADY_COMPLETED");

    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it("normalizes an accepted terminal provider status before completing the ledger", async () => {
    const repository = repo("PAYMENT_PENDING");
    const cancelOrder = vi.fn().mockResolvedValue({ id: "mp-order", status: " CANCELED " });

    const result = await executePostPaymentOperation({ repository, gateway: { cancelOrder, refundOrder: vi.fn() }, orderId: "order-1", operation: "cancel" });

    expect(result.provider.status).toBe("canceled");
    expect(repository.operation.get("order-1:cancel")?.status).toBe("COMPLETED");
  });

  it("preserves only typed safe provider failure metadata and keeps the ledger running", async () => {
    const repository = repo("PAID");
    const gateway = createMercadoPagoOrdersGateway({
      accessToken: "provider-secret",
      fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({
        message: "sensitive provider message",
        request_id: "provider-request-id",
      }), { status: 422 })),
    });

    const error = await executePostPaymentOperation({ repository, gateway, orderId: "order-1", operation: "refund" })
      .then(() => undefined, (caught: unknown) => caught);
    const failure = getPostPaymentProviderFailure(error);

    expect(error).toMatchObject({ code: "POST_PAYMENT_PROVIDER_FAILED" });
    expect(failure).toMatchObject({ status: 422, category: "validation" });
    expect(failure?.correlationId).toMatch(/^mpf_[a-f0-9]{16}$/);
    expect(JSON.stringify(failure)).not.toContain("sensitive provider message");
    expect(JSON.stringify(failure)).not.toContain("provider-request-id");
    expect(repository.operation.get("order-1:refund")?.status).toBe("RUNNING");
  });

  it("keeps the ledger running when the provider result is not terminal", async () => {
    const repository = repo("PAID");

    await expect(executePostPaymentOperation({
      repository,
      gateway: { cancelOrder: vi.fn(), refundOrder: vi.fn().mockResolvedValue({ id: "mp-order", status: "approved" }) },
      orderId: "order-1",
      operation: "refund",
    })).rejects.toThrow("POST_PAYMENT_PROVIDER_FAILED");

    expect(repository.operation.get("order-1:refund")?.status).toBe("RUNNING");
  });

  it("reuses the persisted idempotency key after losing the operation-create race", async () => {
    const persistedKey = "winner-persisted-key";
    const findOperation = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ idempotencyKey: persistedKey, status: "RUNNING" });
    const createOperation = vi.fn().mockRejectedValue(new Error("UNIQUE_OPERATION_CONFLICT"));
    const refundOrder = vi.fn().mockResolvedValue({ id: "mp-order", status: "refunded" });
    const repository = {
      getOrderForOperation: vi.fn().mockResolvedValue({ status: "PAID", providerOrderId: "mp-order" }),
      findOperation,
      createOperation,
      completeOperation: vi.fn(),
    };

    await executePostPaymentOperation({ repository, gateway: { cancelOrder: vi.fn(), refundOrder }, orderId: "order-1", operation: "refund" });

    expect(findOperation).toHaveBeenCalledTimes(2);
    expect(refundOrder).toHaveBeenCalledWith("mp-order", persistedKey);
  });
});
