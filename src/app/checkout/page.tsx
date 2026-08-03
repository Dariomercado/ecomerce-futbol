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
    try {
      const formData = new FormData(event.currentTarget);
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
      setMessage(response.ok && "order" in body ? `Order ${body.order.id} registered for $${body.order.total.toLocaleString("es-AR")}.` : (isCheckoutError(body) ? body.message : "We could not start the order."));
    } catch {
      setMessage("No pudimos iniciar el pedido. Verifica tu conexion e intenta nuevamente.");
    }
  }

  if (items.length === 0) return <main className="mx-auto w-full max-w-3xl px-4 py-10"><h1 className="font-heading text-4xl font-bold">Checkout</h1><p className="mt-4 text-muted-foreground">Your cart is empty.</p><Button asChild className="mt-6"><Link href="/catalogo">View catalog</Link></Button></main>;
  return <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Guest checkout</p><h1 className="mt-2 font-heading text-4xl font-bold">Checkout</h1><p className="mt-3 text-muted-foreground">No account is required to provide delivery details.</p><form className="mt-8 grid gap-4 rounded-3xl border border-border bg-card p-6" onSubmit={submitOrder}><label>Full name<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="fullName" required /></label><label>Email<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="email" required type="email" /></label><label>Phone<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="phone" required /></label><label>Address<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="addressLine1" required /></label><label>Apartment, floor, or reference<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="addressLine2" /></label><div className="grid gap-4 sm:grid-cols-3"><label>City<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="city" required /></label><label>Province<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="province" required /></label><label>Postal code<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="postalCode" required /></label></div><div className="flex items-center justify-between border-t border-border pt-4"><span className="font-semibold">Total to verify</span><span className="font-semibold">${total.toLocaleString("es-AR")}</span></div><p className="text-sm text-muted-foreground">The final total is recalculated from the server catalog.</p><Button type="submit">Continue order</Button>{message ? <p aria-live="polite" className="text-sm">{message}</p> : null}</form></main>;
}

function isCheckoutError(body: CheckoutResult | CheckoutError): body is CheckoutError {
  return typeof body === "object" && body !== null && "message" in body && typeof body.message === "string";
}
