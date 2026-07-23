import { NextResponse } from "next/server";

import { publicCatalogRepository } from "@/lib/catalog/prisma-public-repository";
import { catalogUnavailableResponse } from "@/lib/catalog/public-route-errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories = await publicCatalogRepository.listCategories();

    return NextResponse.json(categories);
  } catch {
    return catalogUnavailableResponse();
  }
}
