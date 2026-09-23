"use client";

import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react";

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
type ProductFormVariant = AdminProductVariantInput & { rowKey: string };
type FormImage = AdminProductImageInput & { id: string; file?: File; previewUrl?: string; storagePath?: string | null; mimeType?: string | null; sizeBytes?: number | null };
type ProductFormImage = FormImage;
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
  variants: ProductFormVariant[];
  images: ProductFormImage[];
};

let nextRowKey = 0;
function createRowKey(prefix: "variant" | "image") { nextRowKey += 1; return `${prefix}-${nextRowKey}`; }
function createEmptyForm(): ProductForm {
  return {
    name: "", slug: "", description: "", categoryId: "", brandId: "", price: "", compareAtPrice: "", featured: false, status: "draft",
    variants: [{ rowKey: createRowKey("variant"), name: "", sku: "", stock: 0, isActive: true, size: null, color: null, surface: null, price: null }],
    images: [{ id: `manual-${createRowKey("image")}`, url: "", alt: "", position: 1, isPrimary: true, variantSku: null }],
  };
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES_PER_PRODUCT = 8;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CREATE_PLACEHOLDER_URL = "/catalog/products/control-fg-verde-1.png";

export function AdminCatalogCrud() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(createEmptyForm);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [mutationState, setMutationState] = useState<"idle" | "saving" | "archiving" | "restoring">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef(new Set<string>());

  const selectedProduct = products.find((product) => product.id === selectedId) ?? null;
  const isEditing = selectedProduct !== null;
  const isArchived = selectedProduct?.status === "archived" || selectedProduct?.status === "ARCHIVED";
  const availableVariantSkus = useMemo(
    () => form.variants.flatMap((variant) => variant.sku.trim() ? [variant.sku.trim()] : []),
    [form.variants],
  );

  function revokeObjectUrl(url: string | undefined) {
    if (!url || !objectUrls.current.delete(url)) return;
    URL.revokeObjectURL(url);
  }

  function clearLocalPreviews() {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }

  useEffect(() => () => clearLocalPreviews(), []);

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
    clearLocalPreviews();
    setForm(createEmptyForm());
    setSlugManuallyEdited(false);
    setMessage(null);
  }

  function startEdit(product: AdminProduct) {
    setSelectedId(product.id);
    clearLocalPreviews();
    setForm(formFromProduct(product));
    setSlugManuallyEdited(true);
    setMessage(null);
  }

  function updateProductName(name: string) {
    setForm((current) => ({ ...current, name, slug: slugManuallyEdited ? current.slug : slugifyProductName(name) }));
  }

  function addFiles(files: FileList | File[]) {
    const candidates = Array.from(files);
    const currentImages = form.images.filter((image) => image.file || image.url.trim());
    const accepted: File[] = [];
    const errors: string[] = [];
    for (const file of candidates) {
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) errors.push(`${file.name}: only JPEG, PNG, and WebP images are allowed.`);
      else if (file.size <= 0 || file.size > MAX_FILE_BYTES) errors.push(`${file.name}: images must be no larger than 5 MiB.`);
      else if (currentImages.length + accepted.length >= MAX_IMAGES_PER_PRODUCT) errors.push(`A product can have at most ${MAX_IMAGES_PER_PRODUCT} images.`);
      else accepted.push(file);
    }
    if (accepted.length) {
      setForm((current) => {
        const retained = current.images.filter((image) => image.file || image.url.trim());
        return {
          ...current,
          images: [...retained, ...accepted.map((file, index) => {
            const previewUrl = URL.createObjectURL(file);
            objectUrls.current.add(previewUrl);
            return { id: `local-${crypto.randomUUID()}`, file, previewUrl, url: previewUrl, alt: file.name.replace(/\.[^.]+$/, ""), position: retained.length + index + 1, isPrimary: retained.length + index === 0, variantSku: null };
          })],
        };
      });
    }
    setMessage(errors.length ? errors.join(" ") : null);
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pendingImages = form.images.filter((image) => image.file);
    const initialForm = pendingImages.length ? formWithUploadPlaceholder(form) : form;
    const input = toProductInput(initialForm);
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
      let finalForm = initialForm;
      if (pendingImages.length) {
        const controller = new AbortController();
        try {
          const uploaded = await uploadProductImages(saved.id, pendingImages.map((image) => image.file!), controller.signal);
          finalForm = replacePendingImages(initialForm, uploaded);
          const finalInput = toProductInput(finalForm);
          if (!finalInput) throw new Error("ADMIN_CATALOG_SAVE_FAILED");
          const finalResult = await mutateAdminCatalog({ operation: "update", productId: saved.id, input: finalInput });
          if (!finalResult.ok) throw new Error(finalResult.code);
          pendingImages.forEach((image) => revokeObjectUrl(image.previewUrl));
        } catch (error) {
          controller.abort();
          throw error;
        }
      }
      setSelectedId(saved.id);
      setForm(finalForm);
      setSlugManuallyEdited(true);
      setMessage(pendingImages.length ? "Product saved and images uploaded." : isEditing ? "Product updated." : "Product created.");
      setSlugManuallyEdited(true);
      await loadCatalog();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setMutationState("idle");
    }
  }

  async function archiveProduct() {
    if (!selectedId || isArchived) return;
    if (!window.confirm(`Archive ${selectedProduct?.name ?? "this product"}? It will be removed from the active catalog while its data is retained.`)) return;
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

  async function restoreProduct() {
    if (!selectedId || !isArchived) return;
    setMutationState("restoring");
    setMessage(null);
    try {
      const result = await mutateAdminCatalog({ operation: "restore", productId: selectedId });
      if (!result.ok) throw new Error(result.code);
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
          {products.map((product) => <li key={product.id}><button aria-pressed={selectedId === product.id} className="w-full rounded-md border p-3 text-left hover:bg-muted aria-pressed:border-primary" onClick={() => startEdit(product)} type="button"><span className="block font-medium">{product.name}</span><span className="mt-1 block text-xs text-muted-foreground">{statusLabel(product.status)} Ã‚Â· {formatArs(product.price)}</span></button></li>)}
          {products.length === 0 ? <li className="rounded-md bg-muted p-3 text-sm text-muted-foreground">No products yet. Create the first catalog product.</li> : null}
        </ul>
      </aside>

      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold">{isEditing ? "Edit product" : "Create product"}</h2><p className="mt-1 text-sm text-muted-foreground">{isEditing ? "Changes replace the complete product aggregate." : "Add product details, variants, and images."}</p></div>{isEditing ? <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">{statusLabel(selectedProduct.status)}</span> : null}</div>
        {message ? <p className="mt-4 rounded-md bg-muted p-3 text-sm" role="status">{message}</p> : null}
        <form className="mt-6 space-y-7" onSubmit={saveProduct}>
          <fieldset disabled={mutationState !== "idle" || isArchived} className="space-y-5 disabled:cursor-not-allowed disabled:opacity-60">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Name"><input required value={form.name} onChange={(event) => updateProductName(event.target.value)} /></Field><Field label="Slug"><input pattern="[a-z0-9]+(-[a-z0-9]+)*" required value={form.slug} onChange={(event) => { setSlugManuallyEdited(true); updateForm(setForm, "slug", event.target.value); }} /></Field></div>
            <Field label="Description"><textarea required rows={4} value={form.description} onChange={(event) => updateForm(setForm, "description", event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Category"><select required value={form.categoryId} onChange={(event) => updateForm(setForm, "categoryId", event.target.value)}><option value="">Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Brand"><select required value={form.brandId} onChange={(event) => updateForm(setForm, "brandId", event.target.value)}><option value="">Select a brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field></div>
            <div className="grid gap-4 sm:grid-cols-3"><Field label="Price (ARS)"><input min="1" required step="1" type="number" value={form.price} onChange={(event) => updateForm(setForm, "price", event.target.value)} /></Field><Field label="Compare at price (ARS)"><input min="1" step="1" type="number" value={form.compareAtPrice} onChange={(event) => updateForm(setForm, "compareAtPrice", event.target.value)} /></Field><Field label="Status"><select value={form.status} onChange={(event) => updateForm(setForm, "status", event.target.value as AdminProductStatus)}><option value="draft">Draft</option><option value="published">Published</option></select></Field></div>
            <label className="flex items-center gap-2 text-sm font-medium"><input checked={form.featured} onChange={(event) => updateForm(setForm, "featured", event.target.checked)} type="checkbox" /> Featured product</label>
            <VariantFields form={form} setForm={setForm} />
            <ImageFields availableVariantSkus={availableVariantSkus} fileInputRef={fileInputRef} form={form} onAddFiles={addFiles} onRemovePreview={revokeObjectUrl} setForm={setForm} />
          </fieldset>
          <div className="flex flex-wrap gap-3"><button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60" disabled={mutationState !== "idle" || isArchived} type="submit">{mutationState === "saving" ? "Saving..." : isEditing ? "Save complete product" : "Create product"}</button>{isEditing && isArchived ? <button className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60" disabled={mutationState !== "idle"} onClick={() => void restoreProduct()} type="button">{mutationState === "restoring" ? "Restoring..." : "Restore as draft"}</button> : null}{isEditing && !isArchived ? <button className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive disabled:opacity-60" disabled={mutationState !== "idle"} onClick={() => void archiveProduct()} type="button">{mutationState === "archiving" ? "Archiving..." : "Archive product"}</button> : null}</div>
        </form>
      </div>
    </section>
  );
}

function VariantFields({ form, setForm }: { form: ProductForm; setForm: React.Dispatch<React.SetStateAction<ProductForm>> }) {
  return <fieldset className="space-y-3 border-t pt-5"><legend className="text-lg font-semibold">Variants</legend>{form.variants.map((variant, index) => <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2" key={variant.rowKey}><Field label={`Variant name ${index + 1}`}><input required value={variant.name} onChange={(event) => updateVariant(setForm, index, "name", event.target.value)} /></Field><Field helperText="A unique inventory code used to identify this exact variant." label={`SKU ${index + 1}`}><input required value={variant.sku} onChange={(event) => updateVariant(setForm, index, "sku", event.target.value)} /></Field><Field label={`Stock ${index + 1}`}><input min="0" required step="1" type="number" value={variant.stock} onChange={(event) => updateVariant(setForm, index, "stock", Number(event.target.value))} /></Field><Field label={`Variant price ${index + 1} (optional)`}><input min="1" step="1" type="number" value={variant.price ?? ""} onChange={(event) => updateVariant(setForm, index, "price", event.target.value ? Number(event.target.value) : null)} /></Field><Field label={`Size ${index + 1} (optional)`}><input value={variant.size ?? ""} onChange={(event) => updateVariant(setForm, index, "size", event.target.value || null)} /></Field><Field label={`Color ${index + 1} (optional)`}><input value={variant.color ?? ""} onChange={(event) => updateVariant(setForm, index, "color", event.target.value || null)} /></Field><Field label={`Surface ${index + 1} (optional)`}><input value={variant.surface ?? ""} onChange={(event) => updateVariant(setForm, index, "surface", event.target.value || null)} /></Field><label className="flex items-center gap-2 self-end text-sm font-medium"><input checked={variant.isActive} onChange={(event) => updateVariant(setForm, index, "isActive", event.target.checked)} type="checkbox" /> Active</label>{form.variants.length > 1 ? <button className="justify-self-start text-sm font-medium text-destructive sm:col-span-2" onClick={() => removeVariant(setForm, index)} type="button">Remove variant</button> : null}</div>)}<button className="rounded-md border px-3 py-2 text-sm font-medium" onClick={() => setForm((current) => ({ ...current, variants: [...current.variants, { rowKey: createRowKey("variant"), name: "", sku: "", stock: 0, isActive: true, size: null, color: null, surface: null, price: null }] }))} type="button">Add variant</button></fieldset>;
}

function ImageFields({ availableVariantSkus, fileInputRef, form, onAddFiles, onRemovePreview, setForm }: {
  availableVariantSkus: string[]; fileInputRef: React.RefObject<HTMLInputElement | null>; form: ProductForm;
  onAddFiles: (files: FileList | File[]) => void; onRemovePreview: (url: string | undefined) => void;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
}) {
  return <fieldset className="space-y-3 border-t pt-5"><legend className="text-lg font-semibold">Images</legend>
    <input accept="image/jpeg,image/png,image/webp" aria-label="Choose product images" className="sr-only" multiple onChange={(event) => { if (event.target.files) onAddFiles(event.target.files); event.target.value = ""; }} ref={fileInputRef} type="file" />
    <div aria-label="Upload product images" className="rounded-md border border-dashed p-4 text-center text-sm" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onAddFiles(event.dataTransfer.files); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInputRef.current?.click(); } }} role="button" tabIndex={0}>
      Drop JPEG, PNG, or WebP files here, or press Enter to choose files. Maximum 5 MiB each; up to 8 images.
    </div>
    {form.images.map((image, index) => <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2" key={image.id}>
      {image.file ? <div className="sm:col-span-2"><img alt={`Local preview for ${image.file.name}`} className="h-32 w-32 rounded object-cover" src={image.previewUrl} /><p className="mt-1 text-xs text-muted-foreground">{image.file.name}</p></div> : <Field helperText="Paste the public HTTPS address where the product image is hosted." label={`Image URL ${index + 1}`}><input required type="url" value={image.url} onChange={(event) => updateImage(setForm, index, "url", event.target.value)} /></Field>}
      <Field helperText="Describe the image for screen readers and when it cannot load." label={`Alt text ${index + 1}`}><input required value={image.alt} onChange={(event) => updateImage(setForm, index, "alt", event.target.value)} /></Field>
      <Field label={`Linked variant ${index + 1}`}><select value={image.variantSku ?? ""} onChange={(event) => updateImage(setForm, index, "variantSku", event.target.value || null)}><option value="">No variant link</option>{availableVariantSkus.map((sku) => <option key={sku} value={sku}>{sku}</option>)}</select></Field>
      <label className="flex items-center gap-2 text-sm font-medium"><input checked={image.isPrimary} onChange={() => setPrimaryImage(setForm, index)} type="radio" name="primary-image" /> Primary image</label>
      <p className="text-xs text-muted-foreground">Position {image.position}. Controls the display order; lower numbers appear first.</p>
      <div className="flex gap-2"><button disabled={index === 0} onClick={() => moveImage(setForm, index, -1)} type="button">Move up</button><button disabled={index === form.images.length - 1} onClick={() => moveImage(setForm, index, 1)} type="button">Move down</button><button className="text-destructive" onClick={() => { onRemovePreview(image.previewUrl); removeImage(setForm, index); }} type="button">Remove image</button></div>
    </div>)}
    <button className="rounded-md border px-3 py-2 text-sm font-medium" onClick={() => setForm((current) => ({ ...current, images: [...current.images, { id: createRowKey("image"), url: "", alt: "", position: current.images.length + 1, isPrimary: current.images.length === 0, variantSku: null }] }))} type="button">Add image URL</button>
  </fieldset>;
}
const fieldControlClassName = "mt-1 min-h-10 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";

function Field({ children, helperText, label }: { children: React.ReactNode; helperText?: string; label: string }) {
  const generatedControlId = useId();
  const controlId = isValidElement<{ id?: string }>(children) ? children.props.id ?? generatedControlId : generatedControlId;
  const helperId = `${controlId}-helper`;
  const control = isValidElement<{ "aria-describedby"?: string; className?: string; id?: string }>(children)
    ? cloneElement(children, { "aria-describedby": helperText ? helperId : children.props["aria-describedby"], className: `${fieldControlClassName} ${children.props.className ?? ""}`, id: children.props.id ?? controlId })
    : children;

  return <div className="grid gap-1 text-sm"><label className="font-medium" htmlFor={controlId}>{label}</label>{control}{helperText ? <p className="text-xs text-muted-foreground" id={helperId}>{helperText}</p> : null}</div>;
}

function updateForm<K extends Exclude<keyof ProductForm, "variants" | "images">>(setForm: React.Dispatch<React.SetStateAction<ProductForm>>, key: K, value: ProductForm[K]) { setForm((current) => ({ ...current, [key]: value })); }
function updateVariant<K extends keyof AdminProductVariantInput>(setForm: React.Dispatch<React.SetStateAction<ProductForm>>, index: number, key: K, value: AdminProductVariantInput[K]) { setForm((current) => ({ ...current, variants: current.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [key]: value } : variant) })); }
function updateImage<K extends keyof AdminProductImageInput>(setForm: React.Dispatch<React.SetStateAction<ProductForm>>, index: number, key: K, value: AdminProductImageInput[K]) { setForm((current) => ({ ...current, images: current.images.map((image, imageIndex) => imageIndex === index ? { ...image, [key]: value } : image) })); }
function removeVariant(setForm: React.Dispatch<React.SetStateAction<ProductForm>>, index: number) { setForm((current) => ({ ...current, variants: current.variants.filter((_, variantIndex) => variantIndex !== index), images: current.images.map((image) => image.variantSku === current.variants[index]?.sku ? { ...image, variantSku: null } : image) })); }
function removeImage(setForm: React.Dispatch<React.SetStateAction<ProductForm>>, index: number) { setForm((current) => { const images = current.images.filter((_, imageIndex) => imageIndex !== index); return { ...current, images: normalizeImageOrder(images) }; }); }
function setPrimaryImage(setForm: React.Dispatch<React.SetStateAction<ProductForm>>, index: number) { setForm((current) => ({ ...current, images: current.images.map((image, imageIndex) => ({ ...image, isPrimary: imageIndex === index })) })); }
function moveImage(setForm: React.Dispatch<React.SetStateAction<ProductForm>>, index: number, direction: -1 | 1) { setForm((current) => { const target = index + direction; if (target < 0 || target >= current.images.length) return current; const images = [...current.images]; [images[index], images[target]] = [images[target], images[index]]; return { ...current, images: normalizeImageOrder(images) }; }); }
function normalizeImageOrder(images: FormImage[]) { return images.map((image, index) => ({ ...image, position: index + 1, isPrimary: image.isPrimary || (!images.some((candidate) => candidate.isPrimary) && index === 0) })); }

