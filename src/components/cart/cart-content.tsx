"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-provider";

const formatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function CartContent() {
  const { items, removeItem, setQuantity, total } = useCart();
  if (items.length === 0) return <section className="rounded-3xl border border-dashed border-border bg-card p-8 text-center"><h1 className="font-heading text-3xl font-bold">Tu carrito está vacío</h1><p className="mt-3 text-muted-foreground">Elegí productos del catálogo para agregarlos acá.</p><Button asChild className="mt-6"><Link href="/catalogo">Ver catálogo</Link></Button></section>;
  return <div className="grid gap-6 lg:grid-cols-[1fr_20rem]"><section className="space-y-3">{items.map((item) => <article className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-5" key={item.lineId}><div><h2 className="font-heading text-xl font-bold">{item.name}</h2>{item.variant ? <p className="text-sm text-muted-foreground">{[item.variant.name, item.variant.size, item.variant.color].filter(Boolean).join(" · ")}</p> : null}<p className="mt-2 font-semibold">{formatter.format(item.price)}</p></div><div className="flex items-center gap-2"><Button aria-label={`Restar una unidad de ${item.name}`} onClick={() => setQuantity(item.lineId, item.quantity - 1)} size="icon" variant="outline">−</Button><span aria-label={`Cantidad de ${item.name}`} className="w-6 text-center font-semibold">{item.quantity}</span><Button aria-label={`Sumar una unidad de ${item.name}`} disabled={item.stock !== null && item.quantity >= item.stock} onClick={() => setQuantity(item.lineId, item.quantity + 1)} size="icon" variant="outline">+</Button><Button onClick={() => removeItem(item.lineId)} variant="ghost">Quitar</Button></div></article>)}</section><aside className="h-fit space-y-4 rounded-3xl border border-border bg-card p-5"><h2 className="font-heading text-2xl font-bold">Resumen</h2><div className="flex justify-between font-semibold"><span>Total</span><span>{formatter.format(total)}</span></div><p className="text-sm text-muted-foreground">El checkout se habilitará en una próxima fase.</p></aside></div>;
}
