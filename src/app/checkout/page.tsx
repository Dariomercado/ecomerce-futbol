"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MercadoPagoCardForm, type ThreeDSChallenge } from "@/components/checkout/mercado-pago-card-form";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-provider";
import type { CardToken, PaymentResult } from "@/lib/payments/contracts";

type CreatedOrder = { order: { id: string; total: number }; statusCapability: string };
type PaymentConfig = { enabled: boolean; publicKey?: string };
type CheckoutError = { message: string };
type PaymentIntent = { id: string; token: string };

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [threeDSChallenge, setThreeDSChallenge] = useState<ThreeDSChallenge | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const paymentIntent = useRef<PaymentIntent | null>(null);

  async function refreshOrderStatus() {
    if (!createdOrder) return;
      const response = await fetch(`/api/checkout/orders/${createdOrder.order.id}/status`, { headers: { "x-checkout-status-capability": createdOrder.statusCapability } });
      if (!response.ok) return;
      const status = (await response.json() as { order?: { status?: string } }).order?.status;
      if (status === "PAID" || status === "PAYMENT_FAILED") setPollingEnabled(false);
      else if (status === "PAYMENT_PENDING") setPollingEnabled(true);
      if (status === "PAID") {
        clearCart();
        router.replace(`/checkout/success?orderId=${encodeURIComponent(createdOrder.order.id)}&total=${createdOrder.order.total}`);
      }
      else if (status === "PAYMENT_FAILED") setMessage("El pago fue rechazado. Podés intentar con otra tarjeta.");
      else if (status === "PAYMENT_PENDING") setMessage("El pago está pendiente. Verificaremos nuevamente en unos segundos.");
  }

  useEffect(() => {
    if (!createdOrder || !pollingEnabled) return;
    const interval = window.setInterval(() => { void refreshOrderStatus(); }, 3000);
    return () => window.clearInterval(interval);
  }, [createdOrder, pollingEnabled]);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createdOrder || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
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
      const body = await response.json() as CreatedOrder | CheckoutError;
      if (!response.ok || !("order" in body)) {
        setMessage("message" in body ? body.message : "No pudimos iniciar el pedido.");
        return;
      }

      const configResponse = await fetch("/api/checkout/config");
      const config = await configResponse.json() as PaymentConfig;
      if (!configResponse.ok || !config.enabled || !config.publicKey) {
        setMessage(`Pedido ${body.order.id} registrado. Los pagos con tarjeta no están disponibles en este momento.`);
        return;
      }

      // Bind payment submission to the server-issued order capability. The
      // intent id remains client-generated for idempotency, but its token must
      // be verifiable against the persisted order capability hash.
      paymentIntent.current = { id: crypto.randomUUID(), token: body.statusCapability };
      setCreatedOrder(body);
      setPaymentConfig(config);
      setMessage(`Pedido ${body.order.id} registrado. Ingresá tu tarjeta para continuar.`);
    } catch {
      setMessage("No pudimos procesar el pedido. Intentá nuevamente.");
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  async function submitTokenizedPayment(card: CardToken) {
    const intent = paymentIntent.current;
    if (!createdOrder || !intent) return;

    try {
      const response = await fetch(`/api/checkout/orders/${createdOrder.order.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId: intent.id, intentToken: intent.token, card }),
      });
      const result = await response.json() as PaymentResult | CheckoutError;
      if (!response.ok || !("kind" in result)) {
        setMessage("message" in result ? result.message : "No pudimos procesar el pago.");
        return;
      }
      if (result.kind === "action_required") {
        setThreeDSChallenge(result.challenge);
        setMessage("Tu banco requiere una autenticación adicional.");
        return;
      }

      if (result.kind === "paid") {
        setPollingEnabled(false);
        clearCart();
        router.replace(`/checkout/success?orderId=${encodeURIComponent(createdOrder.order.id)}&total=${createdOrder.order.total}`);
      } else if (result.kind === "pending") { setPollingEnabled(true); setMessage("El pago está pendiente. Verificaremos automáticamente su estado."); void refreshOrderStatus(); } else setMessage("Recibimos la respuesta del pago. Confirmaremos su estado con Mercado Pago.");
    } catch {
      setMessage("No pudimos procesar el pago. Intentá nuevamente.");
    }
  }

  if (items.length === 0) return <main className="mx-auto w-full max-w-3xl px-4 py-10"><h1 className="font-heading text-4xl font-bold">Checkout</h1><p className="mt-4 text-muted-foreground">Tu carrito está vacío.</p><Button asChild className="mt-6"><Link href="/catalogo">Ver catálogo</Link></Button></main>;
  return <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Compra como invitado</p><h1 className="mt-2 font-heading text-4xl font-bold">Checkout</h1><p className="mt-3 text-muted-foreground">No necesitás una cuenta para completar tus datos de entrega.</p><form className="mt-8 grid gap-4 rounded-3xl border border-border bg-card p-6" onSubmit={submitOrder}><label>Nombre completo<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="fullName" required /></label><label>Email<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="email" required type="email" /></label><label>Teléfono<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="phone" required /></label><label>Dirección<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="addressLine1" required /></label><label>Departamento, piso o referencia<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="addressLine2" /></label><div className="grid gap-4 sm:grid-cols-3"><label>Ciudad<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="city" required /></label><label>Provincia<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="province" required /></label><label>Código postal<input className="mt-1 w-full rounded-md border border-input bg-background p-2" name="postalCode" required /></label></div><div className="flex items-center justify-between border-t border-border pt-4"><span className="font-semibold">Total a verificar</span><span className="font-semibold">${total.toLocaleString("es-AR")}</span></div><p className="text-sm text-muted-foreground">El total final se calcula nuevamente con el catálogo en el servidor.</p><Button type="submit" disabled={isSubmittingOrder || Boolean(createdOrder)}>{createdOrder ? "Pedido registrado" : isSubmittingOrder ? "Registrando pedido…" : "Continuar con el pedido"}</Button>{message ? <p aria-live="polite" className="text-sm">{message}</p> : null}</form>{createdOrder && paymentConfig?.publicKey ? <section className="mt-6 rounded-3xl border border-border bg-card p-6"><h2 className="font-heading text-2xl font-bold">Pago con tarjeta</h2><p className="mt-2 text-sm text-muted-foreground">Los datos de tu tarjeta se completan de forma segura con Mercado Pago.</p><MercadoPagoCardForm amount={createdOrder.order.total} onThreeDSClose={(reason) => { setThreeDSChallenge(null); if (reason === "expired") setMessage("La autenticación 3DS venció. Intentá nuevamente."); if (reason === "closed") setMessage("La autenticación 3DS fue cancelada. Podés intentar nuevamente."); }} onThreeDSComplete={() => setMessage("La autenticación 3DS fue recibida. Confirmaremos el estado con Mercado Pago.")} onTokenizationError={setMessage} onTokenized={submitTokenizedPayment} publicKey={paymentConfig.publicKey} threeDSChallenge={threeDSChallenge} />{createdOrder ? <Button type="button" variant="outline" onClick={() => void refreshOrderStatus()}>Verificar estado del pago</Button> : null}</section> : null}</main>;
}
