// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
function fillNewProduct(withFile = false) {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New boot" } });
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: "New boot details" } });
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: category.id } });
  fireEvent.change(screen.getByLabelText("Brand"), { target: { value: brand.id } });
  fireEvent.change(screen.getByLabelText("Price (ARS)"), { target: { value: "100" } });
  fireEvent.change(screen.getByLabelText("Variant name 1"), { target: { value: "New variant" } });
  fireEvent.change(screen.getByLabelText("SKU 1"), { target: { value: "NEW-40" } });
  if (withFile) {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:new-preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    fireEvent.change(screen.getByLabelText("Choose product images"), { target: { files: [new File(["image"], "new.png", { type: "image/png" })] } });
  } else {
    fireEvent.change(screen.getByLabelText("Image URL 1"), { target: { value: seededImageUrl } });
    fireEvent.change(screen.getByLabelText("Alt text 1"), { target: { value: "New boot" } });
  }
}
const newProduct = { ...product, id: "66666666-6666-4666-8666-666666666666", name: "New boot", slug: "new-boot", featured: false };
const uploadedNewImage = { path: `${newProduct.id}/new.png`, url: "https://storage.example.test/new.png", mimeType: "image/png", sizeBytes: 5 };

describe("AdminCatalogCrud", () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); vi.stubGlobal("confirm", vi.fn(() => true)); fetchMock.mockReset(); mutateAdminCatalog.mockReset(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it.each(["create", "update"])("preserves %s success feedback after refresh", async (operation) => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    await screen.findByLabelText("Name");
    if (operation === "create") fillNewProduct();
    else fireEvent.click(screen.getByRole("button", { name: /Control FG/ }));
    mutateAdminCatalog.mockResolvedValueOnce({ ok: true, product: operation === "create" ? newProduct : product });
    mockInitialLoad(fetchMock);
    fireEvent.click(screen.getByRole("button", { name: operation === "create" ? "Create product" : "Save complete product" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    expect(await screen.findByRole("status")).toHaveTextContent(operation === "create" ? "Product created." : "Product updated.");
    expect(screen.getByRole("heading", { name: "Edit product" })).toBeInTheDocument();
  });

  it("keeps the saved editor and distinguishes a refresh failure from a save failure", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    await screen.findByLabelText("Name");
    fillNewProduct();
    mutateAdminCatalog.mockResolvedValueOnce({ ok: true, product: newProduct });
    fetchMock.mockRejectedValue(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: "Create product" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Product created.");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Catalog refresh failed"));
    expect(screen.getByLabelText("Name")).toHaveValue("New boot");
    expect(screen.getByRole("button", { name: /New boot/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Save complete product" })).toBeEnabled();
  });

  it("locks context during saving and background refresh without removing the editor", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    fireEvent.click(await screen.findByRole("button", { name: /Control FG/ }));
    let resolveSave!: (value: unknown) => void;
    let resolveRefresh!: (value: Response) => void;
    mutateAdminCatalog.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolveRefresh = resolve; }))
      .mockResolvedValueOnce(response([category])).mockResolvedValueOnce(response([brand]));
    fireEvent.click(screen.getByRole("button", { name: "Save complete product" }));
    expect(screen.getByRole("button", { name: "New product" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Control FG/ })).toBeDisabled();
    expect(screen.getByLabelText("Name")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Saving product");
    await act(async () => resolveSave({ ok: true, product }));
    expect(screen.getByLabelText("Name")).toHaveValue(product.name);
    expect(screen.getByRole("button", { name: "New product" })).toBeDisabled();
    await act(async () => resolveRefresh(response(page)));
    expect(screen.getByRole("button", { name: "New product" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("Product updated.");
  });

  it.each(["draft", "published"])("stages PC-only creation as Draft and honors intended %s after attachment", async (status) => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    await screen.findByLabelText("Name");
    fillNewProduct(true);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: status } });
    mutateAdminCatalog.mockResolvedValueOnce({ ok: true, product: { ...newProduct, status: "draft" } })
      .mockResolvedValueOnce({ ok: true, product: { ...newProduct, status } });
    fetchMock.mockResolvedValueOnce(response({ images: [uploadedNewImage] }));
    mockInitialLoad(fetchMock);
    fireEvent.click(screen.getByRole("button", { name: "Create product" }));
    await waitFor(() => expect(mutateAdminCatalog).toHaveBeenCalledTimes(2));
    expect(mutateAdminCatalog.mock.calls[0][0]).toMatchObject({ operation: "create", input: { status: "draft" } });
    expect(mutateAdminCatalog.mock.calls[1][0]).toMatchObject({ operation: "update", productId: newProduct.id, input: { status, images: [expect.objectContaining({ storagePath: uploadedNewImage.path })] } });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Product saved and images uploaded."));
  });

  it("adopts a failed-upload create as Draft and retries the same identity by update", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    await screen.findByLabelText("Name");
    fillNewProduct(true);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "published" } });
    mutateAdminCatalog.mockResolvedValueOnce({ ok: true, product: { ...newProduct, status: "draft" } });
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ code: "STORAGE_UNAVAILABLE" }) });
    fireEvent.click(screen.getByRole("button", { name: "Create product" }));
    expect(await screen.findByRole("status")).toHaveTextContent("saved as Draft");
    expect(screen.getByRole("status")).toHaveTextContent("Image storage is temporarily unavailable");
    expect(screen.getByRole("button", { name: /New boot/ })).toHaveTextContent("draft");
    expect(screen.getByLabelText("Status")).toHaveValue("published");
    mutateAdminCatalog.mockResolvedValueOnce({ ok: true, product: { ...newProduct, status: "draft" } })
      .mockResolvedValueOnce({ ok: true, product: newProduct });
    fetchMock.mockResolvedValueOnce(response({ images: [uploadedNewImage] }));
    mockInitialLoad(fetchMock);
    fireEvent.click(screen.getByRole("button", { name: "Save complete product" }));
    await waitFor(() => expect(mutateAdminCatalog).toHaveBeenCalledTimes(3));
    expect(mutateAdminCatalog.mock.calls[1][0]).toMatchObject({ operation: "update", productId: newProduct.id, input: { status: "draft" } });
    expect(mutateAdminCatalog.mock.calls[2][0].input.status).toBe("published");
  });

  it("retains uploaded metadata after attachment failure and retries without reupload", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    await screen.findByLabelText("Name");
    fillNewProduct(true);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "published" } });
    mutateAdminCatalog.mockResolvedValueOnce({ ok: true, product: { ...newProduct, status: "draft" } })
      .mockResolvedValueOnce({ ok: false, code: "CATALOG_CONFLICT" });
    fetchMock.mockResolvedValueOnce(response({ images: [uploadedNewImage] }));
    fireEvent.click(screen.getByRole("button", { name: "Create product" }));
    expect(await screen.findByRole("status")).toHaveTextContent("images uploaded but attachment failed");
    expect(screen.getByRole("status")).toHaveTextContent("saved as Draft");
    expect(screen.getByLabelText("Image URL 1")).toHaveValue(uploadedNewImage.url);
    mutateAdminCatalog.mockResolvedValueOnce({ ok: true, product: newProduct });
    mockInitialLoad(fetchMock);
    fireEvent.click(screen.getByRole("button", { name: "Save complete product" }));
    await waitFor(() => expect(mutateAdminCatalog).toHaveBeenCalledTimes(3));
    expect(mutateAdminCatalog.mock.calls[2][0]).toMatchObject({ operation: "update", productId: newProduct.id, input: { status: "published", images: [expect.objectContaining({ storagePath: uploadedNewImage.path })] } });
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/images"))).toHaveLength(1);
  });

  it("explains publication and homepage visibility without changing the selected status", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    await screen.findByLabelText("Name");
    expect(screen.getByText(/Draft products are visible only in admin/)).toBeInTheDocument();
    expect(screen.getByText(/Featured products appear on the homepage only when Published/)).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveValue("draft");
    expect(screen.getByLabelText("Featured product")).not.toBeChecked();
  });

  it("does not report successful attachment when upload returns fewer files than requested", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    await screen.findByLabelText("Name");
    fillNewProduct(true);
    mutateAdminCatalog.mockResolvedValueOnce({ ok: true, product: { ...newProduct, status: "draft" } });
    fetchMock.mockResolvedValueOnce(response({ images: [] }));
    fireEvent.click(screen.getByRole("button", { name: "Create product" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("New images were not attached"));
    expect(screen.getByAltText("Local preview for new.png")).toBeInTheDocument();
    expect(mutateAdminCatalog).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Save complete product" })).toBeEnabled();
  });

  it("reports an initial save failure without creating an identity or uploading files", async () => {
    mockInitialLoad(fetchMock);
    render(<AdminCatalogCrud />);
    await screen.findByLabelText("Name");
    fillNewProduct(true);
    mutateAdminCatalog.mockResolvedValueOnce({ ok: false, code: "CATALOG_CONFLICT" });
    fireEvent.click(screen.getByRole("button", { name: "Create product" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("unique slug"));
    expect(screen.getByRole("button", { name: "Create product" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

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
    mockInitialLoad(fetchMock);
    fireEvent.click(screen.getByRole("button", { name: "Archive product" }));
    await waitFor(() => expect(mutateAdminCatalog).toHaveBeenCalledWith({ operation: "archive", productId: product.id }));
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("DELETE"))).toBe(false);
    await waitFor(() => expect(screen.getByRole("button", { name: "Restore as draft" })).toBeEnabled());
    expect(screen.getByRole("status")).toHaveTextContent("Product archived.");
    expect(screen.getByRole("button", { name: "Save complete product" })).toBeDisabled();
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
    await waitFor(() => expect(screen.getByRole("button", { name: "Save complete product" })).toBeEnabled());
    expect(screen.getByRole("status")).toHaveTextContent("Product restored as Draft.");
    expect(screen.getByLabelText("Status")).toHaveValue("draft");
    expect(screen.getByRole("button", { name: /Control FG/ })).toHaveTextContent("draft");
  });
});
