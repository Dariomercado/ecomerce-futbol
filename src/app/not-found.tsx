import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="flex min-h-[calc(100dvh-8rem)] items-center justify-center bg-surface/60 px-4 py-20 text-center sm:px-6 lg:px-8">
      <div className="max-w-2xl space-y-6 rounded-3xl border border-border bg-background p-8 shadow-sm sm:p-12">
        <p className="font-heading text-sm font-semibold uppercase tracking-[0.3em] text-primary">
          404
        </p>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          This route is off the pitch.
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          The Verde Arena storefront is still in foundation mode. Catalog,
          checkout, account, and backend routes are intentionally deferred.
        </p>
        <Button asChild>
          <Link href="/">Return to Verde Arena</Link>
        </Button>
      </div>
    </section>
  );
}