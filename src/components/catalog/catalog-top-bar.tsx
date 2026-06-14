type CatalogTopBarProps = {
  resultCount: number;
  totalCount: number;
};

export function CatalogTopBar({ resultCount, totalCount }: CatalogTopBarProps) {
  const productLabel = resultCount === 1 ? "producto" : "productos";

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Mostrando <span className="font-semibold text-foreground">{resultCount}</span>{" "}
        {productLabel} de {totalCount} disponibles.
      </p>
      <div className="rounded-full border border-dashed border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Ordenamiento próximamente
      </div>
    </div>
  );
}
