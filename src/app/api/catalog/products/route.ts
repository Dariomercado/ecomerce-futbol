import { NextResponse } from "next/server";

import {
  DEFAULT_CATALOG_LIMIT,
  DEFAULT_CATALOG_PAGE,
  DEFAULT_PRODUCT_SORT,
  MAX_CATALOG_LIMIT,
  type CatalogQueryIssue,
  type CatalogValidationError,
  type ProductListQuery,
  type ProductSort,
} from "@/lib/catalog/public-contracts";
import { publicCatalogRepository } from "@/lib/catalog/prisma-public-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = parseProductListQuery(new URL(request.url).searchParams);

  if ("error" in query) {
    return NextResponse.json(query.error, { status: 400 });
  }

  const products = await publicCatalogRepository.findProducts(query.value);

  return NextResponse.json(products);
}

type ParsedProductListQuery =
  | { value: ProductListQuery }
  | { error: CatalogValidationError };

const PRODUCT_SORTS = new Set<ProductSort>([
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
]);

function parseProductListQuery(
  searchParams: URLSearchParams,
): ParsedProductListQuery {
  const issues: CatalogQueryIssue[] = [];

  const page = parseIntegerParam(
    searchParams,
    "page",
    DEFAULT_CATALOG_PAGE,
    issues,
  );
  const limit = parseIntegerParam(
    searchParams,
    "limit",
    DEFAULT_CATALOG_LIMIT,
    issues,
    MAX_CATALOG_LIMIT,
  );
  const sort = parseSortParam(searchParams, issues);
  const minPrice = parseNumberParam(searchParams, "minPrice", issues);
  const maxPrice = parseNumberParam(searchParams, "maxPrice", issues);
  const featured = parseBooleanParam(searchParams, "featured", issues);

  if (
    minPrice !== undefined &&
    maxPrice !== undefined &&
    minPrice > maxPrice
  ) {
    issues.push({
      field: "minPrice",
      code: "invalid-price-range",
      message: "minPrice must be less than or equal to maxPrice.",
    });
  }

  if (issues.length > 0) {
    return {
      error: {
        code: "INVALID_CATALOG_QUERY",
        message: "Invalid catalog query.",
        issues,
      },
    };
  }

  return {
    value: {
      page,
      limit,
      sort,
      ...stringParam(searchParams, "category"),
      ...stringParam(searchParams, "brand"),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
      ...stringParam(searchParams, "search"),
      ...(featured !== undefined ? { featured } : {}),
    },
  };
}

function parseIntegerParam(
  searchParams: URLSearchParams,
  field: "page" | "limit",
  defaultValue: number,
  issues: CatalogQueryIssue[],
  maxValue?: number,
): number {
  const value = searchParams.get(field);

  if (value === null || value.trim() === "") {
    return defaultValue;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    issues.push({
      field,
      code: "out-of-range",
      message: `${field} must be a positive integer.`,
    });

    return defaultValue;
  }

  if (maxValue !== undefined && parsedValue > maxValue) {
    issues.push({
      field,
      code: "out-of-range",
      message: `${field} must be less than or equal to ${maxValue}.`,
    });

    return defaultValue;
  }

  return parsedValue;
}

function parseSortParam(
  searchParams: URLSearchParams,
  issues: CatalogQueryIssue[],
): ProductSort {
  const value = searchParams.get("sort");

  if (value === null || value.trim() === "") {
    return DEFAULT_PRODUCT_SORT;
  }

  if (!PRODUCT_SORTS.has(value as ProductSort)) {
    issues.push({
      field: "sort",
      code: "unsupported-sort",
      message: "sort must be one of: newest, price-asc, price-desc, name-asc.",
    });

    return DEFAULT_PRODUCT_SORT;
  }

  return value as ProductSort;
}

function parseNumberParam(
  searchParams: URLSearchParams,
  field: "minPrice" | "maxPrice",
  issues: CatalogQueryIssue[],
): number | undefined {
  const value = searchParams.get(field);

  if (value === null || value.trim() === "") {
    return undefined;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    issues.push({
      field,
      code: "out-of-range",
      message: `${field} must be a non-negative number.`,
    });

    return undefined;
  }

  return parsedValue;
}

function parseBooleanParam(
  searchParams: URLSearchParams,
  field: "featured",
  issues: CatalogQueryIssue[],
): boolean | undefined {
  const value = searchParams.get(field);

  if (value === null || value.trim() === "") {
    return undefined;
  }

  if (value !== "true" && value !== "false") {
    issues.push({
      field,
      code: "invalid-value",
      message: `${field} must be true or false.`,
    });

    return undefined;
  }

  return value === "true";
}

function stringParam(
  searchParams: URLSearchParams,
  field: "category" | "brand" | "search",
): Partial<Pick<ProductListQuery, typeof field>> {
  const value = searchParams.get(field)?.trim();

  return value ? { [field]: value } : {};
}
