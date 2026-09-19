import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createPrismaPostPaymentRepository,
  loadPaymentConfig,
  createMercadoPagoOrdersGateway,
  executePostPaymentOperation,
  getPostPaymentErrorCode,
  getPostPaymentProviderFailure,
  requireAdmin,
  requireAdminRequestIntegrity,
  createPrismaAdminAuditRepository,
  appendAudit,
} = vi.hoisted(() => ({
  createPrismaPostPaymentRepository: vi.fn(),
  loadPaymentConfig: vi.fn(),
  createMercadoPagoOrdersGateway: vi.fn(),
  executePostPaymentOperation: vi.fn(),
  getPostPaymentErrorCode: vi.fn(),
  getPostPaymentProviderFailure: vi.fn(),
  requireAdmin: vi.fn(),
  requireAdminRequestIntegrity: vi.fn(),
  createPrismaAdminAuditRepository: vi.fn(),
  appendAudit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/checkout/order-repository", () => ({ createPrismaPostPaymentRepository }));
vi.mock("@/lib/payments/config", () => ({ loadPaymentConfig }));
vi.mock("@/lib/payments/mercado-pago-orders-gateway", () => ({ createMercadoPagoOrdersGateway }));
vi.mock("@/lib/payments/post-payment", () => ({
  executePostPaymentOperation,
  getPostPaymentErrorCode,
  getPostPaymentProviderFailure,
}));
vi.mock("@/lib/auth/admin-authorization", () => ({ requireAdmin }));
vi.mock("@/lib/auth/request-integrity", () => ({ requireAdminRequestIntegrity }));
vi.mock("@/lib/admin/audit-repository", () => ({ createPrismaAdminAuditRepository }));

const actor = {
  membershipId: "11111111-1111-4111-8111-111111111111",
  actorSupabaseUserId: "22222222-2222-4222-8222-222222222222",
};
const params = Promise.resolve({ orderId: "order-1" });

function authorizeOperator() {
  requireAdmin.mockResolvedValue({ authorized: true, user: { id: actor.actorSupabaseUserId }, membership: { id: actor.membershipId } });
}

function configurePayment() {
  loadPaymentConfig.mockReturnValue({ accessToken: "provider-secret" });
  createPrismaPostPaymentRepository.mockReturnValue({ repository: "post-payment" });
  createMercadoPagoOrdersGateway.mockReturnValue({ gateway: "mercado-pago" });
}

describe("POST /api/internal/orders/[orderId]/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminRequestIntegrity.mockReturnValue({ valid: true });
    authorizeOperator();
    createPrismaAdminAuditRepository.mockReturnValue({ append: appendAudit });
    appendAudit.mockResolvedValue(undefined);
    getPostPaymentErrorCode.mockImplementation((error) => error instanceof Error ? error.message : "POST_PAYMENT_PROVIDER_FAILED");
    getPostPaymentProviderFailure.mockReturnValue(undefined);
  });

  it("rejects invalid request integrity before identity, audit, or payment collaborators", async () => {
    requireAdminRequestIntegrity.mockReturnValue({ valid: false, status: 403, code: "ADMIN_ORIGIN_INVALID" });
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost", { method: "POST" }), { params });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ code: "ADMIN_ORIGIN_INVALID" });
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(createPrismaAdminAuditRepository).not.toHaveBeenCalled();
    expect(loadPaymentConfig).not.toHaveBeenCalled();
    expect(executePostPaymentOperation).not.toHaveBeenCalled();
  });

  it("rejects the retired human Bearer token when no operator session exists", async () => {
    requireAdmin.mockResolvedValue({ authorized: false, status: 401, code: "ADMIN_SESSION_REQUIRED" });
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer temporary-server-secret" },
    }), { params });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ code: "ADMIN_SESSION_REQUIRED" });
    expect(createPrismaAdminAuditRepository).not.toHaveBeenCalled();
    expect(loadPaymentConfig).not.toHaveBeenCalled();
    expect(executePostPaymentOperation).not.toHaveBeenCalled();
  });

  it("denies a revoked or unavailable operator before payment work", async () => {
    const { POST } = await import("./route");

    for (const authorization of [
      { authorized: false as const, status: 403 as const, code: "ADMIN_ACCESS_DENIED" as const },
      { authorized: false as const, status: 503 as const, code: "ADMIN_AUTH_UNAVAILABLE" as const },
    ]) {
      requireAdmin.mockResolvedValueOnce(authorization);
      const response = await POST(new Request("http://localhost", { method: "POST" }), { params });
      expect(response.status).toBe(authorization.status);
      await expect(response.json()).resolves.toEqual({ code: authorization.code });
    }

    expect(createPrismaAdminAuditRepository).not.toHaveBeenCalled();
    expect(loadPaymentConfig).not.toHaveBeenCalled();
    expect(executePostPaymentOperation).not.toHaveBeenCalled();
  });

  it("executes a valid cancellation and appends attempted then successful audits", async () => {
    configurePayment();
    executePostPaymentOperation.mockResolvedValue({ operation: "cancel", status: "completed", provider: { id: "provider-order", status: "cancelled" } });
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost", { method: "POST" }), { params });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ operation: "cancel", status: "completed", provider: { id: "provider-order", status: "cancelled" } });
    expect(executePostPaymentOperation).toHaveBeenCalledWith({
      repository: { repository: "post-payment" },
      gateway: { gateway: "mercado-pago" },
      orderId: "order-1",
      operation: "cancel",
    });
    expect(appendAudit).toHaveBeenNthCalledWith(1, {
      ...actor,
      action: "ORDER_CANCEL",
      entityType: "Order",
      entityId: "order-1",
      outcome: "ATTEMPTED",
      context: { stage: "before_domain_evaluation" },
    });
    expect(appendAudit).toHaveBeenNthCalledWith(2, {
      ...actor,
      action: "ORDER_CANCEL",
      entityType: "Order",
      entityId: "order-1",
      outcome: "SUCCEEDED",
      context: { stage: "after_domain_evaluation" },
    });
  });

  it("records a terminal failure after domain evaluation", async () => {
    configurePayment();
    executePostPaymentOperation.mockRejectedValue(new Error("ORDER_NOT_CANCELLABLE"));
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost", { method: "POST" }), { params });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ code: "ORDER_NOT_CANCELLABLE" });
    expect(appendAudit).toHaveBeenNthCalledWith(2, {
      ...actor,
      action: "ORDER_CANCEL",
      entityType: "Order",
      entityId: "order-1",
      outcome: "FAILED",
      context: { code: "ORDER_NOT_CANCELLABLE" },
    });
  });

  it("does not report a completed cancellation when the terminal audit fails", async () => {
    configurePayment();
    executePostPaymentOperation.mockResolvedValue({ operation: "cancel", status: "completed", provider: { id: "provider-order", status: "cancelled" } });
    appendAudit.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("audit unavailable"));
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost", { method: "POST" }), { params });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ code: "ADMIN_AUDIT_UNAVAILABLE" });
    expect(executePostPaymentOperation).toHaveBeenCalledOnce();
  });
});
