"use client";

import { useState } from "react";

import type { ProductVariantDto } from "@/lib/catalog/public-contracts";

type VariantSelectorProps = {
  variants: ProductVariantDto[];
  onSelect: (variant: ProductVariantDto | null) => void;
};

export function VariantSelector({ variants, onSelect }: VariantSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (variants.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-bold">Variantes disponibles</h2>
        <p className="text-sm text-muted-foreground">
          Seleccioná una variante para ver su precio. Todavía no reserva stock.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {variants.map((variant) => {
          const selected = selectedId === variant.id;
          const available = variant.stock > 0;
          return (
            <button
              aria-pressed={selected}
              className={selected ? "rounded-2xl border-2 border-primary bg-card p-4 text-left" : "rounded-2xl border border-border bg-card p-4 text-left"}
              key={variant.id}
              onClick={() => {
                const next = selected ? null : variant;
                setSelectedId(next?.id ?? null);
                onSelect(next);
              }}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{variant.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[variant.size, variant.color, variant.surface].filter(Boolean).join(" / ")}
                  </p>
                </div>
                <span className={available ? "rounded-full bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground" : "rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground"}>
                  {available ? "Disponible" : "Sin stock"}
                </span>
              </div>
              {variant.price !== null ? <p className="mt-3 text-sm font-semibold">Precio especial por variante</p> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
