"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-provider";

type CheckoutResult = { order: { id: string; total: number } };
type CheckoutError = { message: string };

export default function CheckoutPage() {
  const { items, total } = useCart();
  const [message, setMessage] = useState<string | null>(null);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/checkout/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: { fullName: formData.get("fullName"), email: formData.get("email"), phone: formData.get("phone") },
          shippingAddress: { addressLine1: formData.get("addressLine1"), addressLine2: formData.get("addressLine2") || undefined, city: formData.get("city"), province: formData.get("province"), postalCode: formData.get("postalCode") },
          lines: items.map((item) => ({ productId: item.id, variantId: item.variant?.id ?? null, quantity: item.quantity })),
        }),
      });
      const body = await response.json() as CheckoutResult | CheckoutError;
      setMessage(response.ok && "order" in body ? `Pedido ${body.order.id} registrado por $${body.order.total.toLocaleString("es-AR")}.` : ("message" in body ? body.message : "No pudimos iniciar el pedido."));
    } catch {
      setMessage("No pudimos procesar el pedido. Intentá nuevamente.");
    }
  }

  if (items.length === 0) return <main className="mx-auto w-full max-w-3xl px-4 py-10"><h1 className="font-heading text-4xl font-bold">Checkout</h1><p className="mt-4 text-muted-foreground">Tu carrito está vacío.</p><Button asChild className="mt-6"><Link href="/catalogo">Ver catálogo</Link></Button></main>;
  return <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Compra como invitado</p><h1 className="mt-2 font-heading text-4xl font-bold">Checkout</h1><p className="mt-3 text-muted-foreground">No necesitás una cuenta para completar tus datos de entrega.</p><form className="mt-8 grid gap-4 rounded-3xl border border-border bg-card p-6" onSubmit={submitOrder}><label>Nombre completo<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="fullName" required /></label><label>Email<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="email" required type="email" /></label><label>Teléfono<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="phone" required /></label><label>Dirección<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="addressLine1" required /></label><label>Departamento, piso o referencia<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="addressLine2" /></label><div className="grid gap-4 sm:grid-cols-3"><label>Ciudad<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="city" required /></label><label>Provincia<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="province" required /></label><label>Código postal<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="postalCode" required /></label></div><div className="flex items-center justify-between border-t border-border pt-4"><span className="font-semibold">Total a verificar</span><span className="font-semibold">${total.toLocaleString("es-AR")}</span></div><p className="text-sm text-muted-foreground">El total final se calcula nuevamente con el catálogo en el servidor. </p><Button type="submit">Continuar con el pedido</Button>{message ? <p aria-live="polite" className="text-sm">{message}</p> : null}</form></main>;
}
