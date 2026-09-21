"use client";

import { useEffect, useMemo, useState } from "react";

import { mutateAdminCatalog } from "@/app/admin/actions";
import type { AdminProductImageInput, AdminProductInput, AdminProductStatus, AdminProductVariantInput } from "@/lib/catalog/admin-contracts";
import type { BrandSummary, CategorySummary, PaginationMeta } from "@/lib/catalog/public-contracts";

type AdminProductVariant = AdminProductVariantInput & { id: string };
type AdminProductImage = Omit<AdminProductImageInput, "variantSku"> & { id: string; variantId: string | null };
type AdminProduct = Omit<AdminProductInput, "variants" | "images" | "status"> & {
  id: string;
  isActive: boolean;
  status: AdminProductStatus | "archived" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
  variants: AdminProductVariant[];
  images: AdminProductImage[];
};

type AdminProductList = { data: AdminProduct[]; pagination: PaginationMeta };
type ProductForm = {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  brandId: string;
  price: string;
  compareAtPrice: string;
  featured: boolean;
  status: AdminProductStatus;
  variants: Array<AdminProductVariantInput>;
  images: Array<AdminProductImageInput>;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  slug: "",
  description: "",
  categoryId: "",
  brandId: "",
  price: "",
  compareAtPrice: "",
  featured: false,
  status: "draft",
  variants: [{ name: "", sku: "", stock: 0, isActive: true, size: null, color: null, surface: null, price: null }],
  images: [{ url: "", alt: "", position: 1, isPrimary: true, variantSku: null }],
};

