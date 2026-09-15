import { NextResponse } from "next/server";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { hashStatusCapability } from "@/lib/checkout/contracts";
import { reserveOrder } from "@/lib/checkout/order-repository";
import { createGuestOrder } from "@/lib/checkout/guest-order-service";
import type { GuestOrderInput } from "@/lib/checkout/contracts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input: GuestOrderInput;
  try {
    input = await request.json() as GuestOrderInput;
  } catch {
    return NextResponse.json({ code: "INVALID_CHECKOUT", message: "Invalid checkout data.", issues: [{ field: "body", message: "Request body must be valid JSON." }] }, { status: 400 });
  }

  try {
    const result = await createGuestOrder(input);
    if ("error" in result) return NextResponse.json(publicCheckoutError(result.error), { status: result.error.code === "INVALID_CHECKOUT" ? 400 : 409 });
    const statusCapability = randomUUID();
    const persisted = await reserveOrder(prisma, result.order, hashStatusCapability(statusCapability));
    const order = {
      id: persisted.id,
      status: persisted.status,
      currency: persisted.currency,
      total: persisted.total,
      updatedAt: persisted.updatedAt,
    };

    return NextResponse.json({ order, statusCapability }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "STOCK_RESERVATION_UNAVAILABLE") {
      return NextResponse.json({ code: "CATALOG_ITEM_UNAVAILABLE", message: "One or more selected items are unavailable." }, { status: 409 });
    }
    return unavailable();
  }
}

function publicCheckoutError(error: { code: "INVALID_CHECKOUT" | "CATALOG_ITEM_UNAVAILABLE"; message: string; issues: Array<{ field: string; message: string }> }) {
  return {
    code: error.code,
    message: error.code === "INVALID_CHECKOUT" ? "Invalid checkout data." : "One or more selected items are unavailable.",
    issues: error.issues.map(({ field, message }) => ({ field, message })),
  };
}

function unavailable() {
  return NextResponse.json({ code: "CHECKOUT_UNAVAILABLE", message: "Checkout is temporarily unavailable." }, { status: 500 });
}