function formFromProduct(product: AdminProduct): ProductForm {
  const variants = product.variants.map((variant) => ({ rowKey: `variant-${variant.id}`, name: variant.name, size: variant.size, color: variant.color, surface: variant.surface, price: variant.price, sku: variant.sku, stock: variant.stock, isActive: variant.isActive }));
  return { name: product.name, slug: product.slug, description: product.description, categoryId: product.categoryId, brandId: product.brandId, price: String(product.price), compareAtPrice: product.compareAtPrice === null ? "" : String(product.compareAtPrice), featured: product.featured, status: product.status === "published" || product.status === "PUBLISHED" ? "published" : "draft", variants, images: product.images.map((image) => ({ id: `image-${image.id}`, url: image.url, alt: image.alt, storagePath: image.storagePath, mimeType: image.mimeType, sizeBytes: image.sizeBytes, position: image.position, isPrimary: image.isPrimary, variantSku: product.variants.find((variant) => variant.id === image.variantId)?.sku ?? null })) };
}

function toProductInput(form: ProductForm): AdminProductInput | null {
  const price = parseWholeNumber(form.price); const compareAtPrice = form.compareAtPrice.trim() ? parseWholeNumber(form.compareAtPrice) : null;
  if (price === null || (form.compareAtPrice.trim() && (compareAtPrice === null || compareAtPrice <= price)) || form.variants.some((variant) => !Number.isInteger(variant.stock) || variant.stock < 0 || (variant.price != null && (!Number.isInteger(variant.price) || variant.price < 1))) || form.images.some((image) => !Number.isInteger(image.position) || image.position < 1)) return null;
  const images = form.images.filter((image) => !image.file).map(({ id: _id, file: _file, previewUrl: _previewUrl, ...image }) => ({ ...image, url: image.url.trim(), alt: image.alt.trim() }));
  return { name: form.name.trim(), slug: form.slug.trim(), description: form.description.trim(), categoryId: form.categoryId, brandId: form.brandId, price, compareAtPrice, featured: form.featured, status: form.status, variants: form.variants.map((variant) => ({ name: variant.name.trim(), sku: variant.sku.trim(), stock: variant.stock, isActive: variant.isActive, size: variant.size, color: variant.color, surface: variant.surface, price: variant.price })), images };
}
function formWithUploadPlaceholder(form: ProductForm): ProductForm {
  const persisted = form.images.filter((image) => !image.file && image.url.trim());
  const images = persisted.length ? form.images : [{ id: "upload-placeholder", url: CREATE_PLACEHOLDER_URL, alt: "Product image pending upload", position: 1, isPrimary: true, variantSku: null }, ...form.images];
  return { ...form, images: normalizeImageOrder(images) };
}
type UploadedImage = { path: string; url: string; mimeType: string; sizeBytes: number };
async function uploadProductImages(productId: string, files: File[], signal: AbortSignal): Promise<UploadedImage[]> {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  const response = await fetch(`/api/internal/catalog/products/${productId}/images`, { method: "POST", body, credentials: "same-origin", signal });
  let payload: unknown = null;
  try { payload = await response.json(); } catch { /* error handled below */ }
  if (!response.ok || !isUploadResponse(payload)) throw new Error(uploadErrorMessage(payload));
  return payload.images;
}
function isUploadResponse(value: unknown): value is { images: UploadedImage[] } { return typeof value === "object" && value !== null && "images" in value && Array.isArray(value.images) && value.images.every((image) => typeof image === "object" && image !== null && "path" in image && typeof image.path === "string" && "url" in image && typeof image.url === "string" && "mimeType" in image && typeof image.mimeType === "string" && "sizeBytes" in image && typeof image.sizeBytes === "number" && Number.isInteger(image.sizeBytes) && image.sizeBytes > 0); }
function replacePendingImages(baseForm: ProductForm, uploaded: UploadedImage[]): ProductForm {
  let uploadIndex = 0;
  const retained = baseForm.images.filter((image) => image.id !== "upload-placeholder").map((image) => {
    if (!image.file) return image;
    const uploadedImage = uploaded[uploadIndex++];
    return uploadedImage
      ? { ...image, file: undefined, previewUrl: undefined, url: uploadedImage.url, storagePath: uploadedImage.path, mimeType: uploadedImage.mimeType, sizeBytes: uploadedImage.sizeBytes }
      : image;
  });
  if (uploadIndex !== uploaded.length) throw new Error("IMAGE_UPLOAD_FAILED");
  return { ...baseForm, images: normalizeImageOrder(retained) };
}
function uploadErrorMessage(payload: unknown) { const code = typeof payload === "object" && payload !== null && "code" in payload ? (payload as { code?: unknown }).code : undefined; if (code === "UNSUPPORTED_IMAGE_TYPE") return "Only JPEG, PNG, and WebP images can be uploaded."; if (code === "IMAGE_SIZE_INVALID") return "Each image must be no larger than 5 MiB."; if (code === "IMAGE_LIMIT_EXCEEDED") return "A product can have at most 8 images."; if (code === "STORAGE_UNAVAILABLE") return "Image storage is temporarily unavailable. Your files were not attached."; return "Image upload failed. The product was saved without the new files."; }
function slugifyProductName(value: string) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function parseWholeNumber(value: string): number | null { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
function isProductList(value: unknown): value is AdminProductList { return typeof value === "object" && value !== null && "data" in value && Array.isArray(value.data) && "pagination" in value; }
function isSavedProduct(value: unknown): value is AdminProduct { return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string"; }
function errorMessage(error: unknown): string { if (error instanceof Error && error.message.startsWith("Image ")) return error.message; if (error instanceof Error && error.message === "INVALID_ADMIN_PRODUCT") return "The product is incomplete or invalid. Check all required fields, unique SKUs, and the primary image."; if (error instanceof Error && error.message === "CATALOG_CONFLICT") return "A product or variant SKU already uses one of these values."; if (error instanceof Error && error.message === "CATALOG_REFERENCE_NOT_FOUND") return "Choose an active category and brand."; if (error instanceof Error && error.message === "ADMIN_CSRF_INVALID") return "Your protected request expired. Refresh this page and try again."; return "The catalog change could not be completed. Try again shortly."; }
function statusLabel(status: AdminProduct["status"]) { return status.toLowerCase(); }
function formatArs(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value); }


