import { CatalogApiContent } from "@/components/catalog/catalog-api-content";

type CatalogPageProps = {
  searchParams: Promise<{ brand?: string; category?: string; featured?: string; page?: string }>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Catálogo</p>
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">Equipos preparados para tu próximo partido.</h1>
          <p className="text-lg leading-8 text-muted-foreground">Explorá botines, camisetas, entrenamiento y accesorios disponibles para tu próximo partido.</p>
        </section>
        <CatalogApiContent brand={params.brand} category={params.category} featuredOnly={params.featured === "true"} page={params.page} />
      </div>
    </main>
  );
}
