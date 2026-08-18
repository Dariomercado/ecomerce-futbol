"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CatalogEmptyState } from "@/components/catalog/catalog-empty-state";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogTopBar } from "@/components/catalog/catalog-top-bar";
import { ProductGrid } from "@/components/catalog/product-grid";
import type { BrandSummary, CategorySummary, PaginatedResult, PaginationMeta, ProductSummary } from "@/lib/catalog/public-contracts";

type Props = { brand?: string; category?: string; featuredOnly: boolean; page?: string };

export function CatalogApiContent({ brand, category, featuredOnly, page }: Props) {
  const query = new URLSearchParams();
  if (brand) query.set("brand", brand);
  if (category) query.set("category", category);
  if (featuredOnly) query.set("featured", "true");
  if (page) query.set("page", page);
  const requestUrl = `/api/catalog/products${query.size ? `?${query}` : ""}`;
  const [data, setData] = useState<ProductSummary[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loadedUrl, setLoadedUrl] = useState("");
  const [errorUrl, setErrorUrl] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const products = await fetch(requestUrl, { signal: controller.signal });
        if (!products.ok) throw new Error();
        const list: unknown = await products.json();
        if (!isProductList(list) || controller.signal.aborted) return;
        setData(list.data);
        setPagination(list.pagination);
        setErrorUrl(null);
        setLoadedUrl(requestUrl);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError") && !controller.signal.aborted) {
          setLoadedUrl(requestUrl);
          setErrorUrl(requestUrl);
        }
      }
    }

    async function loadTaxonomy<T>(url: string, setItems: (items: T[]) => void) {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const items: unknown = await response.json();
        if (!Array.isArray(items) || controller.signal.aborted) return;
        setItems(items as T[]);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError") && !controller.signal.aborted) {
          setItems([]);
        }
      }
    }

    void loadProducts();
    void loadTaxonomy<CategorySummary>("/api/catalog/categories", setCategories);
    void loadTaxonomy<BrandSummary>("/api/catalog/brands", setBrands);
    return () => controller.abort();
  }, [requestUrl]);

  const state = loadedUrl !== requestUrl ? "loading" : errorUrl === requestUrl ? "error" : "ready";

  if (loadedUrl !== requestUrl || state === "loading") return <p className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Cargando productos del catálogo…</p>;
  if (state === "error" || !pagination) return <p className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">No pudimos cargar el catálogo. Intentá nuevamente en unos minutos.</p>;

  const catalogHref = (nextPage: number) => {
    const next = new URLSearchParams(query);
    if (nextPage === 1) next.delete("page"); else next.set("page", String(nextPage));
    return `/catalogo${next.size ? `?${next}` : ""}`;
  };

  return <div className="grid gap-6 lg:grid-cols-[18rem_1fr] lg:items-start"><CatalogFilters brands={brands} categories={categories} featuredOnly={featuredOnly} selectedBrand={brand} selectedCategory={category} /><section className="space-y-5"><CatalogTopBar resultCount={data.length} totalCount={pagination.total} />{data.length ? <ProductGrid products={data} /> : <CatalogEmptyState />}{pagination.totalPages > 1 ? <nav aria-label="Paginación del catálogo" className="flex items-center justify-between gap-4"><span className="text-sm text-muted-foreground">Página {pagination.page} de {pagination.totalPages}</span><div className="flex gap-2">{pagination.hasPreviousPage ? <Link className="rounded-full border border-border px-3 py-2 text-sm font-semibold" href={catalogHref(pagination.page - 1)}>Anterior</Link> : null}{pagination.hasNextPage ? <Link className="rounded-full border border-border px-3 py-2 text-sm font-semibold" href={catalogHref(pagination.page + 1)}>Siguiente</Link> : null}</div></nav> : null}</section></div>;
}

function isProductList(value: unknown): value is PaginatedResult<ProductSummary> {
  return typeof value === "object" && value !== null && "data" in value && "pagination" in value && Array.isArray(value.data);
}
