export type CategorySlug = "botines" | "camisetas" | "entrenamiento" | "accesorios";

export type CurrencyCode = "ARS";

export type ProductStatus = "published" | "draft" | "archived";

export type VariantSize =
  | "XS"
  | "S"
  | "M"
  | "L"
  | "XL"
  | "39"
  | "40"
  | "41"
  | "42"
  | "Único";

export type VariantSurface = "FG" | "TF" | "Indoor";

export type Category = {
  id: string;
  name: string;
  slug: CategorySlug;
  description: string;
  imageUrl?: string;
  parentId: string | null;
  isActive: boolean;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductImage = {
  id: string;
  productId: string;
  variantId: string | null;
  url: string;
  alt: string;
  position: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductVariant = {
  id: string;
  productId: string;
  name: string;
  size: VariantSize | null;
  color: string | null;
  surface: VariantSurface | null;
  stock: number;
  price: number | null;
  sku: string | null;
  isActive: boolean;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  categorySlug: CategorySlug;
  brandId: string;
  brandSlug: string;
  price: number;
  compareAtPrice: number | null;
  currency: CurrencyCode;
  featured: boolean;
  status: ProductStatus;
  isActive: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
};

export type ProductWithRelations = Product & {
  category: Category;
  brand: Brand;
};
