"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-provider";

const navigationItems = [
  { label: "Catálogo", href: "/catalogo" },
  { label: "Botines", href: "/catalogo?category=botines" },
  { label: "Destacados", href: "/catalogo?featured=true" },
];

export function Header() {
  const { itemCount } = useCart();
  return <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75"><div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="Verde Arena home"><span translate="no" aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-heading text-sm font-bold leading-none tracking-tight text-primary-foreground shadow-sm transition-colors group-hover:bg-secondary">VA</span><span translate="no" className="hidden font-heading text-lg font-bold tracking-tight text-foreground sm:inline">Verde Arena</span></Link><nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">{navigationItems.map((item) => <Link key={item.href} href={item.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{item.label}</Link>)}</nav><div className="flex shrink-0 items-center gap-1 sm:gap-2"><Button asChild size="sm" variant="ghost"><Link href="/auth/sign-in">Sign in</Link></Button><Button asChild size="sm" variant="ghost"><Link href="/admin">Admin</Link></Button><Button asChild size="sm" className="hidden sm:inline-flex"><Link href="/carrito">Carrito{itemCount > 0 ? ` (${itemCount})` : ""}</Link></Button></div></div></header>;
}
