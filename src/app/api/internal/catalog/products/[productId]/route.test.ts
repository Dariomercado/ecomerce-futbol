import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdmin,
  requireAdminRequestIntegrity,
  updateProduct,
  archiveProduct,
  getAdminCatalogErrorCode,
  getAdminCatalogErrorStatus,
} = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requireAdminRequestIntegrity: vi.fn(),
  updateProduct: vi.fn(),
  archiveProduct: vi.fn(),
  getAdminCatalogErrorCode: vi.fn(),
  getAdminCatalogErrorStatus: vi.fn(),
}));

vi.mock("@/lib/auth/admin-authorization", () => ({ requireAdmin }));
vi.mock("@/lib/auth/request-integrity", () => ({ requireAdminRequestIntegrity }));
vi.mock("@/lib/catalog/admin-product-service", () => ({
  adminCatalogService: { updateProduct, archiveProduct },
  getAdminCatalogErrorCode,
  getAdminCatalogErrorStatus,
}));

const actor = {
  membershipId: "11111111-1111-4111-8111-111111111111",
  actorSupabaseUserId: "22222222-2222-4222-8222-222222222222",
};
const productId = "33333333-3333-4333-8333-333333333333";
const params = Promise.resolve({ productId });

function authorizedOperator() {
  requireAdmin.mockResolvedValue({ authorized: true, membership: { id: actor.membershipId }, user: { id: actor.actorSupabaseUserId } });
}

describe("internal admin catalog product mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminRequestIntegrity.mockReturnValue({ valid: true });
    authorizedOperator();
    getAdminCatalogErrorCode.mockReturnValue("ADMIN_CATALOG_UNAVAILABLE");
    getAdminCatalogErrorStatus.mockReturnValue(503);
  });

  it("uses the integrity and active-membership boundary for updates", async () => {
    requireAdminRequestIntegrity.mockReturnValue({ valid: false, status: 403, code: "ADMIN_ORIGIN_INVALID" });
    const { PATCH } = await import("./route");

    const response = await PATCH(new Request("http://localhost", { method: "PATCH" }), { params });

    expect(response.status).toBe(403);
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("updates the full aggregate atomically and preserves audit failure as a non-success", async () => {
    updateProduct.mockResolvedValue({ id: productId, slug: "control-fg-verde" });
    const { PATCH } = await import("./route");
    const input = { name: "Control FG Verde", price: 120000, variants: [], images: [] };

    const response = await PATCH(new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }), { params });

    expect(response.status).toBe(200);
    expect(updateProduct).toHaveBeenCalledWith({ actor, productId, input });

    updateProduct.mockRejectedValueOnce(new Error("ADMIN_AUDIT_UNAVAILABLE"));
    getAdminCatalogErrorCode.mockReturnValueOnce("ADMIN_AUDIT_UNAVAILABLE");
    getAdminCatalogErrorStatus.mockReturnValueOnce(503);
    const auditFailure = await PATCH(new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }), { params });
    expect(auditFailure.status).toBe(503);
    await expect(auditFailure.json()).resolves.toEqual({ code: "ADMIN_AUDIT_UNAVAILABLE" });
  });

  it("archives without deletion and returns not found or conflict safely", async () => {
    archiveProduct.mockResolvedValue({ id: productId, status: "archived", isActive: false });
    const { POST } = await import("./archive/route");

    const response = await POST(new Request("http://localhost", { method: "POST" }), { params });
    expect(response.status).toBe(200);
    expect(archiveProduct).toHaveBeenCalledWith({ actor, productId });
    await expect(response.json()).resolves.toMatchObject({ status: "archived", isActive: false });

    for (const [code, status] of [["CATALOG_PRODUCT_NOT_FOUND", 404], ["CATALOG_ARCHIVE_CONFLICT", 409]] as const) {
      archiveProduct.mockRejectedValueOnce(new Error(code));
      getAdminCatalogErrorCode.mockReturnValueOnce(code);
      getAdminCatalogErrorStatus.mockReturnValueOnce(status);
      const errorResponse = await POST(new Request("http://localhost", { method: "POST" }), { params });
      expect(errorResponse.status).toBe(status);
      await expect(errorResponse.json()).resolves.toEqual({ code });
    }
  });
});
