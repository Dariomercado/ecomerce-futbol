import { NextResponse } from "next/server";

import { publicCatalogRepository } from "@/lib/catalog/prisma-public-repository";
import { catalogUnavailableResponse } from "@/lib/catalog/public-route-errors";

export const runtime = "nodejs";

type ProductDetailRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: ProductDetailRouteContext,
) {
  try {
    const { slug } = await params;
    const product = await publicCatalogRepository.findProductBySlug(slug);

    if (!product) {
      return NextResponse.json(
        {
          code: "PRODUCT_NOT_FOUND",
          message: "Product not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(product);
  } catch {
    return catalogUnavailableResponse();
  }
}
