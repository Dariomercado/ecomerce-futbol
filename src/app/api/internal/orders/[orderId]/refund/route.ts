import { NextResponse } from "next/server";

import { createPrismaAdminAuditRepository } from "@/lib/admin/audit-repository";
import { requireAdmin } from "@/lib/auth/admin-authorization";
import { requireAdminRequestIntegrity } from "@/lib/auth/request-integrity";
import { createPrismaPostPaymentRepository } from "@/lib/checkout/order-repository";
import { loadPaymentConfig } from "@/lib/payments/config";
import { createMercadoPagoOrdersGateway } from "@/lib/payments/mercado-pago-orders-gateway";
import { executePostPaymentOperation, getPostPaymentErrorCode, getPostPaymentProviderFailure } from "@/lib/payments/post-payment";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const integrity = requireAdminRequestIntegrity(request);
  if (!integrity.valid) {
    return NextResponse.json({ code: integrity.code }, { status: integrity.status });
  }

  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return NextResponse.json({ code: authorization.code }, { status: authorization.status });
  }

  const config = loadPaymentConfig();
  if (!config.accessToken) {
    return unavailable();
  }

  const { orderId } = await params;
  const audit = createPrismaAdminAuditRepository();
  const actor = {
    membershipId: authorization.membership.id,
    actorSupabaseUserId: authorization.user.id,
  };

  try {
    await audit.append({
      ...actor,
      action: "ORDER_REFUND",
      entityType: "Order",
      entityId: orderId,
      outcome: "ATTEMPTED",
      context: { stage: "before_domain_evaluation" },
    });
  } catch {
    return auditUnavailable();
  }

  try {
    const result = await executePostPaymentOperation({
      repository: createPrismaPostPaymentRepository(prisma),
      gateway: createMercadoPagoOrdersGateway({ accessToken: config.accessToken }),
      orderId,
      operation: "refund",
    });

    try {
      await audit.append({
        ...actor,
        action: "ORDER_REFUND",
        entityType: "Order",
        entityId: orderId,
        outcome: "SUCCEEDED",
        context: { stage: "after_domain_evaluation" },
      });
    } catch {
      return auditUnavailable();
    }

    return NextResponse.json(result);
  } catch (error) {
    const code = getPostPaymentErrorCode(error);
    try {
      await audit.append({
        ...actor,
        action: "ORDER_REFUND",
        entityType: "Order",
        entityId: orderId,
        outcome: "FAILED",
        context: { code },
      });
    } catch {
      return auditUnavailable();
    }
    return operationError(error, code);
  }
}

function unavailable() {
  return NextResponse.json({ code: "POST_PAYMENT_UNAVAILABLE" }, { status: 503 });
}

function auditUnavailable() {
  return NextResponse.json({ code: "ADMIN_AUDIT_UNAVAILABLE" }, { status: 503 });
}

function operationError(error: unknown, code = getPostPaymentErrorCode(error)) {
  if (code === "ORDER_NOT_FOUND") return NextResponse.json({ code }, { status: 404 });
  if (code === "POST_PAYMENT_OPERATION_ALREADY_COMPLETED") return NextResponse.json({ code }, { status: 409 });
  if (["ORDER_NOT_REFUNDABLE", "PROVIDER_ORDER_ID_MISSING"].includes(code)) {
    return NextResponse.json({ code }, { status: 422 });
  }
  const failure = getPostPaymentProviderFailure(error);
  if (failure) {
    // Safe operational evidence only; never log provider payloads, credentials, or IDs.
    console.error("post_payment_provider_failure", failure);
    return NextResponse.json({ code: "POST_PAYMENT_PROVIDER_FAILED", correlationId: failure.correlationId }, { status: 502 });
  }
  return NextResponse.json({ code: "POST_PAYMENT_PROVIDER_FAILED" }, { status: 502 });
}
