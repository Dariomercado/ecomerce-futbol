import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/admin-authorization";
import { requireAdminRequestIntegrity } from "@/lib/auth/request-integrity";
import { adminCatalogService, getAdminCatalogErrorCode, getAdminCatalogErrorStatus } from "@/lib/catalog/admin-product-service";

export const runtime = "nodejs";

const DEFAULT_ADMIN_CATALOG_LIMIT = 20;
const MAX_ADMIN_CATALOG_LIMIT = 50;

export async function GET(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return denied(authorization);

  const pagination = parsePagination(new URL(request.url).searchParams);
  if (!pagination) return NextResponse.json({ code: "INVALID_ADMIN_CATALOG_QUERY" }, { status: 400 });

  try {
    const result = await adminCatalogService.listProducts({
      actor: actorFrom(authorization),
      ...pagination,
    });
    return NextResponse.json(result);
  } catch (error) {
    return catalogError(error);
  }
}

export async function POST(request: Request) {
  const integrity = requireAdminRequestIntegrity(request);
  if (!integrity.valid) return NextResponse.json({ code: integrity.code }, { status: integrity.status });

  const authorization = await requireAdmin();
  if (!authorization.authorized) return denied(authorization);

  try {
    const input = await parseJson(request);
    const product = await adminCatalogService.createProduct({ actor: actorFrom(authorization), input });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return catalogError(error);
  }
}

function parsePagination(searchParams: URLSearchParams): { page: number; limit: number } | null {
  const page = parsePositiveInteger(searchParams.get("page"), 1);
  const limit = parsePositiveInteger(searchParams.get("limit"), DEFAULT_ADMIN_CATALOG_LIMIT);
  if (!page || !limit || limit > MAX_ADMIN_CATALOG_LIMIT) return null;
  return { page, limit };
}

function parsePositiveInteger(value: string | null, fallback: number): number | null {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_ADMIN_PRODUCT");
  }
}

function actorFrom(authorization: Extract<Awaited<ReturnType<typeof requireAdmin>>, { authorized: true }>) {
  return { membershipId: authorization.membership.id, actorSupabaseUserId: authorization.user.id };
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
