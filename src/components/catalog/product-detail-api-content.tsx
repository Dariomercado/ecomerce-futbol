"use client";

import { useState } from "react";
import Link from "next/link";

import { MockCartCTA } from "@/components/catalog/mock-cart-cta";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { VariantSelector } from "@/components/catalog/variant-selector";
import type { ProductDetail, ProductVariantDto } from "@/lib/catalog/public-contracts";

const formatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function ProductDetailApiContent({ product }: { product: ProductDetail }) {
  const [variant, setVariant] = useState<ProductVariantDto | null>(null);
  const price = variant?.price ?? product.price;
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > price;

  return <main className="px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1fr] lg:items-start"><ProductGallery images={product.images} productName={product.name} /><section className="space-y-7"><Link className="text-sm font-semibold text-primary hover:underline" href="/catalogo">Volver al catálogo</Link><div className="space-y-4"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent-foreground">{product.brand.name}</span><span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{product.category.name}</span>{onSale ? <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground">Oferta</span> : null}</div><div className="space-y-3"><h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">{product.name}</h1><p className="max-w-2xl text-lg leading-8 text-muted-foreground">{product.description}</p></div><div className="flex items-end gap-3"><span className="font-heading text-4xl font-bold">{formatter.format(price)}</span>{onSale ? <span className="pb-1 text-lg text-muted-foreground line-through">{formatter.format(product.compareAtPrice ?? price)}</span> : null}</div></div><VariantSelector variants={product.activeVariants} onSelect={setVariant} /><MockCartCTA product={product} variant={variant} /></section></div></main>;
}
