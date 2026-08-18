import { beforeEach, describe, expect, it, vi } from "vitest";
import { executePostPaymentOperation } from "@/lib/payments/post-payment";

const { createPrismaPostPaymentRepository, loadPaymentConfig, createMercadoPagoOrdersGateway } = vi.hoisted(() => ({
  createPrismaPostPaymentRepository: vi.fn(),
  loadPaymentConfig: vi.fn(),
  createMercadoPagoOrdersGateway: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/checkout/order-repository", () => ({ createPrismaPostPaymentRepository }));
vi.mock("@/lib/payments/config", () => ({ loadPaymentConfig }));
vi.mock("@/lib/payments/mercado-pago-orders-gateway", () => ({ createMercadoPagoOrdersGateway }));
vi.mock("@/lib/payments/post-payment", { spy: true });

describe("POST /api/internal/orders/[orderId]/cancel", () => {
  const params = Promise.resolve({ orderId: "order-1" });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POST_PAYMENT_ADMIN_TOKEN = "temporary-server-secret";
  });

  it.each([
    [undefined, 401, "ADMIN_AUTH_REQUIRED"],
    ["Bearer wrong-token", 403, "ADMIN_AUTH_INVALID"],
  ])("rejects %s before constructing payment collaborators", async (authorization, status, code) => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { headers: authorization ? { authorization } : undefined }), { params });

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ code });
    expect(loadPaymentConfig).not.toHaveBeenCalled();
    expect(createPrismaPostPaymentRepository).not.toHaveBeenCalled();
    expect(createMercadoPagoOrdersGateway).not.toHaveBeenCalled();
    expect(executePostPaymentOperation).not.toHaveBeenCalled();
  });

  it("returns 503 without creating collaborators when the token is unset", async () => {
    delete process.env.POST_PAYMENT_ADMIN_TOKEN;
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { headers: { authorization: "Bearer any-token" } }), { params });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ code: "POST_PAYMENT_UNAVAILABLE" });
    expect(loadPaymentConfig).not.toHaveBeenCalled();
    expect(executePostPaymentOperation).not.toHaveBeenCalled();
  });

  it("uses no request body and returns the stable success contract", async () => {
    loadPaymentConfig.mockReturnValue({ accessToken: "provider-secret" });
    const repository = {
      getOrderForOperation: vi.fn().mockResolvedValue({ status: "PAYMENT_PENDING", providerOrderId: "provider-order" }),
      findOperation: vi.fn().mockResolvedValue(null),
      createOperation: vi.fn().mockResolvedValue({ idempotencyKey: "cancel-key", status: "RUNNING" }),
      completeOperation: vi.fn(),
    };
    const gateway = {
      cancelOrder: vi.fn().mockResolvedValue({ id: "provider-order", status: "cancelled" }),
      refundOrder: vi.fn(),
    };
    createPrismaPostPaymentRepository.mockReturnValue(repository);
    createMercadoPagoOrdersGateway.mockReturnValue(gateway);
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST", headers: { authorization: "Bearer temporary-server-secret" } }), { params });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ operation: "cancel", status: "completed", provider: { id: "provider-order", status: "cancelled" } });
    expect(executePostPaymentOperation).toHaveBeenCalledWith({ repository, gateway, orderId: "order-1", operation: "cancel" });
  });

  it("returns 422 for a fresh cancellation of a paid order without calling the provider", async () => {
    loadPaymentConfig.mockReturnValue({ accessToken: "provider-secret" });
    const repository = {
      getOrderForOperation: vi.fn().mockResolvedValue({ status: "PAID", providerOrderId: "provider-order" }),
      findOperation: vi.fn().mockResolvedValue(null),
      createOperation: vi.fn(),
      completeOperation: vi.fn(),
    };
    const gateway = { cancelOrder: vi.fn(), refundOrder: vi.fn() };
    createPrismaPostPaymentRepository.mockReturnValue(repository);
    createMercadoPagoOrdersGateway.mockReturnValue(gateway);
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost", { method: "POST", headers: { authorization: "Bearer temporary-server-secret" } }), { params });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ code: "ORDER_NOT_CANCELLABLE" });
    expect(repository.createOperation).not.toHaveBeenCalled();
    expect(gateway.cancelOrder).not.toHaveBeenCalled();
    expect(gateway.refundOrder).not.toHaveBeenCalled();
  });
});
