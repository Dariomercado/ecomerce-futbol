import Link from "next/link";

import { CatalogImage } from "@/components/catalog/catalog-image";
import type { ProductSummary } from "@/lib/catalog/public-contracts";

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

type ProductCardProps = {
  product: ProductSummary;
};

const isOnSale = (product: ProductSummary) =>
  product.compareAtPrice !== null && product.compareAtPrice > product.price;

export function ProductCard({ product }: ProductCardProps) {
  const onSale = isOnSale(product);

  return (
    <article className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <Link
        href={`/productos/${product.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-surface">
          <CatalogImage
            alt={product.primaryImage?.alt ?? product.name}
            className="object-cover transition duration-300 group-hover:scale-105"
            fallbackLabel={product.name}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            src={product.primaryImage?.url}
          />
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
