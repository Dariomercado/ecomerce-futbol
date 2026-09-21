"use server";

import { cookies, headers } from "next/headers";

import { POST as createProduct } from "@/app/api/internal/catalog/products/route";
import { PATCH as updateProduct } from "@/app/api/internal/catalog/products/[productId]/route";
import { POST as archiveProduct } from "@/app/api/internal/catalog/products/[productId]/archive/route";
import type { AdminProductInput } from "@/lib/catalog/admin-contracts";

type Mutation =
  | { operation: "create"; input: AdminProductInput }
  | { operation: "update"; productId: string; input: AdminProductInput }
  | { operation: "archive"; productId: string };

type MutationResult =
  | { ok: true; product: unknown }
  | { ok: false; code: string; status: number };

/** Keeps the HttpOnly CSRF token server-side while reusing existing route handlers. */
export async function mutateAdminCatalog(mutation: Mutation): Promise<MutationResult> {
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const csrfToken = cookieStore.get("admin_csrf_token")?.value;
  const origin = requestHeaders.get("origin");
  const fetchSite = requestHeaders.get("sec-fetch-site");

  if (!csrfToken) return { ok: false, code: "ADMIN_CSRF_INVALID", status: 403 };
  if (!origin) return { ok: false, code: "ADMIN_ORIGIN_INVALID", status: 403 };
  if (fetchSite !== "same-origin" && fetchSite !== "same-site") {
    return { ok: false, code: "ADMIN_FETCH_METADATA_INVALID", status: 403 };
  }

  const forwardedHeaders = new Headers({
    cookie: cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join("; "),
    origin,
    "sec-fetch-site": fetchSite,
    "x-csrf-token": csrfToken,
  });

  if (mutation.operation === "create") {
    return serialize(await createProduct(new Request(`${origin}/api/internal/catalog/products`, {
      method: "POST", headers: forwardedHeaders, body: JSON.stringify(mutation.input),
    })));
  }

  const productPath = `/api/internal/catalog/products/${mutation.productId}`;
  if (mutation.operation === "update") {
    return serialize(await updateProduct(new Request(`${origin}${productPath}`, {
      method: "PATCH", headers: forwardedHeaders, body: JSON.stringify(mutation.input),
    }), { params: Promise.resolve({ productId: mutation.productId }) }));
  }

  return serialize(await archiveProduct(new Request(`${origin}${productPath}/archive`, {
    method: "POST", headers: forwardedHeaders,
  }), { params: Promise.resolve({ productId: mutation.productId }) }));
}

async function serialize(response: Response): Promise<MutationResult> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = typeof body === "object" && body !== null && "code" in body && typeof body.code === "string"
      ? body.code
      : "ADMIN_CATALOG_SAVE_FAILED";
    return { ok: false, code, status: response.status };
  }
  return { ok: true, product: body };
}