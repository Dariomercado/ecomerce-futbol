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

  const result = await createGuestOrder(input);
  if ("error" in result) return NextResponse.json(result.error, { status: result.error.code === "INVALID_CHECKOUT" ? 400 : 409 });
  try { const persisted = await reserveOrder(prisma, result.order, hashStatusCapability(randomUUID())); return NextResponse.json({ order: persisted }, { status: 201 }); } catch (error) { if (error instanceof Error && error.message === "STOCK_RESERVATION_UNAVAILABLE") return NextResponse.json({ code: "CATALOG_ITEM_UNAVAILABLE", message: "One or more selected items are unavailable." }, { status: 409 }); throw error; }
}
