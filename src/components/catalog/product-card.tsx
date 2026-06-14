import Link from "next/link";

import type { ProductWithRelations } from "@/lib/catalog/types";

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

type ProductCardProps = {
  product: ProductWithRelations;
};

const getPrimaryImage = (product: ProductWithRelations) =>
  product.images.find((image) => image.isPrimary) ?? product.images[0];

const isOnSale = (product: ProductWithRelations) =>
  product.compareAtPrice !== null && product.compareAtPrice > product.price;

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = getPrimaryImage(product);
  const onSale = isOnSale(product);

  return (
    <article className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <Link
        href={`/productos/${product.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-surface">
          <div
            aria-label={primaryImage?.alt ?? product.name}
            className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.18),transparent_35%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--surface)))] text-center"
            role="img"
          >
            <span className="px-6 font-heading text-lg font-bold text-muted-foreground/70 transition group-hover:scale-105">
              {product.name}
            </span>
          </div>
          {onSale ? (
            <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground">
              Oferta
            </span>
          ) : null}
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {product.brand.name}
            </p>
            <h3 className="font-heading text-xl font-bold tracking-tight text-card-foreground">
              {product.name}
            </h3>
            <p className="text-sm text-muted-foreground">{product.category.name}</p>
          </div>

          <div className="flex items-end gap-3">
            <span className="font-heading text-2xl font-bold">
              {priceFormatter.format(product.price)}
            </span>
            {onSale ? (
              <span className="pb-0.5 text-sm text-muted-foreground line-through">
                {priceFormatter.format(product.compareAtPrice ?? product.price)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
