"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CatalogImage } from "@/components/catalog/catalog-image";
import type { ProductSummary } from "@/lib/catalog/public-contracts";

const featuredProductsUrl = "/api/catalog/featured-products";

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function FeaturedProducts() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "success">(
    "loading",
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadFeaturedProducts() {
      try {
        const response = await fetch(featuredProductsUrl, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Featured products request failed.");
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Featured products response was invalid.");
        }

        setProducts(data as ProductSummary[]);
        setStatus("success");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setStatus("error");
      }
    }

    void loadFeaturedProducts();

    return () => controller.abort();
  }, []);

  return (
    <section className="bg-surface/60 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Destacados
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Esenciales elegidos para llegar listo al partido.
            </h2>
          </div>
          <Link href="/catalogo?featured=true" className="text-sm font-semibold text-primary">
            Ver destacados
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {status === "loading"
            ? Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  aria-label="Cargando productos destacados"
                  className="animate-pulse rounded-3xl border border-border bg-card p-4"
                >
                  <div className="h-64 rounded-2xl bg-muted" />
                  <div className="space-y-3 p-2 pt-4">
                    <div className="h-4 w-2/3 rounded bg-muted" />
                    <div className="h-6 w-4/5 rounded bg-muted" />
                  </div>
                </div>
              ))
            : null}

          {status === "error" ? (
            <p className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground md:col-span-3">
              No pudimos cargar los productos destacados. Intentá nuevamente en unos minutos.
            </p>
          ) : null}

          {status === "success" && products.length === 0 ? (
            <p className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground md:col-span-3">
              No hay productos destacados disponibles por el momento.
            </p>
          ) : null}

          {status === "success"
            ? products.map((product) => (
                <Link
                  key={product.id}
                  href="/catalogo?featured=true"
                  className="group rounded-3xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-1 hover:border-primary/40"
                >
                  <div className="relative h-64 overflow-hidden rounded-2xl bg-surface">
                    <CatalogImage
                      alt={product.primaryImage?.alt ?? product.name}
                      className="object-cover transition duration-300 group-hover:scale-105"
                      fallbackLabel={product.name}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      src={product.primaryImage?.url}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/55 to-transparent" />
                    <div className="absolute left-5 top-5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                      {product.brand.name}
                    </div>
                  </div>

                  <div className="space-y-3 p-2 pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        {product.category.name}
                      </p>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {priceFormatter.format(product.price)}
                        </p>
                        {product.compareAtPrice !== null &&
                        product.compareAtPrice > product.price ? (
                          <p className="text-xs text-muted-foreground line-through">
                            {priceFormatter.format(product.compareAtPrice)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <h3 className="font-heading text-xl font-semibold">
                      {product.name}
                    </h3>
                    <p className="text-sm font-semibold text-primary">Ver producto</p>
                  </div>
                </Link>
              ))
            : null}
        </div>
      </div>
    </section>
  );
}
