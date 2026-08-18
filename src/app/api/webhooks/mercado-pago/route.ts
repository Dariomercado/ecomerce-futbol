import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { claimWebhookReceipt, completeReceiptAndApplyEvidence } from "@/lib/checkout/order-repository";
import { loadPaymentConfig } from "@/lib/payments/config";
import { createMercadoPagoOrdersGateway } from "@/lib/payments/mercado-pago-orders-gateway";
import { sha256RawWebhookBody, parseMercadoPagoWebhookSignature, verifyMercadoPagoWebhookSignature } from "@/lib/payments/webhook";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id");
  const requestId = request.headers.get("x-request-id");
  const xSignature = request.headers.get("x-signature");
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const signature = parseMercadoPagoWebhookSignature(xSignature ?? "");
  const validSignature = dataId && signature && (
    verifyMercadoPagoWebhookSignature({ secret: secret ?? "", dataId, requestId, xSignature })
    || verifyMercadoPagoWebhookSignature({ secret: secret ?? "", dataId: dataId.toLowerCase(), requestId, xSignature })
  );
  if (!validSignature) {
    console.warn("[payments] Mercado Pago webhook signature rejected", {
      hasDataId: Boolean(dataId),
      hasRequestId: Boolean(requestId),
      hasSignature: Boolean(xSignature),
      hasSecret: Boolean(secret),
      dataIdHash: opaque(dataId),
      signatureTimestamp: signature?.timestamp,
      matchesLowercaseDataId: dataId ? verifyMercadoPagoWebhookSignature({ secret: secret ?? "", dataId: dataId.toLowerCase(), requestId, xSignature }) : false,
    });
    return unauthorized();
  }

  const rawBody = await request.text();
  const notification = parseNotification(rawBody);
  if (!notification || notification.resourceId !== dataId) return malformed();
  let receiptId: string | undefined;
  try {
    const claim = await claimWebhookReceipt(prisma, {
      provider: "mercado_pago",
      applicationId: notification.applicationId,
      topic: notification.topic,
      notificationId: notification.notificationId,
      resourceId: notification.resourceId,
      rawBodySha256: sha256RawWebhookBody(rawBody),
      ...(notification.action ? { action: notification.action } : {}),
      ...(notification.liveMode !== undefined ? { liveMode: notification.liveMode } : {}),
      ...(notification.providerCreatedAt ? { providerCreatedAt: notification.providerCreatedAt } : {}),
      ...(requestId ? { requestId } : {}),
      signatureTimestamp: signature.timestamp,
      signatureVersion: "v1",
    });
    // Only a terminal receipt is safe to acknowledge. A duplicate held by an
    // unexpired PROCESSING lease must remain retryable so a crashed worker can
    // be recovered after its lease expires.
    if (!claim.claimed) {
      if (claim.receipt.state === "PROCESSED") return NextResponse.json({ received: true });
      return retryable();
    }
    receiptId = claim.receipt.id;

    const config = loadPaymentConfig();
    if (!config.accessToken) throw new Error("WEBHOOK_CONFIGURATION_MISSING");
    const evidence = await createMercadoPagoOrdersGateway({ accessToken: config.accessToken }).getOrder(notification.resourceId);
    if (!isSafeEvidence(evidence)) throw new Error("WEBHOOK_EVIDENCE_UNSAFE");
    const attempt = await prisma.paymentAttempt.findFirst({ where: { orderId: evidence.externalReference, providerOrderId: evidence.id }, select: { id: true, orderId: true } });
    if (!attempt) throw new Error("WEBHOOK_ATTEMPT_UNSAFE");
    await completeReceiptAndApplyEvidence(prisma, { receiptId: claim.receipt.id, attemptId: attempt.id, orderId: attempt.orderId, evidence, outcome: "PENDING" });
  } catch {
    await markRetryableReceipt(receiptId);
    return retryable();
  }

  return NextResponse.json({ received: true });
}

function isSafeEvidence(value: unknown): value is { id: string; externalReference: string; status: string; statusDetail: string; updatedAt: string; payment: { id: string; status: string; statusDetail: string } } {
  if (!value || typeof value !== "object") return false;
  const evidence = value as Record<string, unknown>;
  const payment = evidence.payment;
  return typeof evidence.id === "string" && typeof evidence.externalReference === "string" && typeof evidence.status === "string" && typeof evidence.statusDetail === "string" && typeof evidence.updatedAt === "string" && Boolean(payment && typeof payment === "object" && typeof (payment as Record<string, unknown>).id === "string" && typeof (payment as Record<string, unknown>).status === "string" && typeof (payment as Record<string, unknown>).statusDetail === "string");
}

async function markRetryableReceipt(receiptId: string | undefined) {
  // A transaction/lookup failure remains resumable; never leak its cause to Mercado Pago.
  if (!receiptId) return;
  try { await prisma.webhookReceipt.update({ where: { id: receiptId }, data: { state: "RETRYABLE_FAILED", leaseUntil: null, lastErrorCode: "WEBHOOK_PROCESSING_RETRYABLE" } }); } catch { /* Preserve the original 503 when persistence is unavailable. */ }
}

function parseNotification(rawBody: string) {
  let value: unknown;
  try { value = JSON.parse(rawBody); } catch { return null; }
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const data = body.data;
  if (!data || typeof data !== "object") return null;
  const applicationId = stringIdentifier(body.application_id);
  const topic = typeof body.type === "string" ? body.type : null;
  const resourceId = stringIdentifier((data as Record<string, unknown>).id);
  if (!applicationId || !topic || !resourceId) return null;
  const created = typeof body.date_created === "string" ? new Date(body.date_created) : null;
  if (created && Number.isNaN(created.getTime())) return null;
  const action = typeof body.action === "string" ? body.action : undefined;
  const notificationId = stringIdentifier(body.id) ?? `derived:v1:${sha256RawWebhookBody(rawBody)}`;
  return { notificationId, applicationId, topic, resourceId, action, liveMode: typeof body.live_mode === "boolean" ? body.live_mode : undefined, providerCreatedAt: created ?? undefined };
}

function stringIdentifier(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function opaque(value: string | null) {
  return value ? createHash("sha256").update(value).digest("hex").slice(0, 12) : undefined;
}

function malformed() {
  return NextResponse.json({ code: "INVALID_WEBHOOK" }, { status: 400 });
}

function retryable() {
  return NextResponse.json({ code: "WEBHOOK_RETRY" }, { status: 503 });
}

function unauthorized() {
  return NextResponse.json({ code: "INVALID_WEBHOOK_SIGNATURE" }, { status: 401 });
}
