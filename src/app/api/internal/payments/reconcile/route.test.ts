import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const leaseDuePaymentAttempts = vi.fn();
const createPrismaPaymentRepository = vi.fn();
const loadPaymentConfig = vi.fn();
const createMercadoPagoOrdersGateway = vi.fn();
const reconcileProviderOrder = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/checkout/order-repository", () => ({ leaseDuePaymentAttempts, createPrismaPaymentRepository }));
vi.mock("@/lib/payments/config", () => ({ loadPaymentConfig }));
vi.mock("@/lib/payments/mercado-pago-orders-gateway", () => ({ createMercadoPagoOrdersGateway }));
vi.mock("@/lib/payments/service", () => ({ reconcileProviderOrder }));

describe("internal payment reconciliation route", () => {
  const reconciliationSecret = "reconciliation-scheduler-secret";
  const originalReconciliationSecret = process.env.RECONCILIATION_CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RECONCILIATION_CRON_SECRET = reconciliationSecret;
  });

  afterEach(() => {
    if (originalReconciliationSecret === undefined) delete process.env.RECONCILIATION_CRON_SECRET;
    else process.env.RECONCILIATION_CRON_SECRET = originalReconciliationSecret;
  });

  it("fails closed when the reconciliation scheduler secret is not configured before provider or database work", async () => {
    delete process.env.RECONCILIATION_CRON_SECRET;

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/internal/payments/reconcile", { headers: { authorization: "Bearer any-token" } }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ code: "RECONCILIATION_AUTH_UNAVAILABLE" });
    expect(loadPaymentConfig).not.toHaveBeenCalled();
    expect(leaseDuePaymentAttempts).not.toHaveBeenCalled();
    expect(createPrismaPaymentRepository).not.toHaveBeenCalled();
    expect(createMercadoPagoOrdersGateway).not.toHaveBeenCalled();
  });

  it("rejects missing and malformed scheduler credentials before provider or database work", async () => {
    const { POST } = await import("./route");

    for (const headers of [new Headers(), new Headers({ authorization: "Basic reconciliation-scheduler-secret" })]) {
      const response = await POST(new Request("http://localhost/api/internal/payments/reconcile", { headers }));
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ code: "RECONCILIATION_AUTH_REQUIRED" });
    }

    expect(loadPaymentConfig).not.toHaveBeenCalled();
    expect(leaseDuePaymentAttempts).not.toHaveBeenCalled();
    expect(createPrismaPaymentRepository).not.toHaveBeenCalled();
    expect(createMercadoPagoOrdersGateway).not.toHaveBeenCalled();
  });

  it("rejects an invalid scheduler credential before provider or database work", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/internal/payments/reconcile", { headers: { authorization: "Bearer wrong-token" } }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ code: "RECONCILIATION_AUTH_INVALID" });
    expect(loadPaymentConfig).not.toHaveBeenCalled();
    expect(leaseDuePaymentAttempts).not.toHaveBeenCalled();
    expect(createPrismaPaymentRepository).not.toHaveBeenCalled();
    expect(createMercadoPagoOrdersGateway).not.toHaveBeenCalled();
  });

  it("leases one bounded page and reconciles each leased attempt through the provider lookup flow for an authorized scheduler", async () => {
    const repository = { applyProviderEvidence: vi.fn(), markReconcilePending: vi.fn() };
    const gateway = { getOrder: vi.fn() };
    const attempts = [
      { id: "attempt-1", orderId: "order-1", providerOrderId: "provider-1" },
      { id: "attempt-2", orderId: "order-2", providerOrderId: "provider-2" },
    ];
    loadPaymentConfig.mockReturnValue({ accessToken: "server-secret" });
    leaseDuePaymentAttempts.mockResolvedValue(attempts);
    createPrismaPaymentRepository.mockReturnValue(repository);
    createMercadoPagoOrdersGateway.mockReturnValue(gateway);

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/internal/payments/reconcile", { headers: { authorization: `Bearer ${reconciliationSecret}` } }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ reconciled: 2 });
    expect(leaseDuePaymentAttempts).toHaveBeenCalledWith(expect.anything(), expect.any(Date), 25, 300_000);
    expect(createMercadoPagoOrdersGateway).toHaveBeenCalledWith({ accessToken: "server-secret" });
    expect(reconcileProviderOrder).toHaveBeenCalledTimes(2);
    expect(reconcileProviderOrder).toHaveBeenNthCalledWith(1, { repository, gateway, attempt: attempts[0] });
    expect(reconcileProviderOrder).toHaveBeenNthCalledWith(2, { repository, gateway, attempt: attempts[1] });
  });

  it("continues reconciling later leased attempts after an unexpected attempt failure without counting the failed attempt", async () => {
    const repository = { applyProviderEvidence: vi.fn(), markReconcilePending: vi.fn() };
    const gateway = { getOrder: vi.fn() };
    const attempts = [
      { id: "attempt-1", orderId: "order-1", providerOrderId: "provider-1" },
      { id: "attempt-2", orderId: "order-2", providerOrderId: "provider-2" },
      { id: "attempt-3", orderId: "order-3", providerOrderId: "provider-3" },
    ];
    loadPaymentConfig.mockReturnValue({ accessToken: "server-secret" });
    leaseDuePaymentAttempts.mockResolvedValue(attempts);
    createPrismaPaymentRepository.mockReturnValue(repository);
    createMercadoPagoOrdersGateway.mockReturnValue(gateway);
    reconcileProviderOrder
      .mockRejectedValueOnce(new Error("unexpected persistence failure"))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/internal/payments/reconcile", { headers: { authorization: `Bearer ${reconciliationSecret}` } }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ reconciled: 2 });
    expect(reconcileProviderOrder).toHaveBeenCalledTimes(3);
    expect(reconcileProviderOrder).toHaveBeenNthCalledWith(1, { repository, gateway, attempt: attempts[0] });
    expect(reconcileProviderOrder).toHaveBeenNthCalledWith(2, { repository, gateway, attempt: attempts[1] });
    expect(reconcileProviderOrder).toHaveBeenNthCalledWith(3, { repository, gateway, attempt: attempts[2] });
  });

  it("does not lease attempts when the server-only provider configuration is unavailable", async () => {
    loadPaymentConfig.mockReturnValue({ accessToken: undefined });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/internal/payments/reconcile", { headers: { authorization: `Bearer ${reconciliationSecret}` } }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ code: "RECONCILIATION_UNAVAILABLE" });
    expect(leaseDuePaymentAttempts).not.toHaveBeenCalled();
  });
});
