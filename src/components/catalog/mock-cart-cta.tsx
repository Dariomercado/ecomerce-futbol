"use client";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-provider";
import type { ProductDetail, ProductVariantDto } from "@/lib/catalog/public-contracts";

type CartCTAProps = { product: ProductDetail; variant: ProductVariantDto | null };

export function MockCartCTA({ product, variant }: CartCTAProps) {
  const { addItem } = useCart();
  const requiresVariant = product.activeVariants.length > 0;
  const unavailable = variant !== null && variant.stock < 1;
  const disabled = (requiresVariant && variant === null) || unavailable;
  return <div className="space-y-3 rounded-3xl border border-border bg-card p-5"><Button className="h-11 w-full" disabled={disabled} onClick={() => addItem({ id: product.id, slug: product.slug, name: product.name, currency: product.currency, price: variant?.price ?? product.price, stock: variant?.stock ?? null, variant: variant ? { id: variant.id, name: variant.name, size: variant.size, color: variant.color } : null })} size="lg" type="button">Agregar al carrito</Button><p className="text-center text-sm text-muted-foreground">{requiresVariant && variant === null ? "Seleccioná una variante para continuar." : unavailable ? "Esta variante no tiene stock disponible." : "Tu selección se guarda solo durante esta sesión."}</p></div>;
}
