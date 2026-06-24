import type {
  BrandSummary,
  CategorySummary,
  PaginatedResult,
  ProductDetail,
  ProductListQuery,
  ProductSummary,
} from "./public-contracts";

export interface PublicCatalogRepository {
  findProducts(
    query: ProductListQuery,
  ): Promise<PaginatedResult<ProductSummary>>;
  findProductBySlug(slug: string): Promise<ProductDetail | null>;
  findFeaturedProducts(limit: number): Promise<ProductSummary[]>;
  listCategories(): Promise<CategorySummary[]>;
  listBrands(): Promise<BrandSummary[]>;
}
