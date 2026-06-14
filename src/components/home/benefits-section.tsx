import { benefits } from "@/components/home/home-data";

export function BenefitsSection() {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Por qué Verde Arena
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Una experiencia clara para encontrar tu próximo equipo.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => (
            <article
              key={benefit.title}
              className="rounded-3xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-4 size-10 rounded-full bg-accent" />
              <h3 className="font-heading text-lg font-semibold">
                {benefit.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
