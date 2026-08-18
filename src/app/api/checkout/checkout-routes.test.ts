import { beforeEach, describe, expect, it, vi } from "vitest";

const createGuestOrder = vi.fn();
const reserveOrder = vi.fn();
const findUnique = vi.fn();
const hashStatusCapability = vi.fn((capability: string) => `hash:${capability}`);
const matchesStatusCapability = vi.fn();
const loadPaymentConfig = vi.fn();
const publicPaymentConfig = vi.fn();
const createPrismaPaymentRepository = vi.fn();
const createMercadoPagoOrdersGateway = vi.fn();
const submitPayment = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { order: { findUnique } },
}));
vi.mock("@/lib/checkout/guest-order-service", () => ({ createGuestOrder }));
vi.mock("@/lib/checkout/contracts", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/checkout/contracts")>(),
  hashStatusCapability,
  matchesStatusCapability,
}));
vi.mock("@/lib/payments/config", () => ({ loadPaymentConfig, publicPaymentConfig }));
vi.mock("@/lib/checkout/order-repository", () => ({ reserveOrder, createPrismaPaymentRepository }));
vi.mock("@/lib/payments/mercado-pago-orders-gateway", () => ({ createMercadoPagoOrdersGateway }));
vi.mock("@/lib/payments/service", () => ({ submitPayment }));

const validInput = {
  contact: { email: "buyer@example.com", fullName: "Buyer", phone: "+5491100000000" },
  shippingAddress: { addressLine1: "Street 1", city: "Buenos Aires", province: "Buenos Aires", postalCode: "1000" },
  lines: [{ productId: "11111111-1111-4111-8111-111111111111", variantId: null, quantity: 1 }],
};
const order = { id: "11111111-1111-4111-8111-111111111111", status: "PENDING_CONFIRMATION", currency: "ARS", total: 18000 };
const persistedOrder = {
  ...order,
  updatedAt: new Date("2026-08-12T00:00:00.000Z"),
  statusCapabilityHash: "stored-hash",
  contactEmail: "buyer@example.com",
  contactFullName: "Buyer",
  contactPhone: "+5491100000000",
  shippingAddressLine1: "Street 1",
  shippingCity: "Buenos Aires",
  shippingProvince: "Buenos Aires",
  shippingPostalCode: "1000",
  lines: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 1 }],
  reservations: [{ inventoryId: "reservation-1" }],
  paymentAttemptId: "payment-attempt-1",
};

