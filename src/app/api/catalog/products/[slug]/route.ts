import { NextResponse } from "next/server";

import { publicCatalogRepository } from "@/lib/catalog/prisma-public-repository";

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
}