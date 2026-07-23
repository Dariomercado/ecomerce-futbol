import { NextResponse } from "next/server";

import type {
  CatalogQueryIssue,
  CatalogValidationError,
} from "@/lib/catalog/public-contracts";
import { publicCatalogRepository } from "@/lib/catalog/prisma-public-repository";
import { catalogUnavailableResponse } from "@/lib/catalog/public-route-errors";

export const runtime = "nodejs";

const DEFAULT_FEATURED_PRODUCTS_LIMIT = 4;
const MAX_FEATURED_PRODUCTS_LIMIT = 12;

export async function GET(request: Request) {
  const limit = parseFeaturedLimit(new URL(request.url).searchParams);

  if ("error" in limit) {
    return NextResponse.json(limit.error, { status: 400 });
  }

  try {
    const products = await publicCatalogRepository.findFeaturedProducts(
      limit.value,
    );

    return NextResponse.json(products);
  } catch {
    return catalogUnavailableResponse();
  }
}

type ParsedFeaturedLimit =
  | { value: number }
  | { error: CatalogValidationError };

function parseFeaturedLimit(
  searchParams: URLSearchParams,
): ParsedFeaturedLimit {
  const value = searchParams.get("limit");

  if (value === null || value.trim() === "") {
    return { value: DEFAULT_FEATURED_PRODUCTS_LIMIT };
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > MAX_FEATURED_PRODUCTS_LIMIT
  ) {
    const issues: CatalogQueryIssue[] = [
      {
        field: "limit",
        code: "out-of-range",
        message: `limit must be a positive integer less than or equal to ${MAX_FEATURED_PRODUCTS_LIMIT}.`,
      },
    ];

    return {
      error: {
        code: "INVALID_CATALOG_QUERY",
        message: "Invalid catalog query.",
        issues,
      },
    };
  }

  return { value: parsedValue };
}
