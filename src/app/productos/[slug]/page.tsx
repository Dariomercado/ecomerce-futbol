import { notFound } from "next/navigation";

import { GET as getProductDetail } from "@/app/api/catalog/products/[slug]/route";
import { ProductDetailApiContent } from "@/components/catalog/product-detail-api-content";

export const dynamic = "force-dynamic";

type ProductDetailPageProps = { params: Promise<{ slug: string }> };

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const response = await getProductDetail(
    new Request("http://catalog.internal/api/catalog/products"),
    { params: Promise.resolve({ slug }) },
  );
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Unable to load product detail.");
  const product = await response.json();
  return <ProductDetailApiContent product={product} />;
}
