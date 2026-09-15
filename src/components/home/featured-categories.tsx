import Link from "next/link";

import { CatalogImage } from "@/components/catalog/catalog-image";
import { featuredCategories } from "@/components/home/home-data";

export function FeaturedCategories() {
  return (
    <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary sm:text-sm sm:tracking-[0.2em]">
            Elige por necesidad
          </p>
          <h2 className="text-balance font-heading text-2xl font-bold tracking-tight sm:text-4xl">
            Elige el punto de partida para tu próximo partido.
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {featuredCategories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="relative h-32 overflow-hidden bg-surface">
                <CatalogImage
                  alt={category.imageAlt}
                  className="object-cover transition duration-300 group-hover:scale-105"
                  fallbackLabel={category.name}
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  src={category.imageUrl}
                />
                <div aria-hidden className={`absolute inset-0 bg-gradient-to-br ${category.accent} opacity-25`} />
              </div>
              <div className="space-y-2 p-4 sm:space-y-3 sm:p-5">
                <h3 className="font-heading text-lg font-semibold sm:text-xl">
                  {category.name}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {category.description}
                </p>
                <p className="text-sm font-semibold text-primary">
                  Explorar {category.name.toLowerCase()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
