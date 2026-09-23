import "server-only";

import type { AdminAuditContext, AppendAdminAuditEvent } from "@/lib/admin/audit-repository";

import { validateAdminProductInput, type AdminProductInput } from "./admin-contracts";
import {
  createPrismaAdminCatalogRepository,
  type AdminCatalogRepository,
  type AdminCatalogTransaction,
} from "./prisma-admin-repository";

export type AdminCatalogActor = {
  membershipId: string;
  actorSupabaseUserId: string;
};

export type AdminCatalogErrorCode =
  | "INVALID_ADMIN_PRODUCT"
  | "CATALOG_REFERENCE_NOT_FOUND"
  | "CATALOG_PRODUCT_NOT_FOUND"
  | "CATALOG_CONFLICT"
  | "CATALOG_ARCHIVE_CONFLICT"
  | "CATALOG_RESTORE_CONFLICT"
  | "ADMIN_AUDIT_UNAVAILABLE"
  | "ADMIN_CATALOG_UNAVAILABLE";

export class AdminCatalogError extends Error {
  constructor(readonly code: AdminCatalogErrorCode) {
    super(code);
    this.name = "AdminCatalogError";
  }
}

type CreateProductCommand = { actor: AdminCatalogActor; input: unknown };
type UpdateProductCommand = CreateProductCommand & { productId: string };
type ArchiveProductCommand = { actor: AdminCatalogActor; productId: string };
type RestoreProductCommand = { actor: AdminCatalogActor; productId: string };
type ListProductsCommand = { actor: AdminCatalogActor; page: number; limit: number };

export function createAdminCatalogService({ repository = createPrismaAdminCatalogRepository() }: { repository?: AdminCatalogRepository } = {}) {
  return {
    async listProducts({ actor, page, limit }: ListProductsCommand) {
      return execute(repository, async (tx) => {
        const result = await tx.listProducts({ page, limit });
        await appendAudit(tx, actor, "CATALOG_PRODUCT_LIST", "Catalog", "products", "SUCCEEDED", { page, limit });
        return result;
      });
    },

    async createProduct({ actor, input }: CreateProductCommand) {
      assertValidInput(input);
      return execute(repository, async (tx) => {
        const product = await tx.createProduct(input);
        await tx.createVariants(product.id, input.variants);
        await tx.createImages(product.id, input.images);
        await appendAudit(tx, actor, "CATALOG_PRODUCT_CREATE", "Product", product.id, "SUCCEEDED", aggregateContext(input));
        return { id: product.id, ...input };
      });
    },

    async updateProduct({ actor, productId, input }: UpdateProductCommand) {
      assertValidInput(input);
      return execute(repository, async (tx) => {
        // Capture paths in the database transaction, before replacement, so Storage
        // cleanup can only occur after the aggregate (including its audit) commits.
        const previousStoragePaths = await tx.listImageStoragePaths(productId);
        await tx.updateProduct(productId, input);
        await tx.replaceVariants(productId, input.variants);
        await tx.replaceImages(productId, input.images);
        await appendAudit(tx, actor, "CATALOG_PRODUCT_UPDATE", "Product", productId, "SUCCEEDED", {
          ...aggregateContext(input),
          changedFields: "name,slug,description,categoryId,brandId,price,compareAtPrice,featured,status,variants,images",
        });
        const retainedStoragePaths = new Set(input.images.flatMap((image) => image.storagePath?.trim() ? [image.storagePath.trim()] : []));
        const storagePathsToDelete = [...new Set(previousStoragePaths.map((path) => path.trim()).filter(Boolean))]
          .filter((path) => !retainedStoragePaths.has(path));
        return { id: productId, ...input, storagePathsToDelete };
      });
    },

    async archiveProduct({ actor, productId }: ArchiveProductCommand) {
      return execute(repository, async (tx) => {
        const product = await tx.archiveProduct(productId);
        await appendAudit(tx, actor, "CATALOG_PRODUCT_ARCHIVE", "Product", productId, "SUCCEEDED", { status: "archived" });
        return product;
      });
    },

    async restoreProduct({ actor, productId }: RestoreProductCommand) {
      return execute(repository, async (tx) => {
        const product = await tx.restoreProduct(productId);
        await appendAudit(tx, actor, "CATALOG_PRODUCT_RESTORE", "Product", productId, "SUCCEEDED", { status: "draft" });
        return product;
      });
    },
  };
}

export const adminCatalogService = createAdminCatalogService();

function assertValidInput(input: unknown): asserts input is AdminProductInput {
  const validationError = validateAdminProductInput(input);
  if (validationError) throw new AdminCatalogError(validationError.code);
}

async function appendAudit(
  tx: AdminCatalogTransaction,
  actor: AdminCatalogActor,
  action: string,
  entityType: string,
  entityId: string,
  outcome: AppendAdminAuditEvent["outcome"],
  context: AdminAuditContext,
) {
  try {
    await tx.appendAudit({ ...actor, action, entityType, entityId, outcome, context });
  } catch {
    throw new AdminCatalogError("ADMIN_AUDIT_UNAVAILABLE");
  }
}

async function execute<T>(repository: AdminCatalogRepository, work: (tx: AdminCatalogTransaction) => Promise<T>): Promise<T> {
  try {
    return await repository.transaction(work) as T;
  } catch (error) {
    throw normalizeCatalogError(error);
  }
}

function normalizeCatalogError(error: unknown): AdminCatalogError {
  if (error instanceof AdminCatalogError) return error;
  if (error instanceof Error) {
    if (isCatalogErrorCode(error.message)) return new AdminCatalogError(error.message);
  }
  const prismaCode = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
  if (prismaCode === "P2002") return new AdminCatalogError("CATALOG_CONFLICT");
  if (prismaCode === "P2025") return new AdminCatalogError("CATALOG_PRODUCT_NOT_FOUND");
  return new AdminCatalogError("ADMIN_CATALOG_UNAVAILABLE");
}

function isCatalogErrorCode(value: string): value is AdminCatalogErrorCode {
  return ["INVALID_ADMIN_PRODUCT", "CATALOG_REFERENCE_NOT_FOUND", "CATALOG_PRODUCT_NOT_FOUND", "CATALOG_CONFLICT", "CATALOG_ARCHIVE_CONFLICT", "CATALOG_RESTORE_CONFLICT", "ADMIN_AUDIT_UNAVAILABLE", "ADMIN_CATALOG_UNAVAILABLE"].includes(value);
}

function aggregateContext(input: AdminProductInput): AdminAuditContext {
  return {
    slug: input.slug,
    status: input.status,
    variantCount: input.variants.length,
    imageCount: input.images.length,
  };
}

export function getAdminCatalogErrorCode(error: unknown): AdminCatalogErrorCode {
  return normalizeCatalogError(error).code;
}

export function getAdminCatalogErrorStatus(error: unknown): 400 | 404 | 409 | 503 {
  switch (getAdminCatalogErrorCode(error)) {
    case "INVALID_ADMIN_PRODUCT": return 400;
    case "CATALOG_REFERENCE_NOT_FOUND":
    case "CATALOG_PRODUCT_NOT_FOUND": return 404;
    case "CATALOG_CONFLICT":
    case "CATALOG_ARCHIVE_CONFLICT": return 409;
    case "CATALOG_RESTORE_CONFLICT": return 409;
    default: return 503;
  }
}
