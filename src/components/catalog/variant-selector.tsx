import type { ProductVariant } from "@/lib/catalog/types";

type VariantSelectorProps = {
  variants: ProductVariant[];
};

export function VariantSelector({ variants }: VariantSelectorProps) {
  if (variants.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-bold">Variantes disponibles</h2>
        <p className="text-sm text-muted-foreground">
          Selección visual preparada para una próxima fase. Todavía no reserva stock.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {variants.map((variant) => {
          const isAvailable = variant.stock > 0;

          return (
            <div
              className="rounded-2xl border border-border bg-card p-4"
              key={variant.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{variant.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[variant.size, variant.color, variant.surface]
                      .filter(Boolean)
                      .join(" / ")}
                  </p>
                </div>
                <span
                  className={
                    isAvailable
                      ? "rounded-full bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground"
                      : "rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground"
                  }
                >
                  {isAvailable ? "Disponible" : "Sin stock"}
                </span>
              </div>
              {variant.price ? (
                <p className="mt-3 text-sm font-semibold">
                  Precio especial por variante
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
