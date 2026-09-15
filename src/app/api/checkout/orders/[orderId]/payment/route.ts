import { NextResponse } from "next/server";

import { matchesStatusCapability, rejectRawCardData } from "@/lib/checkout/contracts";
import { createPrismaPaymentRepository } from "@/lib/checkout/order-repository";
import { loadPaymentConfig } from "@/lib/payments/config";
import { createMercadoPagoOrdersGateway } from "@/lib/payments/mercado-pago-orders-gateway";
import { submitPayment } from "@/lib/payments/service";
import { prisma } from "@/lib/prisma";
import type { PaymentResult, SafeCode } from "@/lib/payments/contracts";

export const runtime = "nodejs";

type PaymentRouteContext = { params: Promise<{ orderId: string }> };
type PaymentRequest = {
  intentId: string;
  intentToken: string;
  card: {
    cardToken: string;
    paymentMethodId: string;
    paymentType: "credit_card" | "debit_card";
    installments: number;
    issuerId?: string;
  };
};

export async function POST(request: Request, { params }: PaymentRouteContext) {
  const body = await parseBody(request);
  if (!body || rejectRawCardData(body)) return invalidIntent();

  const { orderId } = await params;
  if (!isUuid(orderId) || !isPaymentRequest(body)) return invalidIntent();

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, currency: true, total: true, contactEmail: true, statusCapabilityHash: true },
    });
    if (!order) return notFound();
    // The payment intent token is server-bound to the capability issued when the
    // order was created. Never accept a client-generated token for an order.
    if (!matchesStatusCapability(body.intentToken, order.statusCapabilityHash)) return invalidIntent();
    if (order.status !== "PENDING_CONFIRMATION" && order.status !== "PAYMENT_PENDING") return declined();

    const config = loadPaymentConfig();
    const gateway = config.accessToken
      ? createMercadoPagoOrdersGateway({ accessToken: config.accessToken })
      : { createOrder: async () => { throw new Error("MERCADO_PAGO_ACCESS_TOKEN is required."); } };
    const result = await submitPayment({
      config,
      repository: createPrismaPaymentRepository(prisma),
      gateway,
      input: { orderId: order.id, total: order.total, currency: order.currency, payerEmail: order.contactEmail, ...body },
    });

    return NextResponse.json(publicPaymentResult(result));
  } catch {
    return unavailable();
  }
}

async function parseBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isPaymentRequest(value: unknown): value is PaymentRequest {
  if (!value || typeof value !== "object") return false;
  const { intentId, intentToken, card } = value as Record<string, unknown>;
  if (typeof intentId !== "string" || typeof intentToken !== "string" || !card || typeof card !== "object") return false;
  const { cardToken, paymentMethodId, paymentType, installments, issuerId } = card as Record<string, unknown>;
  return typeof cardToken === "string"
    && typeof paymentMethodId === "string"
    && (paymentType === "credit_card" || paymentType === "debit_card")
    && typeof installments === "number" && Number.isInteger(installments) && installments > 0
    && (issuerId === undefined || typeof issuerId === "string");
}

function invalidIntent() {
  return NextResponse.json({ code: "INVALID_PAYMENT_INTENT", message: "Payment could not be completed." }, { status: 400 });
}

function notFound() {
  return NextResponse.json({ code: "ORDER_NOT_FOUND", message: "Order not found." }, { status: 404 });
}

function declined() {
  return NextResponse.json({ code: "PAYMENT_DECLINED", message: "Payment could not be completed." }, { status: 409 });
}

function unavailable() {
  return NextResponse.json({ code: "PAYMENT_UNAVAILABLE", message: "Payment could not be completed." }, { status: 500 });
}

function publicPaymentResult(result: PaymentResult) {
  switch (result.kind) {
    case "paid":
      return { kind: "paid", attemptId: result.attemptId, nextAction: "none" as const };
    case "pending":
      return { kind: "pending", attemptId: result.attemptId, nextAction: result.nextAction };
    case "action_required":
      return {
        kind: "action_required",
        attemptId: result.attemptId,
        nextAction: "complete_3ds" as const,
        challenge: { url: result.challenge.url, expiresAt: result.challenge.expiresAt },
      };
    case "failed_retryable":
      return {
        kind: "failed_retryable",
        attemptId: result.attemptId,
        nextAction: "retry_new_intent" as const,
        error: publicPaymentError(result.error.code, "retry_new_intent"),
        nextIntent: {
          intentId: result.nextIntent.intentId,
          intentToken: result.nextIntent.intentToken,
          priorAttemptId: result.nextIntent.priorAttemptId,
          singleUse: true as const,
        },
      };
    case "failed_terminal":
      return {
        kind: "failed_terminal",
        attemptId: result.attemptId,
        nextAction: result.nextAction,
        error: publicPaymentError(result.error.code, result.nextAction),
      };
  }
}

function publicPaymentError(code: SafeCode, nextAction: "none" | "contact_support" | "retry_new_intent") {
  return { code, nextAction, message: "Payment could not be completed." };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
