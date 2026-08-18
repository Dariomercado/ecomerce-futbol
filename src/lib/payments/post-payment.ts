import { randomUUID } from "node:crypto";
import { MercadoPagoProviderError } from "./mercado-pago-orders-gateway";
import type { MercadoPagoOrdersGateway, MercadoPagoProviderFailure, ProviderOrderActionResult } from "./mercado-pago-orders-gateway";

export type PostPaymentOperation = "cancel" | "refund";
export type PostPaymentResult = { operation: PostPaymentOperation; status: "completed" | "pending"; provider: ProviderOrderActionResult };
export type PostPaymentErrorCode =
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_CANCELLABLE"
  | "ORDER_NOT_REFUNDABLE"
  | "PROVIDER_ORDER_ID_MISSING"
  | "POST_PAYMENT_OPERATION_ALREADY_COMPLETED"
  | "POST_PAYMENT_PROVIDER_FAILED";

/** Stable, transport-agnostic errors for post-payment operations. */
export class PostPaymentError extends Error {
  readonly code: PostPaymentErrorCode;

  readonly providerFailure?: MercadoPagoProviderFailure;

  constructor(code: PostPaymentErrorCode, options?: { cause?: unknown; providerFailure?: MercadoPagoProviderFailure }) {
    super(code, options);
    this.name = "PostPaymentError";
    this.code = code;
    this.providerFailure = options?.providerFailure;
  }
}

/** Returns only the public error codes; provider details are never exposed. */
export function getPostPaymentErrorCode(error: unknown): PostPaymentErrorCode {
  if (error instanceof PostPaymentError) return error.code;
  return "POST_PAYMENT_PROVIDER_FAILED";
}

/** Returns safe operator-only metadata; provider payloads never escape this boundary. */
export function getPostPaymentProviderFailure(error: unknown): MercadoPagoProviderFailure | undefined {
  return error instanceof PostPaymentError ? error.providerFailure : undefined;
}

export type PostPaymentRepository = {
  findOperation(orderId: string, operation: PostPaymentOperation): Promise<{ idempotencyKey: string; status: "RUNNING" | "COMPLETED" } | null>;
  createOperation(input: { orderId: string; operation: PostPaymentOperation; idempotencyKey: string }): Promise<{ idempotencyKey: string; status: "RUNNING" | "COMPLETED" }>;
  getOrderForOperation(orderId: string): Promise<{ status: "PENDING_CONFIRMATION" | "PAYMENT_PENDING" | "PAID" | "PAYMENT_FAILED" | "CANCELLED" | "REFUNDED"; providerOrderId: string | null }>;
  completeOperation(orderId: string, operation: PostPaymentOperation, provider: ProviderOrderActionResult): Promise<void>;
};

/** Executes a privileged post-payment operation exactly once per order/operation. */
export async function executePostPaymentOperation({ repository, gateway, orderId, operation }: { repository: PostPaymentRepository; gateway: Pick<MercadoPagoOrdersGateway, "cancelOrder" | "refundOrder">; orderId: string; operation: PostPaymentOperation }): Promise<PostPaymentResult> {
  let order: Awaited<ReturnType<PostPaymentRepository["getOrderForOperation"]>>;
  try {
    order = await repository.getOrderForOperation(orderId);
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") throw new PostPaymentError("ORDER_NOT_FOUND", { cause: error });
    throw error;
  }
  if (!order) throw new PostPaymentError("ORDER_NOT_FOUND");
  // A completed ledger is authoritative even after its order moved to a
  // terminal lifecycle state. Check it before evaluating eligibility so a
  // retry consistently reports a duplicate operation rather than 422.
  let persistedOperation = await repository.findOperation(orderId, operation);
  if (persistedOperation?.status === "COMPLETED") {
    throw new PostPaymentError("POST_PAYMENT_OPERATION_ALREADY_COMPLETED");
  }
  if (!order.providerOrderId) throw new PostPaymentError("PROVIDER_ORDER_ID_MISSING");
  if (operation === "cancel" && ["PAID", "REFUNDED", "CANCELLED"].includes(order.status)) throw new PostPaymentError("ORDER_NOT_CANCELLABLE");
  if (operation === "refund" && order.status !== "PAID") throw new PostPaymentError("ORDER_NOT_REFUNDABLE");
  if (!persistedOperation) {
    const idempotencyKey = randomUUID();
    try {
      persistedOperation = await repository.createOperation({ orderId, operation, idempotencyKey });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "UNIQUE_OPERATION_CONFLICT") throw error;
      // Another caller won the unique (orderId, operation) insert. Its
      // persisted key, not this attempt's generated key, is the provider's
      // idempotency identity for every subsequent retry.
      persistedOperation = await repository.findOperation(orderId, operation);
      if (!persistedOperation) throw error;
    }
  }
  if (persistedOperation.status === "COMPLETED") {
    throw new PostPaymentError("POST_PAYMENT_OPERATION_ALREADY_COMPLETED");
  }

  let provider: ProviderOrderActionResult;
  try {
    provider = operation === "cancel"
      ? await gateway.cancelOrder(order.providerOrderId, persistedOperation.idempotencyKey)
      : await gateway.refundOrder(order.providerOrderId, persistedOperation.idempotencyKey);
  } catch (error) {
    // Do not mark the ledger complete without terminal provider authority.
    // RUNNING retains the durable key for a safe retry or reconciliation.
    throw new PostPaymentError("POST_PAYMENT_PROVIDER_FAILED", {
      cause: error,
      ...(error instanceof MercadoPagoProviderError ? { providerFailure: error.failure } : {}),
    });
  }

  const status = normalizeTerminalProviderStatus(operation, provider.status);
  if (!status) {
    throw new PostPaymentError("POST_PAYMENT_PROVIDER_FAILED");
  }

  provider = { ...provider, status };
  await repository.completeOperation(orderId, operation, provider);
  return { operation, status: "completed", provider };
}

function normalizeTerminalProviderStatus(operation: PostPaymentOperation, status: string) {
  const normalized = status.trim().toLowerCase();
  if (operation === "cancel" && (normalized === "cancelled" || normalized === "canceled")) return normalized;
  if (operation === "refund" && normalized === "refunded") return normalized;
  return null;
}
