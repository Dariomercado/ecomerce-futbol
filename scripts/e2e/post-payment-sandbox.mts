import { createHash } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

type Operation = "cancel" | "refund";

type HarnessConfig = {
  baseUrl: string;
  operation: Operation;
  orderId: string;
  adminToken: string;
  webhook: {
    body: string;
    dataId: string;
    applicationId: string;
    topic: string;
    notificationId: string;
    signature: string;
    requestId?: string;
  };
};

type StockSnapshot = {
  orderStatus: string;
  operationStatus: string | null;
  reservations: Array<{ id: string; variantId: string; quantity: number; status: string }>;
  variants: Array<{ id: string; stock: number }>;
};

class HarnessFailure extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "HarnessFailure";
    this.code = code;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    printHelp();
    return;
  }

  const operation = readOperation(args);
  assertSandboxExecutionIntent(args);
  const config = readConfig(operation);
  // Import Prisma only after every required value was obtained from the
  // inherited process environment. This keeps a missing value from being
  // satisfied by Prisma's runtime dotenv loading.
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const before = await snapshot(prisma, config.orderId, config.operation);
    assertEligibleFixture(before, config.operation);

    const action = await invokeOperation(config);
    await assertActionResponse(action, config.operation);

    const afterAction = await snapshot(prisma, config.orderId, config.operation);
    assertTerminalTransition(before, afterAction, config.operation);

    await replayWebhook(config);
    await replayWebhook(config);

    const afterReplay = await snapshot(prisma, config.orderId, config.operation);
    assertSnapshotEqual(afterAction, afterReplay, "DUPLICATE_WEBHOOK_CHANGED_LOCAL_STATE");
    await assertWebhookProcessed(prisma, config.webhook);

    console.log(JSON.stringify({
      result: "passed",
      operation: config.operation,
      order: opaque(config.orderId),
      assertions: ["terminal-transition", "single-restock", "duplicate-webhook-safe"],
    }));
  } finally {
    await prisma.$disconnect();
  }
}

function printHelp() {
  console.log(`Usage: pnpm e2e:post-payment -- --execute --operation <cancel|refund>

This harness reads only already-injected process environment. Set
E2E_POST_PAYMENT_SECRET_SOURCE to secret-manager or local-process.
It never loads .env files and refuses production mode. See docs/operations/post-payment.md.`);
}

function readOperation(args: string[]): Operation {
  const index = args.indexOf("--operation");
  const value = index >= 0 ? args[index + 1] : undefined;
  if (value === "cancel" || value === "refund") return value;
  throw new HarnessFailure("E2E_OPERATION_REQUIRED");
}

function assertSandboxExecutionIntent(args: string[]) {
  if (!args.includes("--execute")) throw new HarnessFailure("E2E_EXECUTION_NOT_CONFIRMED");
  if (process.env.NODE_ENV === "production") throw new HarnessFailure("E2E_PRODUCTION_MODE_FORBIDDEN");
  if (process.env.E2E_POST_PAYMENT_ENVIRONMENT !== "sandbox") throw new HarnessFailure("E2E_SANDBOX_ENVIRONMENT_REQUIRED");
  if (process.env.E2E_POST_PAYMENT_CONFIRM !== "SANDBOX_ONLY") throw new HarnessFailure("E2E_SANDBOX_CONFIRMATION_REQUIRED");
  const secretSource = process.env.E2E_POST_PAYMENT_SECRET_SOURCE;
  if (secretSource !== "secret-manager" && secretSource !== "local-process") {
    throw new HarnessFailure("E2E_SECRET_SOURCE_INVALID");
  }
}

function readConfig(operation: Operation): HarnessConfig {
  // The app itself consumes these values; validate their presence here so an
  // incomplete injection never becomes a misleading E2E result.
  required("DATABASE_URL");
  required("MERCADO_PAGO_ACCESS_TOKEN");
  required("MERCADO_PAGO_WEBHOOK_SECRET");
  const baseUrl = required("E2E_POST_PAYMENT_BASE_URL");
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new HarnessFailure("E2E_BASE_URL_MUST_BE_HTTPS_OR_LOCALHOST");
  }

  const body = decodeWebhookBody(required("E2E_POST_PAYMENT_WEBHOOK_BODY_BASE64"));
  const notification = parseWebhookNotification(body);
  return {
    baseUrl: url.toString().replace(/\/$/, ""),
    operation,
    orderId: required("E2E_POST_PAYMENT_ORDER_ID"),
    adminToken: required("POST_PAYMENT_ADMIN_TOKEN"),
    webhook: {
      body,
      ...notification,
      signature: required("E2E_POST_PAYMENT_WEBHOOK_SIGNATURE"),
      ...(process.env.E2E_POST_PAYMENT_WEBHOOK_REQUEST_ID ? { requestId: process.env.E2E_POST_PAYMENT_WEBHOOK_REQUEST_ID } : {}),
    },
  };
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new HarnessFailure(`E2E_ENVIRONMENT_MISSING_${name}`);
  return value;
}

function decodeWebhookBody(value: string) {
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    throw new HarnessFailure("E2E_WEBHOOK_BODY_INVALID");
  }
}

function parseWebhookNotification(rawBody: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new HarnessFailure("E2E_WEBHOOK_BODY_INVALID");
  }
  if (!parsed || typeof parsed !== "object") throw new HarnessFailure("E2E_WEBHOOK_BODY_INVALID");
  const value = parsed as Record<string, unknown>;
  const data = value.data;
  if (!data || typeof data !== "object") throw new HarnessFailure("E2E_WEBHOOK_BODY_INVALID");
  const applicationId = identifier(value.application_id);
  const topic = typeof value.type === "string" ? value.type : undefined;
  const dataId = identifier((data as Record<string, unknown>).id);
  if (!applicationId || !topic || !dataId) throw new HarnessFailure("E2E_WEBHOOK_BODY_MUST_BE_PROVIDER_NOTIFICATION");
  const notificationId = identifier(value.id) ?? `derived:v1:${createHash("sha256").update(rawBody).digest("hex")}`;
  return { applicationId, topic, notificationId, dataId };
}

