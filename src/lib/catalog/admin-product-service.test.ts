import { describe, expect, it } from "vitest";

import { createAdminCatalogService } from "./admin-product-service";
import type { AdminCatalogRepository, AdminCatalogTransaction } from "./prisma-admin-repository";

const actor = {
  membershipId: "11111111-1111-4111-8111-111111111111",
  actorSupabaseUserId: "22222222-2222-4222-8222-222222222222",
};
const input = {
  name: "Control FG Verde",
  slug: "control-fg-verde",
  description: "A durable football boot for firm ground.",
  categoryId: "33333333-3333-4333-8333-333333333333",
  brandId: "44444444-4444-4444-8444-444444444444",
  price: 112000,
  compareAtPrice: null,
  featured: false,
  status: "draft",
  variants: [{ name: "Verde / 40 / FG", sku: "AC-FG-VER-40", stock: 4, isActive: true }],
  images: [{ url: "/catalog/products/control-fg-verde-1.png", alt: "Control FG Verde lateral view", position: 1, isPrimary: true, variantSku: "AC-FG-VER-40" }],
};

describe("admin catalog aggregate transactions", () => {
  it("rolls back a product, variants, and images when the success audit cannot be appended", async () => {
    const committed = { products: 0, variants: 0, images: 0, audits: 0 };
    const transactionImpl = async <T>(
      work: (tx: AdminCatalogTransaction) => Promise<T>,
    ): Promise<T> => {
      const staged = { ...committed };
      const tx: AdminCatalogTransaction = {
        listProducts: async () => {
          throw new Error("Unexpected listProducts call");
        },
        createProduct: async () => {
          staged.products += 1;
          return { id: "product-1" };
        },
        createVariants: async () => { staged.variants += 1; },
        createImages: async () => { staged.images += 1; },
        updateProduct: async () => {
          throw new Error("Unexpected updateProduct call");
        },
        listImageStoragePaths: async () => [],
        replaceVariants: async () => {
          throw new Error("Unexpected replaceVariants call");
        },
        replaceImages: async () => {
          throw new Error("Unexpected replaceImages call");
        },
        archiveProduct: async () => {
          throw new Error("Unexpected archiveProduct call");
        },
        restoreProduct: async () => {
          throw new Error("Unexpected restoreProduct call");
        },
        appendAudit: async () => {
          staged.audits += 1;
          throw new Error("ADMIN_AUDIT_UNAVAILABLE");
        },
      };
      const result = await work(tx);
      Object.assign(committed, staged);
      return result;
    };
    let transactionCalls = 0;
    const transaction: AdminCatalogRepository["transaction"] = async <T>(
      work: (tx: AdminCatalogTransaction) => Promise<T>,
    ): Promise<T> => {
      transactionCalls += 1;
      return transactionImpl(work);
    };
    const service = createAdminCatalogService({ repository: { transaction } });

    await expect(service.createProduct({ actor, input })).rejects.toMatchObject({
      code: "ADMIN_AUDIT_UNAVAILABLE",
    });
    expect(transactionCalls).toBe(1);
    expect(committed).toEqual({ products: 0, variants: 0, images: 0, audits: 0 });
  });

  it("restores only through the transaction and records the restore audit", async () => {
    const calls: string[] = [];
    const transaction: AdminCatalogRepository["transaction"] = async <T>(work: (tx: AdminCatalogTransaction) => Promise<T>): Promise<T> => work({
      listProducts: async () => { throw new Error("Unexpected listProducts call"); },
      createProduct: async () => { throw new Error("Unexpected createProduct call"); },
      createVariants: async () => { throw new Error("Unexpected createVariants call"); },
      createImages: async () => { throw new Error("Unexpected createImages call"); },
      updateProduct: async () => { throw new Error("Unexpected updateProduct call"); },
      listImageStoragePaths: async () => [],
      replaceVariants: async () => { throw new Error("Unexpected replaceVariants call"); },
      replaceImages: async () => { throw new Error("Unexpected replaceImages call"); },
      archiveProduct: async () => { throw new Error("Unexpected archiveProduct call"); },
      restoreProduct: async (productId) => {
        calls.push(`restore:${productId}`);
        return { id: productId, status: "draft", isActive: true, featured: false };
      },
      appendAudit: async (event) => { calls.push(`${event.action}:${event.context.status}`); },
    });
    const service = createAdminCatalogService({ repository: { transaction } });

    await expect(service.restoreProduct({ actor, productId: "product-1" })).resolves.toEqual({
      id: "product-1", status: "draft", isActive: true, featured: false,
    });
    expect(calls).toEqual(["restore:product-1", "CATALOG_PRODUCT_RESTORE:draft"]);
  });

  it("captures removed Storage paths before replacing images and never deletes legacy URLs", async () => {
    const calls: string[] = [];
    const transaction: AdminCatalogRepository["transaction"] = async <T>(work: (tx: AdminCatalogTransaction) => Promise<T>): Promise<T> => work({
      listProducts: async () => { throw new Error("Unexpected listProducts call"); },
      createProduct: async () => { throw new Error("Unexpected createProduct call"); },
      createVariants: async () => { throw new Error("Unexpected createVariants call"); },
      createImages: async () => { throw new Error("Unexpected createImages call"); },
      updateProduct: async () => { calls.push("update"); },
      listImageStoragePaths: async () => { calls.push("paths"); return ["products/product-1/removed.webp", ""]; },
      replaceVariants: async () => { calls.push("variants"); },
      replaceImages: async () => { calls.push("images"); },
      archiveProduct: async () => { throw new Error("Unexpected archiveProduct call"); },
      restoreProduct: async () => { throw new Error("Unexpected restoreProduct call"); },
      appendAudit: async () => { calls.push("audit"); },
    });
    const service = createAdminCatalogService({ repository: { transaction } });
    const inputWithStoredImage = {
      ...input,
      images: [{ ...input.images[0], storagePath: "products/product-1/retained.webp", mimeType: "image/webp", sizeBytes: 123 }],
    };

    await expect(service.updateProduct({ actor, productId: "product-1", input: inputWithStoredImage })).resolves.toMatchObject({
      storagePathsToDelete: ["products/product-1/removed.webp"],
    });
    expect(calls).toEqual(["paths", "update", "variants", "images", "audit"]);
  });
});
