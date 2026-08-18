import { beforeEach, describe, expect, it, vi } from "vitest";

const findProducts = vi.fn();
const findProductBySlug = vi.fn();
const findFeaturedProducts = vi.fn();
vi.mock("@/lib/catalog/prisma-public-repository", () => ({ publicCatalogRepository: { findProducts, findProductBySlug, findFeaturedProducts } }));

describe("public catalog API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns filtered list envelope and supports empty results", async () => {
    findProducts.mockResolvedValue({ data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false } });
    const { GET } = await import("@/app/api/catalog/products/route");
    const response = await GET(new Request("http://localhost/api/catalog/products?category=botines&brand=terreno&featured=false&minPrice=1&maxPrice=100000&sort=price-asc"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ data: [], pagination: { total: 0 } });
    expect(findProducts).toHaveBeenCalledWith(expect.objectContaining({ category: "botines", brand: "terreno", featured: false, minPrice: 1, maxPrice: 100000, sort: "price-asc" }));
  });

  it("rejects invalid and oversized limits with stable validation errors", async () => {
    const { GET } = await import("@/app/api/catalog/products/route");
    for (const value of ["0", "49", "abc"]) {
      const response = await GET(new Request(`http://localhost/api/catalog/products?limit=${value}`));
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({ code: "INVALID_CATALOG_QUERY", issues: [{ field: "limit" }] });
    }
    expect(findProducts).not.toHaveBeenCalled();
  });

  it("rejects public mutation attempts", async () => {
    const route = await import("@/app/api/catalog/products/route");
    const response = await (route as unknown as { POST?: (request: Request) => Promise<Response> }).POST?.(new Request("http://localhost/api/catalog/products", { method: "POST" }));
    expect(response?.status ?? 405).toBe(405);
  });

  it("hides archived details and returns active detail context", async () => {
    findProductBySlug.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "p1", slug: "active", activeVariants: [{ id: "v1" }], images: [{ position: 1, isPrimary: true }], category: { slug: "botines" }, brand: { slug: "terreno" } });
    const { GET } = await import("@/app/api/catalog/products/[slug]/route");
    const archived = await GET(new Request("http://localhost"), { params: Promise.resolve({ slug: "archived" }) });
    expect(archived.status).toBe(404);
    const active = await GET(new Request("http://localhost"), { params: Promise.resolve({ slug: "active" }) });
    expect(active.status).toBe(200);
    await expect(active.json()).resolves.toMatchObject({ slug: "active", activeVariants: [{ id: "v1" }] });
  });

  it("maps repository failures to a safe endpoint error", async () => {
    findFeaturedProducts.mockRejectedValue(new Error("db down"));
    const { GET } = await import("@/app/api/catalog/featured-products/route");
    const response = await GET(new Request("http://localhost/api/catalog/featured-products?limit=2"));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ code: "CATALOG_UNAVAILABLE", message: "Catalog is temporarily unavailable." });
  });
});





