import { beforeEach, describe, expect, it, vi } from "vitest";

const createPrismaPostPaymentRepository = vi.fn();
const loadPaymentConfig = vi.fn();
const createMercadoPagoOrdersGateway = vi.fn();
const executePostPaymentOperation = vi.fn();
const getPostPaymentErrorCode = vi.fn();
const getPostPaymentProviderFailure = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/checkout/order-repository", () => ({ createPrismaPostPaymentRepository }));
vi.mock("@/lib/payments/config", () => ({ loadPaymentConfig }));
vi.mock("@/lib/payments/mercado-pago-orders-gateway", () => ({ createMercadoPagoOrdersGateway }));
vi.mock("@/lib/payments/post-payment", () => ({
  executePostPaymentOperation,
  getPostPaymentErrorCode,
  getPostPaymentProviderFailure,
}));

describe("POST /api/internal/orders/[orderId]/refund", () => {
  const params = Promise.resolve({ orderId: "order-1" });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POST_PAYMENT_ADMIN_TOKEN = "temporary-server-secret";
    getPostPaymentErrorCode.mockImplementation((error) => error instanceof Error ? error.message : "POST_PAYMENT_PROVIDER_FAILED");
    getPostPaymentProviderFailure.mockReturnValue(undefined);
  });

  it("rejects absent credentials before any payment work", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost"), { params });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ code: "ADMIN_AUTH_REQUIRED" });
    expect(loadPaymentConfig).not.toHaveBeenCalled();
    expect(executePostPaymentOperation).not.toHaveBeenCalled();
  });

  it("maps a redacted operation error contract", async () => {
    loadPaymentConfig.mockReturnValue({ accessToken: "provider-secret" });
    createPrismaPostPaymentRepository.mockReturnValue({});
    createMercadoPagoOrdersGateway.mockReturnValue({});
    executePostPaymentOperation.mockRejectedValue(new Error("ORDER_NOT_REFUNDABLE"));
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { headers: { authorization: "Bearer temporary-server-secret" } }), { params });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ code: "ORDER_NOT_REFUNDABLE" });
  });

  it("returns only the generic failure plus an opaque correlation code", async () => {
    loadPaymentConfig.mockReturnValue({ accessToken: "provider-secret" });
    createPrismaPostPaymentRepository.mockReturnValue({});
    createMercadoPagoOrdersGateway.mockReturnValue({});
    executePostPaymentOperation.mockRejectedValue(new Error("POST_PAYMENT_PROVIDER_FAILED"));
    getPostPaymentErrorCode.mockReturnValue("POST_PAYMENT_PROVIDER_FAILED");
    getPostPaymentProviderFailure.mockReturnValue({
      status: 422,
      category: "validation",
      correlationId: "mpf_1234abcd5678ef90",
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { headers: { authorization: "Bearer temporary-server-secret" } }), { params });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      code: "POST_PAYMENT_PROVIDER_FAILED",
      correlationId: "mpf_1234abcd5678ef90",
    });
    expect(errorSpy).toHaveBeenCalledWith("post_payment_provider_failure", {
      status: 422, category: "validation", correlationId: "mpf_1234abcd5678ef90",
    });
    errorSpy.mockRestore();
  });
});
