import { brands, categories, products } from "@/lib/catalog/mock-data";
import type { Brand, Category, CategorySlug, Product, ProductWithRelations } from "@/lib/catalog/types";

const isPublicProduct = (product: Product) =>
  product.isActive && product.status === "published";

const byPosition = <T extends { position: number }>(items: T[]) =>
  [...items].sort((a, b) => a.position - b.position);

const withRelations = (product: Product): ProductWithRelations | null => {
  const category = categories.find(
    (currentCategory) => currentCategory.id === product.categoryId && currentCategory.isActive,
  );
  const brand = brands.find(
    (currentBrand) => currentBrand.id === product.brandId && currentBrand.isActive,
  );

  if (!category || !brand) {
    return null;
  }

  return {
    ...product,
    images: byPosition(product.images),
    variants: product.variants.filter((variant) => variant.isActive),
    category,
    brand,
  };
};

export const getCategories = (): Category[] =>
  categories.filter((category) => category.isActive);

export const getBrands = (): Brand[] => brands.filter((brand) => brand.isActive);

export const getProducts = (): ProductWithRelations[] =>
  products
    .filter(isPublicProduct)
    .map(withRelations)
    .filter((product): product is ProductWithRelations => product !== null);

export const getProductBySlug = (slug: string): ProductWithRelations | undefined =>
  getProducts().find((product) => product.slug === slug);

export const getFeaturedProducts = (): ProductWithRelations[] =>
  getProducts().filter((product) => product.featured);

export const getProductsByCategory = (
  categorySlug: CategorySlug,
): ProductWithRelations[] =>
  getProducts().filter((product) => product.categorySlug === categorySlug);

export const getProductsByBrand = (brandSlug: string): ProductWithRelations[] =>
  getProducts().filter((product) => product.brandSlug === brandSlug);
