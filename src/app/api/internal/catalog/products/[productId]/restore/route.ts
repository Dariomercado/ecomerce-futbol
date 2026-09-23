import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/admin-authorization";
import { requireAdminRequestIntegrity } from "@/lib/auth/request-integrity";
import { adminCatalogService, getAdminCatalogErrorCode, getAdminCatalogErrorStatus } from "@/lib/catalog/admin-product-service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ productId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const integrity = requireAdminRequestIntegrity(request);
  if (!integrity.valid) return NextResponse.json({ code: integrity.code }, { status: integrity.status });

  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return NextResponse.json({ code: authorization.code }, { status: authorization.status });
  }

  try {
    const { productId } = await params;
    const product = await adminCatalogService.restoreProduct({
      actor: { membershipId: authorization.membership.id, actorSupabaseUserId: authorization.user.id },
      productId,
    });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { code: getAdminCatalogErrorCode(error) },
      { status: getAdminCatalogErrorStatus(error) },
    );
  }
}
