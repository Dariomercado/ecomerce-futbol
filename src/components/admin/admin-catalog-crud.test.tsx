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
const seededImageUrl = "/catalog/products/control-fg-verde-1.png";
function mockSeededLoad(fetchMock: ReturnType<typeof vi.fn>) {
  fetchMock.mockResolvedValueOnce(response({ ...page, data: [{ ...product, images: [{ ...product.images[0], url: seededImageUrl }] }] }))
    .mockResolvedValueOnce(response([category])).mockResolvedValueOnce(response([brand]));
}

describe("AdminCatalogCrud", () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); vi.stubGlobal("confirm", vi.fn(() => true)); fetchMock.mockReset(); mutateAdminCatalog.mockReset(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("loads catalog and taxonomy before rendering an editable product", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    const productButton = await screen.findByRole("button", { name: /Control FG/ });
    expect(productButton).toHaveTextContent(/published - ARS/);
    fireEvent.click(productButton);
    expect(screen.getByLabelText("Linked variant 1")).toHaveValue("CTRL-GRN-40");
    expect(screen.getByLabelText("Status")).toHaveValue("published");
  });

  it("keeps variant and image controls focused while their mutable values change", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    fireEvent.click(await screen.findByRole("button", { name: /Control FG/ }));

    const sku = screen.getByLabelText("SKU 1");
    sku.focus();
    fireEvent.change(sku, { target: { value: "CTRL-GRN-41" } });
    expect(sku).toHaveFocus();

    const imageUrl = screen.getByLabelText("Image URL 1");
    imageUrl.focus();
    fireEvent.change(imageUrl, { target: { value: "https://example.test/updated-control.jpg" } });
    expect(imageUrl).toHaveFocus();
  });

  it("generates a slug from the name until the slug is manually edited", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    const name = await screen.findByLabelText("Name");
    const slug = screen.getByLabelText("Slug");

    fireEvent.change(name, { target: { value: "Botín Fútbol Pro" } });
    expect(slug).toHaveValue("botin-futbol-pro");

    fireEvent.change(slug, { target: { value: "custom-product-slug" } });
    fireEvent.change(name, { target: { value: "Botín Fútbol Elite" } });
    expect(slug).toHaveValue("custom-product-slug");
  });

  it("shows bordered controls and concise guidance for catalog-specific fields", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    await screen.findByLabelText("Name");

    expect(screen.getByLabelText("Name")).toHaveClass("border-2", "border-input");
    expect(screen.getByText("A unique inventory code used to identify this exact variant.")).toBeInTheDocument();
    expect(screen.getByText("Use a /catalog/ image path or a public HTTPS address.")).toBeInTheDocument();
    expect(screen.getByText(/Controls the display order; lower numbers appear first\./)).toBeInTheDocument();
    expect(screen.getByText("Describe the image for screen readers and when it cannot load.")).toBeInTheDocument();
  });

  it("preserves drag-and-drop previews and sends uploaded Storage metadata", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:local-preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    mockSeededLoad(fetchMock);
    render(<AdminCatalogCrud />);
    fireEvent.click(await screen.findByRole("button", { name: /Control FG/ }));

    const file = new File(["image-bytes"], "control-side.webp", { type: "image/webp" });
    fireEvent.drop(screen.getByRole("button", { name: "Upload product images" }), { dataTransfer: { files: [file] } });
    expect(screen.getByAltText("Local preview for control-side.webp")).toHaveAttribute("src", "blob:local-preview");

    const uploadedImage = {
      path: `${product.id}/uploaded.webp`,
      url: "https://storage.example.test/uploaded.webp",
      mimeType: "image/webp",
      sizeBytes: file.size,
    };
    mutateAdminCatalog.mockResolvedValueOnce({ ok: true, product }).mockResolvedValueOnce({ ok: true, product });
    fetchMock.mockResolvedValueOnce(response({ images: [uploadedImage] }));
    mockInitialLoad(fetchMock);

    fireEvent.click(screen.getByRole("button", { name: "Save complete product" }));
    await waitFor(() => expect(mutateAdminCatalog).toHaveBeenCalledTimes(2));
    expect(mutateAdminCatalog.mock.calls[1][0]).toMatchObject({
      operation: "update",
      productId: product.id,
      input: { images: expect.arrayContaining([expect.objectContaining({ storagePath: uploadedImage.path, mimeType: uploadedImage.mimeType, sizeBytes: uploadedImage.sizeBytes })]) },
    });
    expect(mutateAdminCatalog.mock.calls[1][0].input.images).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: seededImageUrl }),
      expect.objectContaining({ url: uploadedImage.url, storagePath: uploadedImage.path }),
    ]));
    const uploadCall = fetchMock.mock.calls.find(([url]) => url === `/api/internal/catalog/products/${product.id}/images`);
    expect(uploadCall?.[1]).toMatchObject({ method: "POST", credentials: "same-origin" });
    expect(uploadCall?.[1].body.getAll("files")).toEqual([file]);
  });

  it("saves an existing seeded image through the actual save button", async () => {
    mockSeededLoad(fetchMock);
    render(<AdminCatalogCrud />);
    fireEvent.click(await screen.findByRole("button", { name: /Control FG/ }));
    mutateAdminCatalog.mockResolvedValueOnce({ ok: true, product });
    mockSeededLoad(fetchMock);
    expect(screen.getByLabelText("Image URL 1")).toBeValid();
    fireEvent.click(screen.getByRole("button", { name: "Save complete product" }));
    await waitFor(() => expect(mutateAdminCatalog).toHaveBeenCalledTimes(1));
    expect(mutateAdminCatalog.mock.calls[0][0].input.images[0].url).toBe(seededImageUrl);
  });

  it.each([
    "", "not-a-url", "https://", "https://?image", "javascript:alert(1)",
    "data:image/png;base64,AA", "http://example.test/a.png", "//example.test/a.png",
    "/other/a.png", "/catalog/\\example.test/a.png", "/catalog/../other/a.png",
    "https://user:password@example.test/a.png", "https://example.test/bad image.png",
  ])("blocks invalid image reference %j before mutation", async (url) => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    fireEvent.click(await screen.findByRole("button", { name: /Control FG/ }));
    const input = screen.getByLabelText("Image URL 1");
    fireEvent.change(input, { target: { value: url } });
    expect(input).toBeInvalid();
    fireEvent.click(screen.getByRole("button", { name: "Save complete product" }));
    expect(mutateAdminCatalog).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    fireEvent.change(input, { target: { value: product.images[0].url } });
    expect(input).toBeValid();
  });

  it("rejects unsupported and oversized PC files without uploading", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    fireEvent.click(await screen.findByRole("button", { name: /Control FG/ }));
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
    fireEvent.drop(screen.getByRole("button", { name: "Upload product images" }), { dataTransfer: { files: [new File(["svg"], "unsafe.svg", { type: "image/svg+xml" }), oversized] } });
    expect(screen.getByRole("status")).toHaveTextContent("only JPEG, PNG, and WebP images are allowed");
    expect(screen.getByRole("status")).toHaveTextContent("images must be no larger than 5 MiB");
    expect(screen.queryByAltText(/Local preview/)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retains a pending PC file after upload failure and saves it on retry", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:retry-preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    mockSeededLoad(fetchMock);
    render(<AdminCatalogCrud />);
    fireEvent.click(await screen.findByRole("button", { name: /Control FG/ }));
    const file = new File(["bytes"], "retry.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Choose product images"), { target: { files: [file] } });
    mutateAdminCatalog.mockResolvedValue({ ok: true, product });
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ code: "STORAGE_UNAVAILABLE" }) });
    fireEvent.click(screen.getByRole("button", { name: "Save complete product" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Image storage is temporarily unavailable");
    expect(screen.getByAltText("Local preview for retry.png")).toBeInTheDocument();
    expect(mutateAdminCatalog).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValueOnce(response({ images: [{ path: `${product.id}/retry.png`, url: "https://storage.example.test/retry.png", mimeType: file.type, sizeBytes: file.size }] }));
    mockSeededLoad(fetchMock);
    fireEvent.click(screen.getByRole("button", { name: "Save complete product" }));
    await waitFor(() => expect(mutateAdminCatalog).toHaveBeenCalledTimes(3));
    expect(mutateAdminCatalog.mock.calls[2][0].input.images).toEqual(expect.arrayContaining([expect.objectContaining({ url: seededImageUrl }), expect.objectContaining({ storagePath: `${product.id}/retry.png` })]));
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

  it("explains that a conflicting slug or SKU must be made unique", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    fireEvent.click(await screen.findByRole("button", { name: /Control FG/ }));
    mutateAdminCatalog.mockResolvedValueOnce({ ok: false, code: "CATALOG_CONFLICT" });

    fireEvent.click(screen.getByRole("button", { name: "Save complete product" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "A product slug or variant SKU is already in use. Choose a unique slug and check every SKU, then try again.",
    );
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

  it("restores an archived product as a draft through the server action", async () => {
    const archivedPage = { data: [{ ...product, status: "ARCHIVED", isActive: false, featured: false }], pagination: page.pagination };
    fetchMock.mockResolvedValueOnce(response(archivedPage)).mockResolvedValueOnce(response([category])).mockResolvedValueOnce(response([brand]));
    render(<AdminCatalogCrud />);
    fireEvent.click(await screen.findByRole("button", { name: /Control FG/ }));
    mutateAdminCatalog.mockResolvedValueOnce({ ok: true, product: { ...product, status: "draft", isActive: true, featured: false } });
    fetchMock.mockResolvedValueOnce(response(page))
      .mockResolvedValueOnce(response([category]))
      .mockResolvedValueOnce(response([brand]));

    fireEvent.click(screen.getByRole("button", { name: "Restore as draft" }));
    await waitFor(() => expect(mutateAdminCatalog).toHaveBeenLastCalledWith({ operation: "restore", productId: product.id }));
  });
});
