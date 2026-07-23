import { NextResponse } from "next/server";

import { publicCatalogRepository } from "@/lib/catalog/prisma-public-repository";
import { catalogUnavailableResponse } from "@/lib/catalog/public-route-errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const brands = await publicCatalogRepository.listBrands();

    return NextResponse.json(brands);
  } catch {
    return catalogUnavailableResponse();
  }
}