function identifier(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

async function snapshot(prisma: PrismaClient, orderId: string, operation: Operation): Promise<StockSnapshot> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      reservations: { select: { id: true, variantId: true, quantity: true, status: true }, orderBy: { id: "asc" } },
      postPaymentOperations: {
        where: { type: operation === "cancel" ? "CANCEL" : "REFUND" },
        select: { status: true },
        take: 1,
      },
    },
  });
  if (!order) throw new HarnessFailure("E2E_ORDER_NOT_FOUND");
  const variantIds = order.reservations.map((reservation) => reservation.variantId);
  const variants = await prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, stock: true }, orderBy: { id: "asc" } });
  if (variants.length !== variantIds.length) throw new HarnessFailure("E2E_FIXTURE_VARIANT_MISSING");
  return { orderStatus: order.status, operationStatus: order.postPaymentOperations[0]?.status ?? null, reservations: order.reservations, variants };
}

function assertEligibleFixture(snapshot: StockSnapshot, operation: Operation) {
  const expectedOrderStatus = operation === "refund" ? "PAID" : undefined;
  const expectedReservationStatus = operation === "refund" ? "CONSUMED" : "ACTIVE";
  if ((expectedOrderStatus && snapshot.orderStatus !== expectedOrderStatus) || snapshot.reservations.length === 0 || snapshot.reservations.some((reservation) => reservation.status !== expectedReservationStatus)) {
    throw new HarnessFailure("E2E_FIXTURE_NOT_ELIGIBLE");
  }
  if (snapshot.operationStatus === "COMPLETED") throw new HarnessFailure("E2E_FIXTURE_OPERATION_ALREADY_COMPLETED");
}

async function invokeOperation(config: HarnessConfig) {
  return fetch(`${config.baseUrl}/api/internal/orders/${encodeURIComponent(config.orderId)}/${config.operation}`, {
    method: "POST",
    headers: { authorization: `Bearer ${config.adminToken}` },
  });
}

async function assertActionResponse(response: Response, operation: Operation) {
  if (!response.ok) throw new HarnessFailure(`E2E_OPERATION_HTTP_${response.status}`);
  const result: unknown = await response.json().catch(() => null);
  if (!result || typeof result !== "object") throw new HarnessFailure("E2E_OPERATION_RESPONSE_INVALID");
  const value = result as Record<string, unknown>;
  const provider = value.provider;
  const allowedProviderStatuses = operation === "refund" ? ["refunded"] : ["cancelled", "canceled"];
  if (value.operation !== operation || value.status !== "completed" || !provider || typeof provider !== "object" || !allowedProviderStatuses.includes(String((provider as Record<string, unknown>).status).toLowerCase())) {
    throw new HarnessFailure("E2E_OPERATION_RESPONSE_INVALID");
  }
}

function assertTerminalTransition(before: StockSnapshot, after: StockSnapshot, operation: Operation) {
  const terminal = operation === "refund" ? "REFUNDED" : "CANCELLED";
  if (after.orderStatus !== terminal || after.operationStatus !== "COMPLETED" || after.reservations.some((reservation) => reservation.status !== "RELEASED")) {
    throw new HarnessFailure("E2E_TERMINAL_TRANSITION_INVALID");
  }
  const increments = new Map(before.reservations.map((reservation) => [reservation.variantId, reservation.quantity]));
  for (const variant of before.variants) {
    const current = after.variants.find((candidate) => candidate.id === variant.id);
    const increment = increments.get(variant.id);
    if (!current || increment === undefined || current.stock !== variant.stock + increment) throw new HarnessFailure("E2E_STOCK_RESTORATION_INVALID");
  }
}

async function replayWebhook(config: HarnessConfig) {
  const headers = new Headers({ "content-type": "application/json", "x-signature": config.webhook.signature });
  if (config.webhook.requestId) headers.set("x-request-id", config.webhook.requestId);
  const response = await fetch(`${config.baseUrl}/api/webhooks/mercado-pago?data.id=${encodeURIComponent(config.webhook.dataId)}`, { method: "POST", headers, body: config.webhook.body });
  if (!response.ok) throw new HarnessFailure(`E2E_WEBHOOK_HTTP_${response.status}`);
  const result: unknown = await response.json().catch(() => null);
  if (!result || typeof result !== "object" || (result as Record<string, unknown>).received !== true) throw new HarnessFailure("E2E_WEBHOOK_RESPONSE_INVALID");
}

async function assertWebhookProcessed(prisma: PrismaClient, webhook: HarnessConfig["webhook"]) {
  const receipt = await prisma.webhookReceipt.findUnique({ where: { provider_applicationId_topic_notificationId: { provider: "mercado_pago", applicationId: webhook.applicationId, topic: webhook.topic, notificationId: webhook.notificationId } }, select: { state: true } });
  if (receipt?.state !== "PROCESSED") throw new HarnessFailure("E2E_WEBHOOK_RECEIPT_NOT_PROCESSED");
}

function assertSnapshotEqual(expected: StockSnapshot, actual: StockSnapshot, code: string) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new HarnessFailure(code);
}

function opaque(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

void main().catch((error: unknown) => {
  const code = error instanceof HarnessFailure ? error.code : "E2E_HARNESS_UNEXPECTED_FAILURE";
  console.error(JSON.stringify({ result: "failed", code }));
  process.exitCode = 1;
});
