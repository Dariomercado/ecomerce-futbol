"use client";

import { Suspense } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const total = Number(params.get("total"));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Pago confirmado</p>
      <h1 className="mt-3 font-heading text-4xl font-bold">Gracias por tu compra</h1>
      <p className="mt-4 text-muted-foreground">Tu pago fue aprobado y tu pedido quedó registrado.</p>
      {orderId ? <p className="mt-6 text-sm">Pedido: <strong>{orderId}</strong></p> : null}
      {Number.isFinite(total) && total > 0 ? <p className="mt-2 text-sm">Total: <strong>${total.toLocaleString("es-AR")}</strong></p> : null}
      <Button asChild className="mt-8"><Link href="/catalogo">Volver al catálogo</Link></Button>
    </main>
  );
}
