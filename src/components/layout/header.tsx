import Link from "next/link";

import { Button } from "@/components/ui/button";

const navigationItems = [
  { label: "Productos", href: "/products" },
  { label: "Categorías", href: "/categories" },
  { label: "Destacados", href: "/featured" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label="Inicio de Verde Arena"
        >
          <span
            translate="no"
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-heading text-sm font-bold leading-none tracking-tight text-primary-foreground shadow-sm transition-colors group-hover:bg-secondary"
          >
            VA
          </span>
          <span
            translate="no"
            className="font-heading text-lg font-bold tracking-tight text-foreground"
          >
            Verde Arena
          </span>
        </Link>

        <nav
          className="hidden items-center gap-6 md:flex"
          aria-label="Navegación principal"
        >
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/products">Ver catálogo</Link>
        </Button>
      </div>
    </header>
  );
}
