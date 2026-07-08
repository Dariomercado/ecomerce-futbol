import { NextResponse } from "next/server";

import { publicCatalogRepository } from "@/lib/catalog/prisma-public-repository";

export const runtime = "nodejs";

export async function GET() {
  const brands = await publicCatalogRepository.listBrands();

  return NextResponse.json(brands);
}