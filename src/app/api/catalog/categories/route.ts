import { NextResponse } from "next/server";

import { publicCatalogRepository } from "@/lib/catalog/prisma-public-repository";

export const runtime = "nodejs";

export async function GET() {
  const categories = await publicCatalogRepository.listCategories();

  return NextResponse.json(categories);
}