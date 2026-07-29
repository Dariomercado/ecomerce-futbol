import type { ProductDetail, ProductVariantDto } from "@/lib/catalog/public-contracts";

export type CartSelection = Pick<ProductDetail, "id" | "slug" | "name" | "currency"> & {
  price: number;
  stock: number | null;
  variant: Pick<ProductVariantDto, "id" | "name" | "size" | "color"> | null;
};

export type CartItem = CartSelection & { quantity: number; lineId: string };
