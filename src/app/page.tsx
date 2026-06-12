import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <section className="flex min-h-[calc(100dvh-8rem)] items-center bg-surface/60 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-3xl space-y-8">
          <div className="inline-flex rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
            New matchday essentials
          </div>

          <div className="space-y-5">
            <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Gear built for the match, designed for the game.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Verde Arena is setting up a curated football ecommerce experience
              with premium restraint, sport-first visuals, and clear product
              foundations.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/products">Shop the catalog</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/featured">Explore featured gear</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-background p-8 shadow-sm">
          <div className="space-y-6 rounded-2xl bg-premium p-8 text-primary-foreground">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-accent">
              Foundation phase
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight">
              Visual system first. Commerce features later.
            </h2>
            <p className="leading-7 text-primary-foreground/75">
              This temporary landing replaces the default Next.js screen while
              the design system, layout, and brand structure are established.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}