export function AdminCatalogCrud() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [mutationState, setMutationState] = useState<"idle" | "saving" | "archiving">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const selectedProduct = products.find((product) => product.id === selectedId) ?? null;
  const isEditing = selectedProduct !== null;
  const isArchived = selectedProduct?.status === "archived" || selectedProduct?.status === "ARCHIVED";
  const availableVariantSkus = useMemo(
    () => form.variants.flatMap((variant) => variant.sku.trim() ? [variant.sku.trim()] : []),
    [form.variants],
  );

  async function loadCatalog() {
    setState("loading");
    setMessage(null);
    try {
      const [productsResponse, categoriesResponse, brandsResponse] = await Promise.all([
        fetch("/api/internal/catalog/products?page=1&limit=50", { credentials: "same-origin" }),
        fetch("/api/catalog/categories", { credentials: "same-origin" }),
        fetch("/api/catalog/brands", { credentials: "same-origin" }),
      ]);
      if (!productsResponse.ok || !categoriesResponse.ok || !brandsResponse.ok) throw new Error("ADMIN_CATALOG_LOAD_FAILED");

      const [productList, categoryList, brandList]: unknown[] = await Promise.all([
        productsResponse.json(),
        categoriesResponse.json(),
        brandsResponse.json(),
      ]);
      if (!isProductList(productList) || !Array.isArray(categoryList) || !Array.isArray(brandList)) throw new Error("ADMIN_CATALOG_LOAD_FAILED");

      setProducts(productList.data);
      setCategories(categoryList as CategorySummary[]);
      setBrands(brandList as BrandSummary[]);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadCatalog);
  }, []);

  function startCreate() {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setMessage(null);
  }

  function startEdit(product: AdminProduct) {
    setSelectedId(product.id);
    setForm(formFromProduct(product));
    setMessage(null);
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = toProductInput(form);
    if (!input) {
      setMessage("Price, comparison price, and stock must be whole numbers. A comparison price must be higher than the price.");
      return;
    }
    if (isEditing && !selectedId) return;

    setMutationState("saving");
    setMessage(null);
    try {
      // PATCH is replacement semantics: this sends every product, variant, and image field, never a partial patch.
      const result = await mutateAdminCatalog(isEditing
        ? { operation: "update", productId: selectedId!, input }
        : { operation: "create", input });
      if (!result.ok) throw new Error(result.code);

      const saved: unknown = result.product;
      if (!isSavedProduct(saved)) throw new Error("ADMIN_CATALOG_SAVE_FAILED");
      setSelectedId(saved.id);
      setForm(formFromProduct(saved));
      setMessage(isEditing ? "Product updated." : "Product created.");
      await loadCatalog();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setMutationState("idle");
    }
  }

  async function archiveProduct() {
    if (!selectedId || isArchived) return;
    setMutationState("archiving");
    setMessage(null);
    try {
      const result = await mutateAdminCatalog({ operation: "archive", productId: selectedId });
      if (!result.ok) throw new Error(result.code);
      setMessage("Product archived. It remains in the catalog history and cannot be edited.");
      await loadCatalog();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setMutationState("idle");
    }
  }

  if (state === "loading") return <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading catalog administration...</p>;
  if (state === "error") return <section className="rounded-lg border border-destructive/40 bg-card p-6" role="alert"><h1 className="text-xl font-semibold">Catalog administration is unavailable</h1><p className="mt-2 text-sm text-muted-foreground">The catalog or taxonomy data could not be loaded.</p><button className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" onClick={() => void loadCatalog()} type="button">Try again</button></section>;

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(17rem,0.7fr)_minmax(0,1.3fr)]">
      <aside className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h1 className="text-2xl font-semibold">Catalog</h1><p className="mt-1 text-sm text-muted-foreground">{products.length} loaded product{products.length === 1 ? "" : "s"}</p></div>
          <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" onClick={startCreate} type="button">New product</button>
        </div>
        <ul aria-label="Catalog products" className="mt-5 space-y-2">
          {products.map((product) => <li key={product.id}><button aria-pressed={selectedId === product.id} className="w-full rounded-md border p-3 text-left hover:bg-muted aria-pressed:border-primary" onClick={() => startEdit(product)} type="button"><span className="block font-medium">{product.name}</span><span className="mt-1 block text-xs text-muted-foreground">{statusLabel(product.status)} · {formatArs(product.price)}</span></button></li>)}
          {products.length === 0 ? <li className="rounded-md bg-muted p-3 text-sm text-muted-foreground">No products yet. Create the first catalog product.</li> : null}
        </ul>
      </aside>

      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold">{isEditing ? "Edit product" : "Create product"}</h2><p className="mt-1 text-sm text-muted-foreground">{isEditing ? "Changes replace the complete product aggregate." : "Add product details, variants, and images."}</p></div>{isEditing ? <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">{statusLabel(selectedProduct.status)}</span> : null}</div>
        {message ? <p className="mt-4 rounded-md bg-muted p-3 text-sm" role="status">{message}</p> : null}
        <form className="mt-6 space-y-7" onSubmit={saveProduct}>
          <fieldset disabled={mutationState !== "idle" || isArchived} className="space-y-5 disabled:cursor-not-allowed disabled:opacity-60">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Name"><input required value={form.name} onChange={(event) => updateForm(setForm, "name", event.target.value)} /></Field><Field label="Slug"><input pattern="[a-z0-9]+(-[a-z0-9]+)*" required value={form.slug} onChange={(event) => updateForm(setForm, "slug", event.target.value)} /></Field></div>
            <Field label="Description"><textarea required rows={4} value={form.description} onChange={(event) => updateForm(setForm, "description", event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Category"><select required value={form.categoryId} onChange={(event) => updateForm(setForm, "categoryId", event.target.value)}><option value="">Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Brand"><select required value={form.brandId} onChange={(event) => updateForm(setForm, "brandId", event.target.value)}><option value="">Select a brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field></div>
            <div className="grid gap-4 sm:grid-cols-3"><Field label="Price (ARS)"><input min="1" required step="1" type="number" value={form.price} onChange={(event) => updateForm(setForm, "price", event.target.value)} /></Field><Field label="Compare at price (ARS)"><input min="1" step="1" type="number" value={form.compareAtPrice} onChange={(event) => updateForm(setForm, "compareAtPrice", event.target.value)} /></Field><Field label="Status"><select value={form.status} onChange={(event) => updateForm(setForm, "status", event.target.value as AdminProductStatus)}><option value="draft">Draft</option><option value="published">Published</option></select></Field></div>
            <label className="flex items-center gap-2 text-sm font-medium"><input checked={form.featured} onChange={(event) => updateForm(setForm, "featured", event.target.checked)} type="checkbox" /> Featured product</label>
            <VariantFields form={form} setForm={setForm} />
            <ImageFields availableVariantSkus={availableVariantSkus} form={form} setForm={setForm} />
          </fieldset>
          <div className="flex flex-wrap gap-3"><button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60" disabled={mutationState !== "idle" || isArchived} type="submit">{mutationState === "saving" ? "Saving..." : isEditing ? "Save complete product" : "Create product"}</button>{isEditing ? <button className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive disabled:opacity-60" disabled={mutationState !== "idle" || isArchived} onClick={() => void archiveProduct()} type="button">{mutationState === "archiving" ? "Archiving..." : isArchived ? "Archived" : "Archive product"}</button> : null}</div>
        </form>
      </div>
    </section>
  );
}

