import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdmin,
  requireAdminRequestIntegrity,
  updateProduct,
  archiveProduct,
  restoreProduct,
  getAdminCatalogErrorCode,
  getAdminCatalogErrorStatus,
  cleanupReplacedProductImages,
} = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requireAdminRequestIntegrity: vi.fn(),
  updateProduct: vi.fn(),
  archiveProduct: vi.fn(),
  restoreProduct: vi.fn(),
  getAdminCatalogErrorCode: vi.fn(),
  getAdminCatalogErrorStatus: vi.fn(),
  cleanupReplacedProductImages: vi.fn(),
}));

vi.mock("@/lib/auth/admin-authorization", () => ({ requireAdmin }));
vi.mock("@/lib/auth/request-integrity", () => ({ requireAdminRequestIntegrity }));
vi.mock("@/lib/catalog/admin-product-service", () => ({
  adminCatalogService: { updateProduct, archiveProduct, restoreProduct },
  getAdminCatalogErrorCode,
  getAdminCatalogErrorStatus,
}));
vi.mock("@/lib/catalog/product-image-storage-cleanup", () => ({ cleanupReplacedProductImages }));

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
    cleanupReplacedProductImages.mockResolvedValue({ status: "not_required" });
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
    updateProduct.mockResolvedValue({ id: productId, slug: "control-fg-verde", storagePathsToDelete: ["products/product-1/old.webp"] });
    cleanupReplacedProductImages.mockResolvedValue({ status: "completed" });
    const { PATCH } = await import("./route");
    const input = { name: "Control FG Verde", price: 120000, variants: [], images: [] };

    const response = await PATCH(new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }), { params });

    expect(response.status).toBe(200);
    expect(updateProduct).toHaveBeenCalledWith({ actor, productId, input });
    expect(cleanupReplacedProductImages).toHaveBeenCalledWith(["products/product-1/old.webp"]);

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
    expect(cleanupReplacedProductImages).toHaveBeenCalledTimes(1);
  });

  it("exposes a safe cleanup warning without failing a committed update", async () => {
    updateProduct.mockResolvedValue({ id: productId, slug: "control-fg-verde", storagePathsToDelete: ["products/product-1/old.webp"] });
    cleanupReplacedProductImages.mockResolvedValue({ status: "failed" });
    const { PATCH } = await import("./route");

    const response = await PATCH(new Request("http://localhost", {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Control FG Verde" }),
    }), { params });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: productId, slug: "control-fg-verde", storageCleanup: "failed" });
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

  it("restores archived products as drafts and keeps the integrity boundary", async () => {
    requireAdminRequestIntegrity.mockReturnValueOnce({ valid: false, status: 403, code: "ADMIN_CSRF_INVALID" });
    const { POST } = await import("./restore/route");
    const denied = await POST(new Request("http://localhost", { method: "POST" }), { params });
    expect(denied.status).toBe(403);
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(restoreProduct).not.toHaveBeenCalled();

    authorizedOperator();
    restoreProduct.mockResolvedValue({ id: productId, status: "draft", isActive: true, featured: false });

    const response = await POST(new Request("http://localhost", { method: "POST" }), { params });
    expect(response.status).toBe(200);
    expect(restoreProduct).toHaveBeenCalledWith({ actor, productId });
    await expect(response.json()).resolves.toMatchObject({ status: "draft", isActive: true, featured: false });

    for (const [code, status] of [["CATALOG_PRODUCT_NOT_FOUND", 404], ["CATALOG_RESTORE_CONFLICT", 409]] as const) {
      restoreProduct.mockRejectedValueOnce(new Error(code));
      getAdminCatalogErrorCode.mockReturnValueOnce(code);
      getAdminCatalogErrorStatus.mockReturnValueOnce(status);
      const errorResponse = await POST(new Request("http://localhost", { method: "POST" }), { params });
      expect(errorResponse.status).toBe(status);
      await expect(errorResponse.json()).resolves.toEqual({ code });
    }
  });
});
