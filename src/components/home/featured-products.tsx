import Link from "next/link";

import { featuredProducts } from "@/components/home/home-data";

export function FeaturedProducts() {
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
          <Link href="/featured" className="text-sm font-semibold text-primary">
            Ver destacados
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {featuredProducts.map((product) => (
            <Link
              key={product.name}
              href={product.href}
              className="group rounded-3xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-1 hover:border-primary/40"
            >
              <div
                className={`relative h-64 overflow-hidden rounded-2xl ${product.palette}`}
              >
                <div className="absolute left-5 top-5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  {product.badge}
                </div>
                <div className="absolute inset-x-8 bottom-8 h-28 rounded-full border border-primary-foreground/45" />
                <div className="absolute bottom-10 left-1/2 h-32 w-4 -translate-x-1/2 rounded-full bg-primary-foreground/80" />
              </div>

              <div className="space-y-3 p-2 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {product.category}
                  </p>
                  <p className="font-semibold text-foreground">{product.price}</p>
                </div>
                <h3 className="font-heading text-xl font-semibold">
                  {product.name}
                </h3>
                <p className="text-sm font-semibold text-primary">Ver producto</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
