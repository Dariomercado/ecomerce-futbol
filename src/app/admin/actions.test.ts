import { describe, expect, it, vi } from "vitest";

const createProduct = vi.hoisted(() => vi.fn());
const updateProduct = vi.hoisted(() => vi.fn());
const archiveProduct = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());
const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/internal/catalog/products/route", () => ({ POST: createProduct }));
vi.mock("@/app/api/internal/catalog/products/[productId]/route", () => ({ PATCH: updateProduct }));
vi.mock("@/app/api/internal/catalog/products/[productId]/archive/route", () => ({ POST: archiveProduct }));
vi.mock("@/lib/auth/request-integrity", () => ({ loadAppOrigin: vi.fn(() => "https://shop.example") }));
vi.mock("next/headers", () => ({ headers: headersMock, cookies: cookiesMock }));

describe("admin catalog server action", () => {
  it("forwards the HttpOnly token only to the existing route handler", async () => {
    headersMock.mockResolvedValue(new Headers({ origin: "https://shop.example", "sec-fetch-site": "same-origin" }));
    cookiesMock.mockResolvedValue({
      get: (name: string) => name === "admin_csrf_token" ? { value: "secret-token" } : undefined,
      getAll: () => [{ name: "admin_csrf_token", value: "secret-token" }, { name: "sb-access-token", value: "session" }],
    });
    createProduct.mockResolvedValue(Response.json({ id: "product-1" }, { status: 201 }));

    const { mutateAdminCatalog } = await import("@/app/admin/actions");
    const result = await mutateAdminCatalog({ operation: "create", input: {} as never });
    const request = createProduct.mock.calls[0][0] as Request;

    expect(result).toEqual({ ok: true, product: { id: "product-1" } });
    expect(request.headers.get("x-csrf-token")).toBe("secret-token");
    expect(request.headers.get("cookie")).toContain("admin_csrf_token=secret-token");
    expect(JSON.stringify(result)).not.toContain("secret-token");
  });
});
