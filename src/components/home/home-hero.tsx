import Link from "next/link";

import { CatalogImage } from "@/components/catalog/catalog-image";
import { Button } from "@/components/ui/button";

export function HomeHero() {
  return (
    <section className="overflow-hidden bg-surface/60 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-10">
        <div className="min-w-0 max-w-3xl space-y-6">
          <div className="inline-flex max-w-full rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm sm:px-4 sm:text-sm">
            Preparado para competir. Diseñado para el juego.
          </div>

          <div className="space-y-4 sm:space-y-5">
            <h1 className="max-w-full text-pretty break-words font-heading text-3xl font-bold tracking-tight text-foreground min-[420px]:text-4xl sm:text-6xl lg:text-7xl">
              Fútbol con actitud de partido.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Verde Arena reúne esenciales modernos con criterio premium,
              información clara y una experiencia pensada primero para el juego.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 px-5">
              <Link href="/catalogo">Ver catálogo</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-5">
              <Link href="/catalogo?featured=true">Explorar destacados</Link>
            </Button>
          </div>
        </div>

        <div className="relative min-h-[320px] min-w-0 overflow-hidden rounded-[1.75rem] border border-border bg-background p-3 shadow-sm sm:min-h-[360px] sm:rounded-[2rem] sm:p-4">
          <CatalogImage
            alt="Tienda Verde Arena con indumentaria y accesorios de fútbol"
            className="object-cover"
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            src="/catalog/hero/football-store.png"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/35 to-transparent" />

          <div className="relative z-10 flex h-full min-h-[296px] min-w-0 flex-col justify-between rounded-[1.5rem] p-5 text-primary-foreground sm:min-h-[328px] sm:p-8">
            <div className="w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-foreground sm:tracking-[0.2em]">
              Nueva selección
            </div>

            <div className="max-w-sm space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent sm:text-sm sm:tracking-[0.25em]">
                Curaduría Verde Arena
              </p>
              <h2 className="text-pretty break-words font-heading text-xl font-bold tracking-tight min-[420px]:text-2xl sm:text-4xl">
                Camisetas, botines y foco total en la cancha.
              </h2>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
