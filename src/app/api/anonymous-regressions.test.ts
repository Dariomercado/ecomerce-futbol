import { beforeEach, describe, expect, it, vi } from "vitest";

const findProducts = vi.fn();
const findUnique = vi.fn();
const createGuestOrder = vi.fn();
const reserveOrder = vi.fn();
const matchesStatusCapability = vi.fn();

vi.mock("@/lib/catalog/prisma-public-repository", () => ({
  publicCatalogRepository: { findProducts },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { order: { findUnique } } }));
vi.mock("@/lib/checkout/guest-order-service", () => ({ createGuestOrder }));
vi.mock("@/lib/checkout/order-repository", () => ({ reserveOrder }));
vi.mock("@/lib/checkout/contracts", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/checkout/contracts")>(),
  hashStatusCapability: (capability: string) => `hash:${capability}`,
  matchesStatusCapability,
}));

const orderId = "11111111-1111-4111-8111-111111111111";
const validInput = {
  contact: { email: "buyer@example.com", fullName: "Buyer", phone: "+5491100000000" },
  shippingAddress: { addressLine1: "Street 1", city: "Buenos Aires", province: "Buenos Aires", postalCode: "1000" },
  lines: [{ productId: orderId, variantId: null, quantity: 1 }],
};

describe("anonymous commerce regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findProducts.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false },
    });
    findUnique.mockResolvedValue({ id: orderId, status: "PENDING_CONFIRMATION", currency: "ARS", total: 18000, statusCapabilityHash: "stored-hash", updatedAt: new Date("2026-08-12T00:00:00.000Z") });
    matchesStatusCapability.mockReturnValue(true);
    createGuestOrder.mockResolvedValue({ order: { id: orderId } });
    reserveOrder.mockResolvedValue({
      id: orderId,
      status: "PENDING_CONFIRMATION",
      currency: "ARS",
      total: 18000,
      updatedAt: new Date("2026-08-12T00:00:00.000Z"),
    });
  });

  it("keeps public catalog reads available without an auth session", async () => {
    const { GET } = await import("@/app/api/catalog/products/route");

    const response = await GET(new Request("http://localhost/api/catalog/products"));

    expect(response.status).toBe(200);
    expect(findProducts).toHaveBeenCalledOnce();
  });

  it("keeps capability-protected order status available to anonymous guests", async () => {
    const { GET } = await import("@/app/api/checkout/orders/[orderId]/status/route");

    const response = await GET(new Request(`http://localhost/api/checkout/orders/${orderId}/status`, { headers: { "x-checkout-status-capability": "capability" } }), { params: Promise.resolve({ orderId }) });

    expect(response.status).toBe(200);
    expect(findUnique).toHaveBeenCalledOnce();
  });

  it("keeps guest checkout available without an auth session", async () => {
    const { POST } = await import("@/app/api/checkout/orders/route");

    const response = await POST(new Request("http://localhost/api/checkout/orders", { method: "POST", body: JSON.stringify(validInput) }));

    expect(response.status).toBe(201);
    expect(createGuestOrder).toHaveBeenCalledWith(validInput);
    expect(reserveOrder).toHaveBeenCalledOnce();
  });
});
