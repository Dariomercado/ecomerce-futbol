export function BrandStatement() {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] border border-border bg-premium p-7 text-primary-foreground md:grid-cols-[1fr_0.8fr] md:p-10">
        <div className="max-w-3xl space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">
            El juego primero
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-5xl">
            Una tienda de fútbol debe sentirse como fútbol antes que como un
            catálogo genérico.
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
          {["Criterio premium", "Claridad comercial", "Foco en el partido"].map(
            (item) => (
              <div
                key={item}
                className="rounded-2xl border border-accent/30 bg-primary-foreground/10 p-4 text-sm font-semibold"
              >
                {item}
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
