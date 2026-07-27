import Link from "next/link";

import type {
  BrandSummary,
  CategorySummary,
} from "@/lib/catalog/public-contracts";

type CatalogFiltersProps = {
  brands: BrandSummary[];
  categories: CategorySummary[];
  selectedBrand?: string;
  selectedCategory?: string;
  featuredOnly: boolean;
};

const getFilterHref = (params: Record<string, string | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();

  return query ? `/catalogo?${query}` : "/catalogo";
};

function FilterLink({
  active,
  children,
  href,
}: {
  active: boolean;
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className={
        active
          ? "rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          : "rounded-full border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-foreground"
      }
      href={href}
    >
      {children}
    </Link>
  );
}

function FilterContent({
  brands,
  categories,
  selectedBrand,
  selectedCategory,
  featuredOnly,
}: CatalogFiltersProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Categoría
        </h2>
        <div className="flex flex-wrap gap-2 lg:flex-col">
          <FilterLink active={!selectedCategory} href={getFilterHref({ brand: selectedBrand, featured: featuredOnly ? "true" : undefined })}>
            Todas
          </FilterLink>
          {categories.map((category) => (
            <FilterLink
              key={category.id}
              active={selectedCategory === category.slug}
              href={getFilterHref({
                category: category.slug,
                brand: selectedBrand,
                featured: featuredOnly ? "true" : undefined,
              })}
            >
              {category.name}
            </FilterLink>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Marca
        </h2>
        <div className="flex flex-wrap gap-2 lg:flex-col">
          <FilterLink active={!selectedBrand} href={getFilterHref({ category: selectedCategory, featured: featuredOnly ? "true" : undefined })}>
            Todas
          </FilterLink>
          {brands.map((brand) => (
            <FilterLink
              key={brand.id}
              active={selectedBrand === brand.slug}
              href={getFilterHref({
                category: selectedCategory,
                brand: brand.slug,
                featured: featuredOnly ? "true" : undefined,
              })}
            >
              {brand.name}
            </FilterLink>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Destacados
        </h2>
        <div className="flex flex-wrap gap-2 lg:flex-col">
          <FilterLink
            active={featuredOnly}
            href={getFilterHref({
              category: selectedCategory,
              brand: selectedBrand,
              featured: featuredOnly ? undefined : "true",
            })}
          >
            Solo destacados
          </FilterLink>
        </div>
      </div>
    </div>
  );
}

export function CatalogFilters(props: CatalogFiltersProps) {
  return (
    <aside className="space-y-4">
      <div className="hidden rounded-3xl border border-border bg-card p-5 lg:block">
        <FilterContent {...props} />
      </div>

      <details className="rounded-3xl border border-border bg-card p-5 lg:hidden">
        <summary className="cursor-pointer font-heading text-lg font-bold">
          Filtrar productos
        </summary>
        <div className="mt-5">
          <FilterContent {...props} />
        </div>
      </details>
    </aside>
  );
}
