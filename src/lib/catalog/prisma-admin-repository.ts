import "server-only";

import { Prisma, ProductStatus, type PrismaClient } from "@prisma/client";

import type { AppendAdminAuditEvent } from "@/lib/admin/audit-repository";
import { prisma } from "@/lib/prisma";

import type { AdminProductImageInput, AdminProductInput, AdminProductVariantInput } from "./admin-contracts";

type ProductId = { id: string };
type ArchivedProduct = { id: string; status: "archived"; isActive: false };

export type AdminCatalogTransaction = {
  listProducts(input: { page: number; limit: number }): Promise<unknown>;
  createProduct(input: AdminProductInput): Promise<ProductId>;
  createVariants(productId: string, variants: AdminProductVariantInput[]): Promise<void>;
  createImages(productId: string, images: AdminProductImageInput[]): Promise<void>;
  updateProduct(productId: string, input: AdminProductInput): Promise<void>;
  replaceVariants(productId: string, variants: AdminProductVariantInput[]): Promise<void>;
  replaceImages(productId: string, images: AdminProductImageInput[]): Promise<void>;
  archiveProduct(productId: string): Promise<ArchivedProduct>;
  appendAudit(event: AppendAdminAuditEvent): Promise<void>;
};

export type AdminCatalogRepository = {
  transaction<T>(work: (tx: AdminCatalogTransaction) => Promise<T>): Promise<T>;
};

/**
 * Keeps all aggregate writes and their success audit in the same PostgreSQL
 * transaction. Public repositories remain read-only and never use this port.
 */
export function createPrismaAdminCatalogRepository(client: PrismaClient = prisma): AdminCatalogRepository {
  return {
    transaction(work) {
      return client.$transaction((database) => work(createTransaction(database)));
    },
  };
}

function createTransaction(database: Prisma.TransactionClient): AdminCatalogTransaction {
  return {
    async listProducts({ page, limit }) {
      const [data, total] = await Promise.all([
        database.product.findMany({
          include: {
            category: true,
            brand: true,
            variants: { orderBy: [{ sku: "asc" }, { id: "asc" }] },
            images: { orderBy: [{ position: "asc" }, { id: "asc" }] },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        database.product.count(),
      ]);
      return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },

    async createProduct(input) {
      await ensureActiveReferences(database, input);
      return database.product.create({ data: productData(input) });
    },

    async createVariants(productId, variants) {
      await assertSkuOwnership(database, productId, variants);
      for (const variant of variants) {
        await database.productVariant.create({ data: variantData(productId, variant) });
      }
    },

    async createImages(productId, images) {
      const variantIds = await variantIdsBySku(database, productId, images);
      for (const image of images) {
        await database.productImage.create({ data: imageData(productId, image, variantIds) });
      }
    },

    async updateProduct(productId, input) {
      await assertMutableProduct(database, productId);
      await ensureActiveReferences(database, input);
      await database.product.update({ where: { id: productId }, data: productData(input) });
    },

    async replaceVariants(productId, variants) {
      await assertSkuOwnership(database, productId, variants);
      await database.productVariant.updateMany({ where: { productId }, data: { isActive: false } });
      for (const variant of variants) {
        await database.productVariant.upsert({
          where: { sku: variant.sku },
          create: variantData(productId, variant),
          update: variantData(productId, variant),
        });
      }
    },

    async replaceImages(productId, images) {
      await database.productImage.deleteMany({ where: { productId } });
      const variantIds = await variantIdsBySku(database, productId, images);
      for (const image of images) {
        await database.productImage.create({ data: imageData(productId, image, variantIds) });
      }
    },

    async archiveProduct(productId) {
      const product = await database.product.findUnique({ where: { id: productId }, select: { id: true, status: true } });
      if (!product) throw new Error("CATALOG_PRODUCT_NOT_FOUND");
      if (product.status === ProductStatus.ARCHIVED) throw new Error("CATALOG_ARCHIVE_CONFLICT");
      await database.product.update({
        where: { id: productId },
        data: { status: ProductStatus.ARCHIVED, isActive: false, featured: false },
      });
      return { id: productId, status: "archived", isActive: false };
    },

    async appendAudit(event) {
      await database.adminAuditEvent.create({ data: event });
    },
  };
}

async function ensureActiveReferences(database: Prisma.TransactionClient, input: AdminProductInput) {
  const [category, brand] = await Promise.all([
    database.category.findFirst({ where: { id: input.categoryId, isActive: true }, select: { id: true } }),
    database.brand.findFirst({ where: { id: input.brandId, isActive: true }, select: { id: true } }),
  ]);
  if (!category || !brand) throw new Error("CATALOG_REFERENCE_NOT_FOUND");
}

async function assertMutableProduct(database: Prisma.TransactionClient, productId: string) {
  const product = await database.product.findUnique({ where: { id: productId }, select: { id: true, status: true } });
  if (!product) throw new Error("CATALOG_PRODUCT_NOT_FOUND");
  if (product.status === ProductStatus.ARCHIVED) throw new Error("CATALOG_ARCHIVE_CONFLICT");
}

async function assertSkuOwnership(database: Prisma.TransactionClient, productId: string, variants: AdminProductVariantInput[]) {
  const rows = await database.productVariant.findMany({
    where: { sku: { in: variants.map((variant) => variant.sku) } },
    select: { sku: true, productId: true },
  });
  if (rows.some((row) => row.productId !== productId)) {
    throw new Error("CATALOG_CONFLICT");
  }
}

async function variantIdsBySku(database: Prisma.TransactionClient, productId: string, images: AdminProductImageInput[]) {
  const skus = images.flatMap((image) => image.variantSku ? [image.variantSku] : []);
  if (skus.length === 0) return new Map<string, string>();
  const variants = await database.productVariant.findMany({
    where: { productId, sku: { in: skus } },
    select: { id: true, sku: true },
  });
  const ids = new Map<string, string>();
  for (const variant of variants) {
    if (variant.sku) ids.set(variant.sku, variant.id);
  }
  if (ids.size !== new Set(skus).size) throw new Error("INVALID_ADMIN_PRODUCT");
  return ids;
}

function productData(input: AdminProductInput) {
  return {
    name: input.name.trim(),
    slug: input.slug.trim(),
    description: input.description.trim(),
    categoryId: input.categoryId,
    brandId: input.brandId,
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    featured: input.featured,
    status: input.status === "published" ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
    isActive: true,
  };
}

function variantData(productId: string, variant: AdminProductVariantInput) {
  return {
    productId,
    name: variant.name.trim(),
    size: variant.size?.trim() || null,
    color: variant.color?.trim() || null,
    surface: variant.surface?.trim() || null,
    price: variant.price ?? null,
    sku: variant.sku.trim(),
    stock: variant.stock,
    isActive: variant.isActive,
  };
}

function imageData(productId: string, image: AdminProductImageInput, variantIds: Map<string, string>) {
  return {
    productId,
    variantId: image.variantSku ? variantIds.get(image.variantSku) ?? null : null,
    url: image.url.trim(),
    alt: image.alt.trim(),
    position: image.position,
    isPrimary: image.isPrimary,
  };
}
