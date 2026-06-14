import { ProductCard } from "@/components/catalog/product-card";
import type { ProductWithRelations } from "@/lib/catalog/types";

type ProductGridProps = {
  products: ProductWithRelations[];
};

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
