import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/admin-authorization";
import { requireAdminRequestIntegrity } from "@/lib/auth/request-integrity";
import { adminCatalogService, getAdminCatalogErrorCode, getAdminCatalogErrorStatus } from "@/lib/catalog/admin-product-service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ productId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const integrity = requireAdminRequestIntegrity(request);
  if (!integrity.valid) return NextResponse.json({ code: integrity.code }, { status: integrity.status });

  const authorization = await requireAdmin();
  if (!authorization.authorized) return denied(authorization);

  try {
    const [{ productId }, input] = await Promise.all([params, parseJson(request)]);
    const product = await adminCatalogService.updateProduct({
      actor: { membershipId: authorization.membership.id, actorSupabaseUserId: authorization.user.id },
      productId,
      input,
    });
    return NextResponse.json(product);
  } catch (error) {
    return catalogError(error);
  }
}

function denied(authorization: Exclude<Awaited<ReturnType<typeof requireAdmin>>, { authorized: true }>) {
  return NextResponse.json({ code: authorization.code }, { status: authorization.status });
}

function catalogError(error: unknown) {
  return NextResponse.json(
    { code: getAdminCatalogErrorCode(error) },
    { status: getAdminCatalogErrorStatus(error) },
  );
}

async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_ADMIN_PRODUCT");
  }
}
