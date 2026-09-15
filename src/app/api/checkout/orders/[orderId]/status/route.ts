import { NextResponse } from "next/server";

import { matchesStatusCapability } from "@/lib/checkout/contracts";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type StatusRouteContext = { params: Promise<{ orderId: string }> };

export async function GET(request: Request, { params }: StatusRouteContext) {
  const capability = request.headers.get("x-checkout-status-capability");
  if (!capability) return notFound();

  const { orderId } = await params;
  if (!isUuid(orderId)) return notFound();

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        currency: true,
        total: true,
        updatedAt: true,
        statusCapabilityHash: true,
      },
    });

    if (!order || !matchesStatusCapability(capability, order.statusCapabilityHash)) return notFound();

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        currency: order.currency,
        total: order.total,
        updatedAt: order.updatedAt.toISOString(),
      },
    });
  } catch {
    return unavailable();
  }
}

function notFound() {
  return NextResponse.json({ code: "ORDER_NOT_FOUND", message: "Order not found." }, { status: 404 });
}

function unavailable() {
  return NextResponse.json({ code: "ORDER_STATUS_UNAVAILABLE", message: "Order status is temporarily unavailable." }, { status: 500 });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
