import { Prisma, ProductStatus, type PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { ProductListQuery, ProductSort } from "./public-contracts";
import type { PublicCatalogRepository } from "./public-repository";
import {
  mapBrandSummary,
  mapCategorySummary,
  mapProductDetail,
  mapProductSummary,
} from "./prisma-public-mappers";

export function createPrismaPublicCatalogRepository(
  client: PrismaClient = prisma,
): PublicCatalogRepository {
  return {
    async findProducts(query) {
      const where = buildPublicProductWhere(query);
      const [products, total] = await client.$transaction([
        client.product.findMany({
          where,
          include: {
            category: true,
            brand: true,
            images: {
              orderBy: [{ position: "asc" }, { id: "asc" }],
            },
          },
          orderBy: getProductOrderBy(query.sort),
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        client.product.count({ where }),
      ]);

      return {
        data: products.map(mapProductSummary),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
          hasPreviousPage: query.page > 1,
          hasNextPage: query.page * query.limit < total,
        },
      };
    },

    async findProductBySlug(slug) {
      const product = await client.product.findFirst({
        where: {
          ...PUBLIC_PRODUCT_WHERE,
          slug,
        },
        include: {
          category: true,
          brand: true,
          images: {
            orderBy: [{ position: "asc" }, { id: "asc" }],
          },
          variants: {
            where: {
              isActive: true,
            },
            orderBy: [{ id: "asc" }],
          },
        },
      });

      return product ? mapProductDetail(product) : null;
    },

    async findFeaturedProducts(limit) {
      const products = await client.product.findMany({
        where: {
          ...PUBLIC_PRODUCT_WHERE,
          featured: true,
        },
        include: {
          category: true,
          brand: true,
          images: {
            orderBy: [{ position: "asc" }, { id: "asc" }],
          },
        },
        orderBy: getProductOrderBy("newest"),
        take: limit,
      });

      return products.map(mapProductSummary);
    },

    async listCategories() {
      const categories = await client.category.findMany({
        where: {
          isActive: true,
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      });

      return categories.map(mapCategorySummary);
    },

    async listBrands() {
      const brands = await client.brand.findMany({
        where: {
          isActive: true,
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      });

      return brands.map(mapBrandSummary);
    },
  };
}

export const publicCatalogRepository = createPrismaPublicCatalogRepository();

const PUBLIC_PRODUCT_WHERE = {
  status: ProductStatus.PUBLISHED,
  isActive: true,
  category: {
    isActive: true,
  },
  brand: {
    isActive: true,
  },
} satisfies Prisma.ProductWhereInput;

function buildPublicProductWhere(
  query: ProductListQuery,
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    ...PUBLIC_PRODUCT_WHERE,
  };

  if (query.featured !== undefined) {
    where.featured = query.featured;
  }

  if (query.category) {
    where.category = {
      isActive: true,
      slug: query.category,
    };
  }

  if (query.brand) {
    where.brand = {
      isActive: true,
      slug: query.brand,
    };
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }

  const search = query.search?.trim();
  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
}

function getProductOrderBy(
  sort: ProductSort,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ price: "asc" }, { id: "asc" }];
    case "price-desc":
      return [{ price: "desc" }, { id: "asc" }];
    case "name-asc":
      return [{ name: "asc" }, { id: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
}
