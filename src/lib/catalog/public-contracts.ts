export const DEFAULT_CATALOG_PAGE = 1;
export const DEFAULT_CATALOG_LIMIT = 12;
export const MAX_CATALOG_LIMIT = 48;
export const DEFAULT_PRODUCT_SORT = "newest" as const;

export type ProductSort =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name-asc";

export type CatalogCurrency = "ARS";

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
}

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
}

export interface ProductImageDto {
  id: string;
  url: string;
  alt: string;
  position: number;
  isPrimary: boolean;
  variantId: string | null;
}

export interface ProductVariantDto {
  id: string;
  name: string;
  size: string | null;
  color: string | null;
  surface: string | null;
  price: number | null;
  sku: string | null;
  stock: number;
}

export interface ProductCardCategoryRef {
  name: string;
  slug: string;
}

export interface ProductCardBrandRef {
  name: string;
  slug: string;
}

export interface ProductCardImage {
  url: string;
  alt: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  currency: CatalogCurrency;
  featured: boolean;
  primaryImage: ProductCardImage | null;
  category: ProductCardCategoryRef;
  brand: ProductCardBrandRef;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  currency: CatalogCurrency;
  featured: boolean;
  category: CategorySummary;
  brand: BrandSummary;
  images: ProductImageDto[];
  activeVariants: ProductVariantDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductListQuery {
  page: number;
  limit: number;
  sort: ProductSort;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  featured?: boolean;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export type CatalogQueryIssueCode =
  | "invalid-value"
  | "out-of-range"
  | "unsupported-sort"
  | "invalid-price-range";

export interface CatalogQueryIssue {
  field: keyof ProductListQuery;
  code: CatalogQueryIssueCode;
  message: string;
}

export interface CatalogValidationError {
  code: "INVALID_CATALOG_QUERY";
  message: string;
  issues: CatalogQueryIssue[];
}
