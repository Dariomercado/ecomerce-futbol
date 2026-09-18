import { describe, expect, it } from "vitest";

import { validateAdminProductInput } from "./admin-contracts";

const validProduct = {
  name: "Control FG Verde",
  slug: "control-fg-verde",
  description: "A durable football boot for firm ground.",
  categoryId: "11111111-1111-4111-8111-111111111111",
  brandId: "22222222-2222-4222-8222-222222222222",
  price: 112000,
  compareAtPrice: 132000,
  featured: true,
  status: "published",
  variants: [
    {
      name: "Verde / 40 / FG",
      size: "40",
      color: "Verde",
      surface: "FG",
      price: null,
      sku: "AC-FG-VER-40",
      stock: 4,
      isActive: true,
    },
  ],
  images: [
    {
      url: "/catalog/products/control-fg-verde-1.png",
      alt: "Control FG Verde lateral view",
      position: 1,
      isPrimary: true,
      variantSku: "AC-FG-VER-40",
    },
  ],
};

describe("admin catalog aggregate validation", () => {
  it("accepts a complete product aggregate with a valid image-to-variant reference", () => {
    expect(validateAdminProductInput(validProduct)).toBeNull();
  });

  it("rejects missing required fields and invalid ARS prices", () => {
    expect(validateAdminProductInput({ ...validProduct, name: "", price: 0 })).toMatchObject({
      code: "INVALID_ADMIN_PRODUCT",
      issues: expect.arrayContaining([
        expect.objectContaining({ field: "name" }),
        expect.objectContaining({ field: "price" }),
      ]),
    });
    expect(validateAdminProductInput({ ...validProduct, compareAtPrice: validProduct.price })).toMatchObject({
      code: "INVALID_ADMIN_PRODUCT",
      issues: expect.arrayContaining([expect.objectContaining({ field: "compareAtPrice" })]),
    });
  });

  it("rejects image primary and position violations before any persistence work", () => {
    expect(validateAdminProductInput({
      ...validProduct,
      images: [
        ...validProduct.images,
        { ...validProduct.images[0], url: "/catalog/products/control-fg-verde-2.png" },
      ],
    })).toMatchObject({
      code: "INVALID_ADMIN_PRODUCT",
      issues: expect.arrayContaining([
        expect.objectContaining({ field: "images" }),
        expect.objectContaining({ field: "images.1.position" }),
      ]),
    });
    expect(validateAdminProductInput({ ...validProduct, images: [] })).toMatchObject({
      code: "INVALID_ADMIN_PRODUCT",
      issues: expect.arrayContaining([expect.objectContaining({ field: "images" })]),
    });
  });

  it("rejects duplicate SKUs, invalid stock, and image references outside the submitted aggregate", () => {
    expect(validateAdminProductInput({
      ...validProduct,
      variants: [
        ...validProduct.variants,
        { ...validProduct.variants[0], name: "Verde / 41 / FG", stock: -1 },
      ],
      images: [{ ...validProduct.images[0], variantSku: "UNKNOWN-SKU" }],
    })).toMatchObject({
      code: "INVALID_ADMIN_PRODUCT",
      issues: expect.arrayContaining([
        expect.objectContaining({ field: "variants.1.sku" }),
        expect.objectContaining({ field: "variants.1.stock" }),
        expect.objectContaining({ field: "images.0.variantSku" }),
      ]),
    });
  });
});
