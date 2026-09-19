import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdmin,
  requireAdminRequestIntegrity,
  listProducts,
  createProduct,
  getAdminCatalogErrorCode,
  getAdminCatalogErrorStatus,
} = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requireAdminRequestIntegrity: vi.fn(),
  listProducts: vi.fn(),
  createProduct: vi.fn(),
  getAdminCatalogErrorCode: vi.fn(),
  getAdminCatalogErrorStatus: vi.fn(),
}));

vi.mock("@/lib/auth/admin-authorization", () => ({ requireAdmin }));
vi.mock("@/lib/auth/request-integrity", () => ({ requireAdminRequestIntegrity }));
vi.mock("@/lib/catalog/admin-product-service", () => ({
  adminCatalogService: { listProducts, createProduct },
  getAdminCatalogErrorCode,
  getAdminCatalogErrorStatus,
}));

const actor = {
  membership: { id: "11111111-1111-4111-8111-111111111111" },
  user: { id: "22222222-2222-4222-8222-222222222222" },
};
const validProduct = {
  name: "Control FG Verde",
  slug: "control-fg-verde",
  description: "A durable football boot for firm ground.",
  categoryId: "33333333-3333-4333-8333-333333333333",
  brandId: "44444444-4444-4444-8444-444444444444",
  price: 112000,
  compareAtPrice: 132000,
  featured: true,
  status: "published",
  variants: [{ name: "Verde / 40 / FG", sku: "AC-FG-VER-40", stock: 4, isActive: true }],
  images: [{ url: "/catalog/products/control-fg-verde-1.png", alt: "Control FG Verde lateral view", position: 1, isPrimary: true, variantSku: "AC-FG-VER-40" }],
};

function authorizedOperator() {
  requireAdmin.mockResolvedValue({ authorized: true, ...actor });
}

describe("internal admin catalog products API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminRequestIntegrity.mockReturnValue({ valid: true });
    authorizedOperator();
    getAdminCatalogErrorCode.mockReturnValue("ADMIN_CATALOG_UNAVAILABLE");
    getAdminCatalogErrorStatus.mockReturnValue(503);
  });

  it("rejects invalid integrity before membership or catalog collaborators", async () => {
    requireAdminRequestIntegrity.mockReturnValue({ valid: false, status: 403, code: "ADMIN_CSRF_INVALID" });
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/internal/catalog/products", { method: "POST" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ code: "ADMIN_CSRF_INVALID" });
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("requires an active operator for admin reads and mutations", async () => {
    requireAdmin.mockResolvedValue({ authorized: false, status: 403, code: "ADMIN_ACCESS_DENIED" });
    const { GET, POST } = await import("./route");

    const [listResponse, createResponse] = await Promise.all([
      GET(new Request("http://localhost/api/internal/catalog/products?page=1&limit=50")),
      POST(new Request("http://localhost/api/internal/catalog/products", { method: "POST", body: JSON.stringify(validProduct) })),
    ]);

    expect(listResponse.status).toBe(403);
    expect(createResponse.status).toBe(403);
    expect(listProducts).not.toHaveBeenCalled();
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("lists at most fifty products and creates a valid aggregate using the authenticated actor", async () => {
    listProducts.mockResolvedValue({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } });
    createProduct.mockResolvedValue({ id: "product-1", ...validProduct });
    const { GET, POST } = await import("./route");

    const listResponse = await GET(new Request("http://localhost/api/internal/catalog/products?page=1&limit=51"));
    expect(listResponse.status).toBe(400);
    expect(listProducts).not.toHaveBeenCalled();

    const createResponse = await POST(new Request("http://localhost/api/internal/catalog/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validProduct),
    }));
    expect(createResponse.status).toBe(201);
    expect(createProduct).toHaveBeenCalledWith({
      actor: { membershipId: actor.membership.id, actorSupabaseUserId: actor.user.id },
      input: validProduct,
    });
  });

  it("maps validation, missing-reference, conflict, and audit failures to safe responses", async () => {
    const { POST } = await import("./route");
    const cases = [
      ["INVALID_ADMIN_PRODUCT", 400],
      ["CATALOG_REFERENCE_NOT_FOUND", 404],
      ["CATALOG_CONFLICT", 409],
      ["ADMIN_AUDIT_UNAVAILABLE", 503],
    ] as const;

    for (const [code, status] of cases) {
      createProduct.mockRejectedValueOnce(new Error(code));
      getAdminCatalogErrorCode.mockReturnValueOnce(code);
      getAdminCatalogErrorStatus.mockReturnValueOnce(status);
      const response = await POST(new Request("http://localhost/api/internal/catalog/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validProduct),
      }));
      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toEqual({ code });
    }
  });
});
