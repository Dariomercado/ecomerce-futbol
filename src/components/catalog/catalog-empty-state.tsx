type CatalogEmptyStateProps = {
  title?: string;
  description?: string;
};

export function CatalogEmptyState({
  title = "No encontramos productos para esta búsqueda.",
  description = "Probá limpiar los filtros o volver al catálogo completo.",
}: CatalogEmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <div className="mx-auto mb-5 size-12 rounded-full bg-accent" />
      <h2 className="font-heading text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