describe("checkout API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    matchesStatusCapability.mockReturnValue(true);
  });

  it("returns only the public payment configuration", async () => {
    loadPaymentConfig.mockReturnValue({ enabled: true, accessToken: "server-secret", publicKey: "public-key" });
    publicPaymentConfig.mockReturnValue({ enabled: true, publicKey: "public-key" });
    const { GET } = await import("./config/route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ enabled: true, publicKey: "public-key" });
    expect(publicPaymentConfig).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "server-secret" }));
  });

  it("persists a created order with a hashed capability and returns the one-time capability", async () => {
    createGuestOrder.mockResolvedValue({ order: { id: order.id } });
    reserveOrder.mockResolvedValue(persistedOrder);
    const { POST } = await import("./orders/route");

    const response = await POST(new Request("http://localhost/api/checkout/orders", { method: "POST", body: JSON.stringify(validInput) }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      order: {
        id: order.id,
        status: "PENDING_CONFIRMATION",
        currency: "ARS",
        total: 18000,
        updatedAt: "2026-08-12T00:00:00.000Z",
      },
      statusCapability: expect.any(String),
    });
    expect(hashStatusCapability).toHaveBeenCalledWith(expect.any(String));
    expect(reserveOrder).toHaveBeenCalledWith(expect.anything(), { id: order.id }, expect.stringMatching(/^hash:/));
  });

  it("returns a minimal order status only when the matching capability is supplied", async () => {
    findUnique.mockResolvedValue({ ...order, statusCapabilityHash: "stored-hash", updatedAt: new Date("2026-08-12T00:00:00.000Z") });
    matchesStatusCapability.mockReturnValue(true);
    const { GET } = await import("./orders/[orderId]/status/route");

    const response = await GET(new Request(`http://localhost/api/checkout/orders/${order.id}/status`, { headers: { "x-checkout-status-capability": "capability" } }), { params: Promise.resolve({ orderId: order.id }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ order: { id: order.id, status: "PENDING_CONFIRMATION", currency: "ARS", total: 18000, updatedAt: "2026-08-12T00:00:00.000Z" } });
    expect(matchesStatusCapability).toHaveBeenCalledWith("capability", "stored-hash");
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: order.id } }));
  });

  it("does not reveal order state when the capability is missing or invalid", async () => {
    findUnique.mockResolvedValue({ ...order, statusCapabilityHash: "stored-hash", updatedAt: new Date() });
    matchesStatusCapability.mockReturnValue(false);
    const { GET } = await import("./orders/[orderId]/status/route");

    const response = await GET(new Request(`http://localhost/api/checkout/orders/${order.id}/status`), { params: Promise.resolve({ orderId: order.id }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ code: "ORDER_NOT_FOUND", message: "Order not found." });
  });

  it("rejects malformed order identifiers without querying persistence", async () => {
    const { GET } = await import("./orders/[orderId]/status/route");

    const response = await GET(new Request("http://localhost/api/checkout/orders/not-a-uuid/status", { headers: { "x-checkout-status-capability": "capability" } }), { params: Promise.resolve({ orderId: "not-a-uuid" }) });

    expect(response.status).toBe(404);
    expect(findUnique).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: "not-a-uuid" } }));
  });

  it("submits a tokenized card payment using the persisted order values", async () => {
    const repository = {};
    const gateway = {};
    const config = { enabled: true, accessToken: "server-secret", supportedMethodIds: new Set(["visa"]) };
    findUnique.mockResolvedValue({ id: order.id, status: "PENDING_CONFIRMATION", currency: "ARS", total: 18000, contactEmail: "buyer@example.com", statusCapabilityHash: "stored-hash" });
    loadPaymentConfig.mockReturnValue(config);
    createPrismaPaymentRepository.mockReturnValue(repository);
    createMercadoPagoOrdersGateway.mockReturnValue(gateway);
    submitPayment.mockResolvedValue({ kind: "pending", attemptId: "attempt-1", nextAction: "retry_same_intent" });
    const { POST } = await import("./orders/[orderId]/payment/route");

    const response = await POST(new Request(`http://localhost/api/checkout/orders/${order.id}/payment`, {
      method: "POST",
      body: JSON.stringify({ intentId: "22222222-2222-4222-8222-222222222222", intentToken: "intent", card: { cardToken: "card-token", paymentMethodId: "visa", paymentType: "credit_card", installments: 1 } }),
    }), { params: Promise.resolve({ orderId: order.id }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ kind: "pending", attemptId: "attempt-1", nextAction: "retry_same_intent" });
    expect(submitPayment).toHaveBeenCalledWith({
      config,
      repository,
      gateway,
      input: expect.objectContaining({ orderId: order.id, total: 18000, currency: "ARS", payerEmail: "buyer@example.com" }),
    });
  });

  it("rejects raw card data before loading or submitting an order", async () => {
    const { POST } = await import("./orders/[orderId]/payment/route");

    const response = await POST(new Request(`http://localhost/api/checkout/orders/${order.id}/payment`, {
      method: "POST",
      body: JSON.stringify({ intentId: "22222222-2222-4222-8222-222222222222", intentToken: "intent", card: { cardToken: "card-token", paymentMethodId: "visa", paymentType: "credit_card", installments: 1, number: "4111111111111111" } }),
    }), { params: Promise.resolve({ orderId: order.id }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ code: "INVALID_PAYMENT_INTENT", message: "Payment could not be completed." });
    expect(findUnique).not.toHaveBeenCalled();
    expect(submitPayment).not.toHaveBeenCalled();
  });

  it("rejects a payment intent that is not bound to the order capability", async () => {
    matchesStatusCapability.mockReturnValue(false);
    findUnique.mockResolvedValue({ id: order.id, status: "PENDING_CONFIRMATION", currency: "ARS", total: 18000, contactEmail: "buyer@example.com", statusCapabilityHash: "stored-hash" });
    const { POST } = await import("./orders/[orderId]/payment/route");

    const response = await POST(new Request(`http://localhost/api/checkout/orders/${order.id}/payment`, {
      method: "POST",
      body: JSON.stringify({ intentId: "22222222-2222-4222-8222-222222222222", intentToken: "forged-token", card: { cardToken: "card-token", paymentMethodId: "visa", paymentType: "credit_card", installments: 1 } }),
    }), { params: Promise.resolve({ orderId: order.id }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ code: "INVALID_PAYMENT_INTENT", message: "Payment could not be completed." });
    expect(submitPayment).not.toHaveBeenCalled();
  });

  it("rejects token-only submissions with missing intent/card fields", async () => {
    const { POST } = await import("./orders/[orderId]/payment/route");
    const response = await POST(new Request(`http://localhost/api/checkout/orders/${order.id}/payment`, {
      method: "POST",
      body: JSON.stringify({ intentId: "not-a-uuid", card: { cardToken: "", paymentMethodId: "visa" } }),
    }), { params: Promise.resolve({ orderId: order.id }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ code: "INVALID_PAYMENT_INTENT", message: "Payment could not be completed." });
    expect(findUnique).not.toHaveBeenCalled();
    expect(submitPayment).not.toHaveBeenCalled();
  });

  it("passes an action-required 3DS result through without browser-side payment authority", async () => {
    const repository = {};
    const gateway = {};
    const config = { enabled: true, accessToken: "server-secret", supportedMethodIds: new Set(["visa"]) };
    findUnique.mockResolvedValue({ id: order.id, status: "PENDING_CONFIRMATION", currency: "ARS", total: 18000, contactEmail: "buyer@example.com", statusCapabilityHash: "stored-hash" });
    loadPaymentConfig.mockReturnValue(config);
    createPrismaPaymentRepository.mockReturnValue(repository);
    createMercadoPagoOrdersGateway.mockReturnValue(gateway);
    submitPayment.mockResolvedValue({ kind: "action_required", attemptId: "attempt-2", nextAction: "complete_3ds", challenge: { url: "https://3ds.example.test/challenge", expiresAt: "2099-01-01T00:00:00.000Z" } });
    const { POST } = await import("./orders/[orderId]/payment/route");

    const response = await POST(new Request(`http://localhost/api/checkout/orders/${order.id}/payment`, {
      method: "POST",
      body: JSON.stringify({ intentId: "22222222-2222-4222-8222-222222222222", intentToken: "intent", card: { cardToken: "card-token", paymentMethodId: "visa", paymentType: "credit_card", installments: 1 } }),
    }), { params: Promise.resolve({ orderId: order.id }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ kind: "action_required", nextAction: "complete_3ds", challenge: { url: "https://3ds.example.test/challenge" } });
  });

  it("refuses payment submission for missing or non-payable orders", async () => {
    findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: order.id, status: "PAID", currency: "ARS", total: 18000, contactEmail: "buyer@example.com", statusCapabilityHash: "stored-hash" });
    const { POST } = await import("./orders/[orderId]/payment/route");
    const request = () => new Request(`http://localhost/api/checkout/orders/${order.id}/payment`, {
      method: "POST",
      body: JSON.stringify({ intentId: "22222222-2222-4222-8222-222222222222", intentToken: "intent", card: { cardToken: "card-token", paymentMethodId: "visa", paymentType: "credit_card", installments: 1 } }),
    });

    const missing = await POST(request(), { params: Promise.resolve({ orderId: order.id }) });
    const paid = await POST(request(), { params: Promise.resolve({ orderId: order.id }) });

    expect(missing.status).toBe(404);
    expect(paid.status).toBe(409);
    expect(submitPayment).not.toHaveBeenCalled();
  });
});