function VariantFields({ form, setForm }: { form: ProductForm; setForm: React.Dispatch<React.SetStateAction<ProductForm>> }) {
  return <fieldset className="space-y-3 border-t pt-5"><legend className="text-lg font-semibold">Variants</legend>{form.variants.map((variant, index) => <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2" key={`${variant.sku}-${index}`}><Field label={`Variant name ${index + 1}`}><input required value={variant.name} onChange={(event) => updateVariant(setForm, index, "name", event.target.value)} /></Field><Field label={`SKU ${index + 1}`}><input required value={variant.sku} onChange={(event) => updateVariant(setForm, index, "sku", event.target.value)} /></Field><Field label={`Stock ${index + 1}`}><input min="0" required step="1" type="number" value={variant.stock} onChange={(event) => updateVariant(setForm, index, "stock", Number(event.target.value))} /></Field><Field label={`Variant price ${index + 1} (optional)`}><input min="1" step="1" type="number" value={variant.price ?? ""} onChange={(event) => updateVariant(setForm, index, "price", event.target.value ? Number(event.target.value) : null)} /></Field><Field label={`Size ${index + 1} (optional)`}><input value={variant.size ?? ""} onChange={(event) => updateVariant(setForm, index, "size", event.target.value || null)} /></Field><Field label={`Color ${index + 1} (optional)`}><input value={variant.color ?? ""} onChange={(event) => updateVariant(setForm, index, "color", event.target.value || null)} /></Field><Field label={`Surface ${index + 1} (optional)`}><input value={variant.surface ?? ""} onChange={(event) => updateVariant(setForm, index, "surface", event.target.value || null)} /></Field><label className="flex items-center gap-2 self-end text-sm font-medium"><input checked={variant.isActive} onChange={(event) => updateVariant(setForm, index, "isActive", event.target.checked)} type="checkbox" /> Active</label>{form.variants.length > 1 ? <button className="justify-self-start text-sm font-medium text-destructive sm:col-span-2" onClick={() => removeVariant(setForm, index)} type="button">Remove variant</button> : null}</div>)}<button className="rounded-md border px-3 py-2 text-sm font-medium" onClick={() => setForm((current) => ({ ...current, variants: [...current.variants, { name: "", sku: "", stock: 0, isActive: true, size: null, color: null, surface: null, price: null }] }))} type="button">Add variant</button></fieldset>;
}

function ImageFields({ availableVariantSkus, form, setForm }: { availableVariantSkus: string[]; form: ProductForm; setForm: React.Dispatch<React.SetStateAction<ProductForm>> }) {
  return <fieldset className="space-y-3 border-t pt-5"><legend className="text-lg font-semibold">Images</legend>{form.images.map((image, index) => <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2" key={`${image.url}-${index}`}><Field label={`Image URL ${index + 1}`}><input required type="url" value={image.url} onChange={(event) => updateImage(setForm, index, "url", event.target.value)} /></Field><Field label={`Alt text ${index + 1}`}><input required value={image.alt} onChange={(event) => updateImage(setForm, index, "alt", event.target.value)} /></Field><Field label={`Image position ${index + 1}`}><input min="1" required step="1" type="number" value={image.position} onChange={(event) => updateImage(setForm, index, "position", Number(event.target.value))} /></Field><Field label={`Linked variant ${index + 1}`}><select value={image.variantSku ?? ""} onChange={(event) => updateImage(setForm, index, "variantSku", event.target.value || null)}><option value="">No variant link</option>{availableVariantSkus.map((sku) => <option key={sku} value={sku}>{sku}</option>)}</select></Field><label className="flex items-center gap-2 text-sm font-medium"><input checked={image.isPrimary} onChange={() => setPrimaryImage(setForm, index)} type="radio" name="primary-image" /> Primary image</label>{form.images.length > 1 ? <button className="justify-self-start text-sm font-medium text-destructive sm:col-span-2" onClick={() => removeImage(setForm, index)} type="button">Remove image</button> : null}</div>)}<button className="rounded-md border px-3 py-2 text-sm font-medium" onClick={() => setForm((current) => ({ ...current, images: [...current.images, { url: "", alt: "", position: current.images.length + 1, isPrimary: false, variantSku: null }] }))} type="button">Add image</button></fieldset>;
}

function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="grid gap-1 text-sm font-medium">{label}{children}</label>; }

function updateForm<K extends Exclude<keyof ProductForm, "variants" | "images">>(setForm: React.Dispatch<React.SetStateAction<ProductForm>>, key: K, value: ProductForm[K]) { setForm((current) => ({ ...current, [key]: value })); }
function updateVariant<K extends keyof AdminProductVariantInput>(setForm: React.Dispatch<React.SetStateAction<ProductForm>>, index: number, key: K, value: AdminProductVariantInput[K]) { setForm((current) => ({ ...current, variants: current.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [key]: value } : variant) })); }
function updateImage<K extends keyof AdminProductImageInput>(setForm: React.Dispatch<React.SetStateAction<ProductForm>>, index: number, key: K, value: AdminProductImageInput[K]) { setForm((current) => ({ ...current, images: current.images.map((image, imageIndex) => imageIndex === index ? { ...image, [key]: value } : image) })); }
function removeVariant(setForm: React.Dispatch<React.SetStateAction<ProductForm>>, index: number) { setForm((current) => ({ ...current, variants: current.variants.filter((_, variantIndex) => variantIndex !== index), images: current.images.map((image) => image.variantSku === current.variants[index]?.sku ? { ...image, variantSku: null } : image) })); }
function removeImage(setForm: React.Dispatch<React.SetStateAction<ProductForm>>, index: number) { setForm((current) => { const images = current.images.filter((_, imageIndex) => imageIndex !== index); return { ...current, images: images.map((image, imageIndex) => ({ ...image, position: imageIndex + 1, isPrimary: image.isPrimary || imageIndex === 0 })) }; }); }
function setPrimaryImage(setForm: React.Dispatch<React.SetStateAction<ProductForm>>, index: number) { setForm((current) => ({ ...current, images: current.images.map((image, imageIndex) => ({ ...image, isPrimary: imageIndex === index })) })); }

function formFromProduct(product: AdminProduct): ProductForm {
  const variants = product.variants.map((variant) => ({ name: variant.name, size: variant.size, color: variant.color, surface: variant.surface, price: variant.price, sku: variant.sku, stock: variant.stock, isActive: variant.isActive }));
  return { name: product.name, slug: product.slug, description: product.description, categoryId: product.categoryId, brandId: product.brandId, price: String(product.price), compareAtPrice: product.compareAtPrice === null ? "" : String(product.compareAtPrice), featured: product.featured, status: product.status === "published" || product.status === "PUBLISHED" ? "published" : "draft", variants, images: product.images.map((image) => ({ url: image.url, alt: image.alt, position: image.position, isPrimary: image.isPrimary, variantSku: product.variants.find((variant) => variant.id === image.variantId)?.sku ?? null })) };
}

function toProductInput(form: ProductForm): AdminProductInput | null {
  const price = parseWholeNumber(form.price); const compareAtPrice = form.compareAtPrice.trim() ? parseWholeNumber(form.compareAtPrice) : null;
  if (price === null || (form.compareAtPrice.trim() && (compareAtPrice === null || compareAtPrice <= price)) || form.variants.some((variant) => !Number.isInteger(variant.stock) || variant.stock < 0 || (variant.price != null && (!Number.isInteger(variant.price) || variant.price < 1))) || form.images.some((image) => !Number.isInteger(image.position) || image.position < 1)) return null;
  return { name: form.name.trim(), slug: form.slug.trim(), description: form.description.trim(), categoryId: form.categoryId, brandId: form.brandId, price, compareAtPrice, featured: form.featured, status: form.status, variants: form.variants.map((variant) => ({ ...variant, name: variant.name.trim(), sku: variant.sku.trim() })), images: form.images.map((image) => ({ ...image, url: image.url.trim(), alt: image.alt.trim() })) };
}
function parseWholeNumber(value: string): number | null { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
function isProductList(value: unknown): value is AdminProductList { return typeof value === "object" && value !== null && "data" in value && Array.isArray(value.data) && "pagination" in value; }
function isSavedProduct(value: unknown): value is AdminProduct { return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string"; }
function errorMessage(error: unknown): string { if (error instanceof Error && error.message === "INVALID_ADMIN_PRODUCT") return "The product is incomplete or invalid. Check all required fields, unique SKUs, and the primary image."; if (error instanceof Error && error.message === "CATALOG_CONFLICT") return "A product or variant SKU already uses one of these values."; if (error instanceof Error && error.message === "CATALOG_REFERENCE_NOT_FOUND") return "Choose an active category and brand."; if (error instanceof Error && error.message === "ADMIN_CSRF_INVALID") return "Your protected request expired. Refresh this page and try again."; return "The catalog change could not be completed. Try again shortly."; }
function statusLabel(status: AdminProduct["status"]) { return status.toLowerCase(); }
function formatArs(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value); }







