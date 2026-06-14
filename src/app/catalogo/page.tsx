import { CatalogEmptyState } from "@/components/catalog/catalog-empty-state";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogTopBar } from "@/components/catalog/catalog-top-bar";
import { ProductGrid } from "@/components/catalog/product-grid";
import { getBrands, getCategories, getProducts } from "@/lib/catalog/queries";

type CatalogPageProps = {
  searchParams: Promise<{
    brand?: string;
    category?: string;
    featured?: string;
  }>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const categories = getCategories();
  const brands = getBrands();
  const products = getProducts();
  const featuredOnly = params.featured === "true";

  const filteredProducts = products.filter((product) => {
    const matchesCategory = params.category
      ? product.categorySlug === params.category
      : true;
    const matchesBrand = params.brand ? product.brandSlug === params.brand : true;
    const matchesFeatured = featuredOnly ? product.featured : true;

    return matchesCategory && matchesBrand && matchesFeatured;
  });

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Catálogo
          </p>
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Equipos preparados para tu próximo partido.
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            Explorá botines, camisetas, entrenamiento y accesorios con datos mock
            locales mientras preparamos la API real de productos.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[18rem_1fr] lg:items-start">
          <CatalogFilters
            brands={brands}
            categories={categories}
            featuredOnly={featuredOnly}
            selectedBrand={params.brand}
            selectedCategory={params.category}
          />

          <section className="space-y-5">
            <CatalogTopBar
              resultCount={filteredProducts.length}
              totalCount={products.length}
            />
            {filteredProducts.length > 0 ? (
              <ProductGrid products={filteredProducts} />
            ) : (
              <CatalogEmptyState />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
