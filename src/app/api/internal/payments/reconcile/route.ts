import { NextResponse } from "next/server";

import { authorizeReconciliationRequest } from "@/lib/admin/temporary-admin-auth";
import { createPrismaPaymentRepository, leaseDuePaymentAttempts } from "@/lib/checkout/order-repository";
import { loadPaymentConfig } from "@/lib/payments/config";
import { createMercadoPagoOrdersGateway } from "@/lib/payments/mercado-pago-orders-gateway";
import { reconcileProviderOrder } from "@/lib/payments/service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const reconciliationBatchSize = 25;
const reconciliationLeaseMs = 300_000;

export async function POST(request: Request) {
  const authorization = authorizeReconciliationRequest(request);
  if (!authorization.authorized) {
    return NextResponse.json({ code: authorization.code }, { status: authorization.status });
  }

  const config = loadPaymentConfig();
  if (!config.accessToken) {
    return NextResponse.json({ code: "RECONCILIATION_UNAVAILABLE" }, { status: 503 });
  }

  try {
    const attempts = await leaseDuePaymentAttempts(prisma, new Date(), reconciliationBatchSize, reconciliationLeaseMs);
    const repository = createPrismaPaymentRepository(prisma);
    const gateway = createMercadoPagoOrdersGateway({ accessToken: config.accessToken });

    let reconciled = 0;
    for (const attempt of attempts) {
      // reconcileProviderOrder performs the network lookup before it persists evidence.
      try {
        await reconcileProviderOrder({ repository, gateway, attempt });
        reconciled += 1;
      } catch {
        // A single unexpected attempt failure must not abandon the remaining leased batch.
      }
    }

    return NextResponse.json({ reconciled });
  } catch {
    return NextResponse.json({ code: "RECONCILIATION_UNAVAILABLE" }, { status: 503 });
  }
}
