import { createHash, randomUUID } from "node:crypto";

import type { CardToken, ProviderOrderEvidence } from "./contracts";
export type MercadoPagoOrderRequest = { idempotencyKey: string; externalReference: string; total: number; currency: "ARS"; payerEmail: string; card: CardToken };
export type MercadoPagoOrdersGateway = {
  createOrder(request: MercadoPagoOrderRequest): Promise<ProviderOrderEvidence>;
  getOrder(providerOrderId: string): Promise<ProviderOrderEvidence | undefined>;
  cancelOrder(providerOrderId: string, idempotencyKey: string): Promise<ProviderOrderActionResult>;
  refundOrder(providerOrderId: string, idempotencyKey: string): Promise<ProviderOrderActionResult>;
};
export type ProviderOrderActionResult = { id: string; status: string; updatedAt?: string };
type Fetch = (input: string, init: RequestInit) => Promise<Response>;
export type MercadoPagoProviderFailureCategory =
  | "authentication"
  | "authorization"
  | "not_found"
  | "validation"
  | "rate_limited"
  | "provider";

/** Safe provider-failure metadata suitable for support correlation. */
export type MercadoPagoProviderFailure = {
  status: number;
  category: MercadoPagoProviderFailureCategory;
  correlationId: string;
};

/**
 * Deliberately excludes the provider response body, provider codes, request IDs,
 * credentials, and resource IDs. Failed-response bodies are not read at all.
 */
export class MercadoPagoProviderError extends Error {
  readonly failure: MercadoPagoProviderFailure;

  constructor(failure: MercadoPagoProviderFailure) {
    super("MERCADO_PAGO_PROVIDER_FAILED");
    this.name = "MercadoPagoProviderError";
    this.failure = failure;
  }
}
export function createMercadoPagoOrdersGateway({ accessToken, fetch = globalThis.fetch }: { accessToken: string; fetch?: Fetch }): MercadoPagoOrdersGateway {
  if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN is required.");
  return {
    async createOrder(request) { const response = await fetch("https://api.mercadopago.com/v1/orders", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, "X-Idempotency-Key": request.idempotencyKey }, body: JSON.stringify({ type: "online", external_reference: request.externalReference, total_amount: String(request.total), processing_mode: "automatic", capture_mode: "automatic", payer: { email: request.payerEmail }, transactions: { payments: [{ amount: String(request.total), payment_method: { id: request.card.paymentMethodId, type: request.card.paymentType, token: request.card.cardToken, installments: request.card.installments } }] }, config: { online: { transaction_security: { validation: "on_fraud_risk", liability_shift: "required" } } } }) }); return parseOrder(response); },
    async getOrder(providerOrderId) { const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(providerOrderId)}`, { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } }); if (response.status === 404) return undefined; return parseOrder(response); },
    async cancelOrder(providerOrderId, idempotencyKey) { return parseAction(await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(providerOrderId)}/cancel`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, "X-Idempotency-Key": idempotencyKey }, body: "{}" })); },
    async refundOrder(providerOrderId, idempotencyKey) { return parseAction(await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(providerOrderId)}/refund`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "X-Idempotency-Key": idempotencyKey } })); },
  };
}
async function parseAction(response: Response): Promise<ProviderOrderActionResult> {
  if (!response.ok) throw providerFailure(response);
  const body = await responseBody(response);
  if (typeof body.id !== "string" || typeof body.status !== "string") throw new Error("MERCADO_PAGO_ORDER_ACTION_INVALID_RESPONSE");
  return { id: body.id, status: body.status, ...(typeof body.last_updated_date === "string" ? { updatedAt: body.last_updated_date } : {}) };
}

async function parseOrder(response: Response): Promise<ProviderOrderEvidence> {
  if (!response.ok) throw providerFailure(response);
  const body = await responseBody(response);
  const payments = body.transactions && typeof body.transactions === "object" ? (body.transactions as { payments?: unknown }).payments : undefined;
  const payment = Array.isArray(payments) ? payments[0] : undefined;
  if (typeof body.id !== "string" || typeof body.external_reference !== "string" || typeof body.status !== "string" || typeof body.status_detail !== "string" || typeof body.last_updated_date !== "string" || !payment || typeof payment !== "object") throw new Error("MERCADO_PAGO_ORDER_INVALID_RESPONSE");
  const p = payment as Record<string, unknown>;
  if (typeof p.id !== "string" || typeof p.status !== "string" || typeof p.status_detail !== "string") throw new Error("MERCADO_PAGO_ORDER_INVALID_RESPONSE");
  return { id: body.id, externalReference: body.external_reference, status: body.status, statusDetail: body.status_detail, updatedAt: body.last_updated_date, payment: { id: p.id, status: p.status, statusDetail: p.status_detail } };
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json();
    return body && typeof body === "object" ? body as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function providerFailure(response: Response): MercadoPagoProviderError {
  const category = providerFailureCategory(response.status);
  // The correlation code is opaque: it hashes an internal random nonce and never
  // reveals provider request identifiers or response content.
  const correlationId = `mpf_${createHash("sha256")
    .update(`${randomUUID()}:${response.status}:${category}`)
    .digest("hex")
    .slice(0, 16)}`;
  return new MercadoPagoProviderError({ status: response.status, category, correlationId });
}

function providerFailureCategory(status: number): MercadoPagoProviderFailureCategory {
  if (status === 401) return "authentication";
  if (status === 403) return "authorization";
  if (status === 404) return "not_found";
  if (status === 400 || status === 409 || status === 422) return "validation";
  if (status === 429) return "rate_limited";
  return "provider";
}
