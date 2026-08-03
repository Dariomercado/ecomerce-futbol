import { NextResponse } from "next/server";

import { createGuestOrder } from "@/lib/checkout/guest-order-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ code: "INVALID_CHECKOUT", message: "Invalid checkout data.", issues: [{ field: "body", message: "Request body must be valid JSON." }] }, { status: 400 });
  }

  try {
    const result = await createGuestOrder(input);
    if ("error" in result) return NextResponse.json(result.error, { status: 400 });
    return NextResponse.json({ order: result.order }, { status: 201 });
  } catch {
    return NextResponse.json({ code: "CHECKOUT_UNAVAILABLE", message: "We could not process your checkout. Please try again." }, { status: 500 });
  }
}
