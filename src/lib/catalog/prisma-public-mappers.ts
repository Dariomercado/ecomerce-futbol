import type {
  Brand,
  Category,
  Product,
  ProductImage,
  ProductVariant,
} from "@prisma/client";

import type {
  BrandSummary,
  CatalogCurrency,
  CategorySummary,
  ProductCardImage,
  ProductDetail,
  ProductImageDto,
  ProductSummary,
  ProductVariantDto,
} from "./public-contracts";

export type ProductSummaryPayload = Product & {
  category: Category;
  brand: Brand;
  images: ProductImage[];
};

export type ProductDetailPayload = ProductSummaryPayload & {
  variants: ProductVariant[];
};

export function mapCategorySummary(category: Category): CategorySummary {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
  };
}

export function mapBrandSummary(brand: Brand): BrandSummary {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    description: brand.description,
    logoUrl: brand.logoUrl,
  };
}

export function mapProductSummary(
  product: ProductSummaryPayload,
): ProductSummary {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency as CatalogCurrency,
    featured: product.featured,
    primaryImage: mapPrimaryImage(product.images),
    category: {
      name: product.category.name,
      slug: product.category.slug,
    },
    brand: {
      name: product.brand.name,
      slug: product.brand.slug,
    },
  };
}

export function mapProductDetail(product: ProductDetailPayload): ProductDetail {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency as CatalogCurrency,
    featured: product.featured,
    category: mapCategorySummary(product.category),
    brand: mapBrandSummary(product.brand),
    images: sortImagesByPosition(product.images).map(mapProductImage),
    activeVariants: product.variants
      .filter((variant) => variant.isActive)
      .map(mapProductVariant),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function mapPrimaryImage(images: ProductImage[]): ProductCardImage | null {
  const sortedImages = sortImagesByPosition(images);
  const primaryImage =
    sortedImages.find((image) => image.isPrimary) ?? sortedImages[0] ?? null;

  if (!primaryImage) {
    return null;
  }

  return {
    url: primaryImage.url,
    alt: primaryImage.alt,
  };
}

function mapProductImage(image: ProductImage): ProductImageDto {
  return {
    id: image.id,
    url: image.url,
    alt: image.alt,
    position: image.position,
    isPrimary: image.isPrimary,
    variantId: image.variantId,
  };
}

function mapProductVariant(variant: ProductVariant): ProductVariantDto {
  return {
    id: variant.id,
    name: variant.name,
    size: variant.size,
    color: variant.color,
    surface: variant.surface,
    price: variant.price,
    sku: variant.sku,
    stock: variant.stock,
  };
}

function sortImagesByPosition(images: ProductImage[]): ProductImage[] {
  return [...images].sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }

    return left.id.localeCompare(right.id);
  });
}
