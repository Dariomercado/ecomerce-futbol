// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mutateAdminCatalog = vi.hoisted(() => vi.fn());
vi.mock("@/app/admin/actions", () => ({ mutateAdminCatalog }));

import { AdminCatalogCrud } from "./admin-catalog-crud";

const category = { id: "11111111-1111-4111-8111-111111111111", name: "Boots", slug: "boots", description: "", imageUrl: null };
const brand = { id: "22222222-2222-4222-8222-222222222222", name: "Adidas", slug: "adidas", description: "", logoUrl: null };
const product = {
  id: "33333333-3333-4333-8333-333333333333", name: "Control FG", slug: "control-fg", description: "Firm-ground boot.", categoryId: category.id, brandId: brand.id,
  price: 120000, compareAtPrice: 140000, featured: true, status: "PUBLISHED", isActive: true,
  variants: [{ id: "44444444-4444-4444-8444-444444444444", name: "Green / 40", sku: "CTRL-GRN-40", stock: 4, isActive: true, size: "40", color: "Green", surface: "FG", price: null }],
  images: [{ id: "55555555-5555-4555-8555-555555555555", url: "https://example.test/control.jpg", alt: "Control boot", position: 1, isPrimary: true, variantId: "44444444-4444-4444-8444-444444444444" }],
};
const page = { data: [product], pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false } };
function response(body: unknown) { return { ok: true, json: vi.fn().mockResolvedValue(body) } as unknown as Response; }
function mockInitialLoad(fetchMock: ReturnType<typeof vi.fn>) { fetchMock.mockResolvedValueOnce(response(page)).mockResolvedValueOnce(response([category])).mockResolvedValueOnce(response([brand])); }

describe("AdminCatalogCrud", () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); mutateAdminCatalog.mockReset(); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("loads catalog and taxonomy before rendering an editable product", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    fireEvent.click(await screen.findByRole("button", { name: /Control FG/ }));
    expect(screen.getByLabelText("Linked variant 1")).toHaveValue("CTRL-GRN-40");
    expect(screen.getByLabelText("Status")).toHaveValue("published");
  });

  it("sends complete aggregates through the server action without a client CSRF token", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    fireEvent.click(await screen.findByRole("button", { name: /Control FG/ }));
    mutateAdminCatalog.mockResolvedValueOnce({ ok: true, product });
    fireEvent.click(screen.getByRole("button", { name: "Save complete product" }));
    await waitFor(() => expect(mutateAdminCatalog).toHaveBeenCalledWith({ operation: "update", productId: product.id, input: expect.any(Object) }));
    expect(mutateAdminCatalog.mock.calls[0][0].input).toMatchObject({ name: product.name, slug: product.slug, variants: [{ sku: "CTRL-GRN-40" }] });
  });

  it("creates and archives through the existing server-mediated operations", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    fireEvent.click(await screen.findByRole("button", { name: /Control FG/ }));
    mutateAdminCatalog.mockResolvedValueOnce({ ok: true, product: { ...product, status: "archived", isActive: false } });
    fireEvent.click(screen.getByRole("button", { name: "Archive product" }));
    await waitFor(() => expect(mutateAdminCatalog).toHaveBeenCalledWith({ operation: "archive", productId: product.id }));
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("DELETE"))).toBe(false);
  });
});