"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-provider";

const formatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function CartContent() {
  const { items, removeItem, setQuantity, total } = useCart();
  if (items.length === 0) return <section className="rounded-3xl border border-dashed border-border bg-card p-8 text-center"><h1 className="font-heading text-3xl font-bold">Your cart is empty</h1><p className="mt-3 text-muted-foreground">Choose products from the catalog to add them here.</p><Button asChild className="mt-6"><Link href="/catalogo">View catalog</Link></Button></section>;
  return <div className="grid gap-6 lg:grid-cols-[1fr_20rem]"><section className="space-y-3">{items.map((item) => <article className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-5" key={item.lineId}><div><h2 className="font-heading text-xl font-bold">{item.name}</h2>{item.variant ? <p className="text-sm text-muted-foreground">{[item.variant.name, item.variant.size, item.variant.color].filter(Boolean).join(" / ")}</p> : null}<p className="mt-2 font-semibold">{formatter.format(item.price)}</p></div><div className="flex items-center gap-2"><Button aria-label={`Decrease quantity for ${item.name}`} onClick={() => setQuantity(item.lineId, item.quantity - 1)} size="icon" variant="outline">-</Button><span aria-label={`Quantity for ${item.name}`} className="w-6 text-center font-semibold">{item.quantity}</span><Button aria-label={`Increase quantity for ${item.name}`} disabled={item.stock !== null && item.quantity >= item.stock} onClick={() => setQuantity(item.lineId, item.quantity + 1)} size="icon" variant="outline">+</Button><Button onClick={() => removeItem(item.lineId)} variant="ghost">Remove</Button></div></article>)}</section><aside className="h-fit space-y-4 rounded-3xl border border-border bg-card p-5"><h2 className="font-heading text-2xl font-bold">Summary</h2><div className="flex items-center justify-between border-t border-border pt-4"><span>Total</span><span className="font-semibold">{formatter.format(total)}</span></div><Button asChild className="w-full"><Link href="/checkout">Checkout</Link></Button></aside></div>;
}
