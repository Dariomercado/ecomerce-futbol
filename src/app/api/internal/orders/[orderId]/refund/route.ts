import { NextResponse } from "next/server";

import { authorizeTemporaryAdminRequest } from "@/lib/admin/temporary-admin-auth";
import { createPrismaPostPaymentRepository } from "@/lib/checkout/order-repository";
import { loadPaymentConfig } from "@/lib/payments/config";
import { createMercadoPagoOrdersGateway } from "@/lib/payments/mercado-pago-orders-gateway";
import { executePostPaymentOperation, getPostPaymentErrorCode, getPostPaymentProviderFailure } from "@/lib/payments/post-payment";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const authorization = authorizeTemporaryAdminRequest(request);
  if (!authorization.authorized) {
    return NextResponse.json({ code: authorization.code }, { status: authorization.status });
  }

  const config = loadPaymentConfig();
  if (!config.accessToken) {
    return unavailable();
  }

  try {
    const { orderId } = await params;
    const result = await executePostPaymentOperation({
      repository: createPrismaPostPaymentRepository(prisma),
      gateway: createMercadoPagoOrdersGateway({ accessToken: config.accessToken }),
      orderId,
      operation: "refund",
    });
    return NextResponse.json(result);
  } catch (error) {
    return operationError(error);
  }
}

function unavailable() {
  return NextResponse.json({ code: "POST_PAYMENT_UNAVAILABLE" }, { status: 503 });
}

function operationError(error: unknown) {
  const code = getPostPaymentErrorCode(error);
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
