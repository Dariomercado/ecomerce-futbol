import { NextResponse } from "next/server";

import { loadPaymentConfig, publicPaymentConfig } from "@/lib/payments/config";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(publicPaymentConfig(loadPaymentConfig()));
}
