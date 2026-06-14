import { Button } from "@/components/ui/button";

export function NewsletterSection() {
  return (
    <section className="px-4 pb-14 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 rounded-[2rem] border border-border bg-surface p-7 md:grid-cols-[1fr_0.9fr] md:items-center md:p-9">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Novedades
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight">
            Enterate primero de nuevas colecciones y productos destacados.
          </h2>
          <p className="leading-7 text-muted-foreground">
            Dejá tu correo para recibir novedades cuando habilitemos lanzamientos,
            promociones y nuevas colecciones.
          </p>
        </div>

        <form className="flex flex-col gap-3 sm:flex-row" action="#">
          <input
            type="email"
            aria-label="Correo electrónico"
            placeholder="tu@email.com"
            className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button type="button" size="lg" className="h-11 px-5">
            Avisarme
          </Button>
        </form>
      </div>
    </section>
  );
}
