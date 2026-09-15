import {
  CurrencyCode,
  PrismaClient,
  ProductStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  {
    name: "Botines",
    slug: "botines",
    description: "Calzado preparado para dominar distintos tipos de cancha.",
    imageUrl: "/catalog/categories/botines.png",
    parentId: null,
    isActive: true,
  },
  {
    name: "Camisetas",
    slug: "camisetas",
    description: "Camisetas de fútbol con identidad de club y entrenamiento.",
    imageUrl: "/catalog/categories/camisetas.png",
    parentId: null,
    isActive: true,
  },
  {
    name: "Entrenamiento",
    slug: "entrenamiento",
    description: "Indumentaria técnica para sesiones, pretemporada y día a día.",
    imageUrl: "/catalog/categories/entrenamiento.png",
    parentId: null,
    isActive: true,
  },
  {
    name: "Accesorios",
    slug: "accesorios",
    description: "Complementos para completar el bolso de partido.",
    imageUrl: "/catalog/categories/accesorios.png",
    parentId: null,
    isActive: true,
  },
];

const brands = [
  {
    name: "Verde Arena",
    slug: "verde-arena",
    description: "Marca propia inspirada en fútbol amateur, barrio y cancha chica.",
    logoUrl: null,
    isActive: true,
  },
  {
    name: "Northline",
    slug: "northline",
    description: "Equipamiento técnico ficticio para entrenamiento intenso.",
    logoUrl: null,
    isActive: true,
  },
  {
    name: "Arena Control",
    slug: "arena-control",
    description: "Productos ficticios centrados en control, precisión y ritmo de juego.",
    logoUrl: null,
    isActive: true,
  },
  {
    name: "Matchday Studio",
    slug: "matchday-studio",
    description: "Diseño editorial ficticio para camisetas y accesorios de partido.",
    logoUrl: null,
    isActive: true,
  },
  {
    name: "Terreno",
    slug: "terreno",
    description: "Línea ficticia preparada para superficies, barro y potrero.",
    logoUrl: null,
    isActive: true,
  },
];

type SeedVariant = {
  name: string;
  size: string | null;
  color: string | null;
  surface: string | null;
  price: number | null;
  sku: string;
  stock: number;
  isActive: boolean;
};

type SeedImage = {
  variantSku: string | null;
  url: string;
  alt: string;
  position: number;
  isPrimary: boolean;
};

type SeedProduct = {
  name: string;
  slug: string;
  description: string;
  categorySlug: string;
  brandSlug: string;
  price: number;
  compareAtPrice: number | null;
  featured: boolean;
  status: ProductStatus;
  isActive: boolean;
  variants: SeedVariant[];
  images: SeedImage[];
};

const products: SeedProduct[] = [
  {
    name: "Control FG Verde",
    slug: "control-fg-verde",
    description: "Botín firme para cancha natural con calce estable y toque preciso.",
    categorySlug: "botines",
    brandSlug: "arena-control",
    price: 112000,
    compareAtPrice: 132000,
    featured: true,
    status: ProductStatus.PUBLISHED,
    isActive: true,
    variants: [
      { name: "Verde / 40 / FG", size: "40", color: "Verde", surface: "FG", stock: 4, price: null, sku: "AC-FG-VER-40", isActive: true },
      { name: "Verde / 41 / FG", size: "41", color: "Verde", surface: "FG", stock: 2, price: 115000, sku: "AC-FG-VER-41", isActive: true },
    ],
    images: [
      { variantSku: null, url: "/catalog/products/control-fg-verde-1.png", alt: "Botines Control FG Verde vista lateral", position: 1, isPrimary: true },
      { variantSku: null, url: "/catalog/products/control-fg-verde-2.png", alt: "Detalle de suela FG de botines Control Verde", position: 2, isPrimary: false },
    ],
  },
  {
    name: "Terreno TF Arena",
    slug: "terreno-tf-arena",
    description: "Botín para sintético con tracción corta y perfil resistente.",
    categorySlug: "botines",
    brandSlug: "terreno",
    price: 98000,
    compareAtPrice: null,
    featured: false,
    status: ProductStatus.PUBLISHED,
    isActive: true,
    variants: [
      { name: "Arena / 39 / TF", size: "39", color: "Arena", surface: "TF", stock: 3, price: null, sku: "TE-TF-ARE-39", isActive: true },
      { name: "Arena / 42 / TF", size: "42", color: "Arena", surface: "TF", stock: 0, price: null, sku: "TE-TF-ARE-42", isActive: true },
    ],
    images: [
      { variantSku: null, url: "/catalog/products/terreno-tf-arena-1.png", alt: "Botines Terreno TF Arena color arena", position: 1, isPrimary: true },
    ],
  },
  {
    name: "Camiseta Verde Arena Local",
    slug: "camiseta-verde-arena-local",
    description: "Camiseta titular ficticia con textura liviana y corte regular.",
    categorySlug: "camisetas",
    brandSlug: "verde-arena",
    price: 62000,
    compareAtPrice: 74000,
    featured: true,
    status: ProductStatus.PUBLISHED,
    isActive: true,
    variants: [
      { name: "Verde / S", size: "S", color: "Verde", surface: null, stock: 6, price: null, sku: "VA-CAM-LOC-S", isActive: true },
      { name: "Verde / M", size: "M", color: "Verde", surface: null, stock: 8, price: null, sku: "VA-CAM-LOC-M", isActive: true },
      { name: "Verde / L", size: "L", color: "Verde", surface: null, stock: 5, price: null, sku: "VA-CAM-LOC-L", isActive: true },
    ],
    images: [
      { variantSku: null, url: "/catalog/products/camiseta-verde-arena-local-1.png", alt: "Camiseta Verde Arena local frente", position: 1, isPrimary: true },
      { variantSku: null, url: "/catalog/products/camiseta-verde-arena-local-2.png", alt: "Camiseta Verde Arena local espalda", position: 2, isPrimary: false },
    ],
  },
  {
    name: "Camiseta Matchday Negra",
    slug: "camiseta-matchday-negra",
    description: "Camiseta alternativa ficticia con estética nocturna de partido.",
    categorySlug: "camisetas",
    brandSlug: "matchday-studio",
    price: 58000,
    compareAtPrice: null,
    featured: false,
    status: ProductStatus.PUBLISHED,
    isActive: true,
    variants: [
      { name: "Negro / M", size: "M", color: "Negro", surface: null, stock: 7, price: null, sku: "MS-CAM-NEG-M", isActive: true },
      { name: "Negro / XL", size: "XL", color: "Negro", surface: null, stock: 2, price: null, sku: "MS-CAM-NEG-XL", isActive: true },
    ],
    images: [
      { variantSku: null, url: "/catalog/products/camiseta-matchday-negra-1.png", alt: "Camiseta Matchday negra frente", position: 1, isPrimary: true },
    ],
  },
  {
    name: "Campera Northline Training",
    slug: "campera-northline-training",
    description: "Campera liviana para entrada en calor, traslado y banco.",
    categorySlug: "entrenamiento",
    brandSlug: "northline",
    price: 89000,
    compareAtPrice: 99000,
    featured: true,
    status: ProductStatus.PUBLISHED,
    isActive: true,
    variants: [
      { name: "Verde oscuro / M", size: "M", color: "Verde oscuro", surface: null, stock: 4, price: null, sku: "NL-JAC-VER-M", isActive: true },
      { name: "Verde oscuro / L", size: "L", color: "Verde oscuro", surface: null, stock: 4, price: null, sku: "NL-JAC-VER-L", isActive: true },
    ],
    images: [
      { variantSku: null, url: "/catalog/products/northline-training-jacket-1.png", alt: "Campera Northline Training verde oscuro", position: 1, isPrimary: true },
    ],
  },
  {
    name: "Pack Conos Terreno",
    slug: "pack-conos-terreno",
    description: "Set de conos flexibles para coordinación, velocidad y ejercicios técnicos.",
    categorySlug: "accesorios",
    brandSlug: "terreno",
    price: 24000,
    compareAtPrice: null,
    featured: false,
    status: ProductStatus.PUBLISHED,
    isActive: true,
    variants: [
      { name: "Naranja / Único", size: "Único", color: "Naranja", surface: null, stock: 12, price: null, sku: "TE-CON-NAR-U", isActive: true },
    ],
    images: [
      { variantSku: null, url: "/catalog/products/conos-terreno-pack-1.png", alt: "Pack de conos Terreno color naranja", position: 1, isPrimary: true },
    ],
  },
  {
    name: "Botella Matchday Studio",
    slug: "botella-matchday-studio",
    description: "Botella deportiva ficticia para entrenamiento y partido.",
    categorySlug: "accesorios",
    brandSlug: "matchday-studio",
    price: 18000,
    compareAtPrice: 22000,
    featured: true,
    status: ProductStatus.PUBLISHED,
    isActive: true,
    variants: [
      { name: "Humo / Único", size: "Único", color: "Humo", surface: null, stock: 10, price: null, sku: "MS-BOT-HUM-U", isActive: true },
    ],
    images: [
      { variantSku: null, url: "/catalog/products/botella-matchday-1.png", alt: "Botella deportiva Matchday Studio color humo", position: 1, isPrimary: true },
    ],
  },
  {
    name: "Producto Archivado Demo",
    slug: "producto-archivado-demo",
    description: "Producto mock usado para validar exclusión pública.",
    categorySlug: "entrenamiento",
    brandSlug: "verde-arena",
    price: 50000,
    compareAtPrice: null,
    featured: false,
    status: ProductStatus.ARCHIVED,
    isActive: false,
    variants: [
      { name: "Demo / Único", size: "Único", color: "Demo", surface: null, stock: 0, price: null, sku: "VA-LEG-DEMO-U", isActive: false },
    ],
    images: [
      { variantSku: null, url: "/catalog/products/legacy-archived-1.jpg", alt: "Producto archivado de demostración", position: 1, isPrimary: true },
    ],
  },
];

const expectedCounts = {
  categories: 4,
  brands: 5,
  products: 8,
  variants: 14,
  images: 10,
  activePublishedProducts: 7,
  archivedInactiveProducts: 1,
};

const seededCategorySlugs = categories.map(({ slug }) => slug);
const seededBrandSlugs = brands.map(({ slug }) => slug);
const seededProductSlugs = products.map(({ slug }) => slug);
const seededVariantSkus = products.flatMap(({ variants }) =>
  variants.map(({ sku }) => sku),
);

async function main() {
  const counts = await prisma.$transaction(async (tx) => {
    const categoryIds = new Map<string, string>();
    const brandIds = new Map<string, string>();
    const productIds = new Map<string, string>();

    for (const category of categories) {
      const record = await tx.category.upsert({
        where: { slug: category.slug },
        update: category,
        create: category,
        select: { id: true },
      });
      categoryIds.set(category.slug, record.id);
    }

    for (const brand of brands) {
      const record = await tx.brand.upsert({
        where: { slug: brand.slug },
        update: brand,
        create: brand,
        select: { id: true },
      });
      brandIds.set(brand.slug, record.id);
    }

    for (const product of products) {
      const categoryId = categoryIds.get(product.categorySlug);
      const brandId = brandIds.get(product.brandSlug);

      if (!categoryId || !brandId) {
        throw new Error(`Missing relation for product "${product.slug}".`);
      }

      const productData = {
        name: product.name,
        description: product.description,
        categoryId,
        brandId,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        currency: CurrencyCode.ARS,
        featured: product.featured,
        status: product.status,
        isActive: product.isActive,
      };
      const record = await tx.product.upsert({
        where: { slug: product.slug },
        update: productData,
        create: { slug: product.slug, ...productData },
        select: { id: true },
      });
      productIds.set(product.slug, record.id);
    }

    for (const product of products) {
      const productId = productIds.get(product.slug);
      if (!productId) {
        throw new Error(`Missing seeded product "${product.slug}".`);
      }
      const variantIds = new Map<string, string>();

      for (const variant of product.variants) {
        const variantData = {
          productId,
          name: variant.name,
          size: variant.size,
          color: variant.color,
          surface: variant.surface,
          price: variant.price,
          stock: variant.stock,
          isActive: variant.isActive,
        };
        const record = await tx.productVariant.upsert({
          where: { sku: variant.sku },
          update: variantData,
          create: { sku: variant.sku, ...variantData },
          select: { id: true },
        });
        variantIds.set(variant.sku, record.id);
      }

      for (const image of product.images) {
        const variantId = image.variantSku
          ? variantIds.get(image.variantSku)
          : null;

        if (image.variantSku && !variantId) {
          throw new Error(`Missing variant "${image.variantSku}" for image position ${image.position}.`);
        }

        const imageData = {
          variantId,
          url: image.url,
          alt: image.alt,
          isPrimary: image.isPrimary,
        };
        await tx.productImage.upsert({
          where: {
            productId_position: {
              productId,
              position: image.position,
            },
          },
          update: imageData,
          create: {
            productId,
            position: image.position,
            ...imageData,
          },
        });
      }
    }

    const seededImageKeys = products.flatMap((product) => {
      const productId = productIds.get(product.slug);
      if (!productId) {
        throw new Error(`Missing seeded product "${product.slug}".`);
      }

      return product.images.map(({ position }) => ({ productId, position }));
    });

    const [
      categoryCount,
      brandCount,
      productCount,
      variantCount,
      imageCount,
      activePublishedProductCount,
      archivedInactiveProductCount,
    ] = await Promise.all([
      tx.category.count({
        where: { slug: { in: seededCategorySlugs } },
      }),
      tx.brand.count({
        where: { slug: { in: seededBrandSlugs } },
      }),
      tx.product.count({
        where: { slug: { in: seededProductSlugs } },
      }),
      tx.productVariant.count({
        where: { sku: { in: seededVariantSkus } },
      }),
      tx.productImage.count({
        where: { OR: seededImageKeys },
      }),
      tx.product.count({
        where: {
          slug: { in: seededProductSlugs },
          status: ProductStatus.PUBLISHED,
          isActive: true,
        },
      }),
      tx.product.count({
        where: {
          slug: { in: seededProductSlugs },
          status: ProductStatus.ARCHIVED,
          isActive: false,
        },
      }),
    ]);

    const counts = {
      categories: categoryCount,
      brands: brandCount,
      products: productCount,
      variants: variantCount,
      images: imageCount,
      activePublishedProducts: activePublishedProductCount,
      archivedInactiveProducts: archivedInactiveProductCount,
    };

    const mismatches = Object.entries(expectedCounts)
      .filter(([key, expected]) => counts[key as keyof typeof counts] !== expected)
      .map(
        ([key, expected]) =>
          `${key}: expected ${expected}, received ${counts[key as keyof typeof counts]}`,
      );

    if (mismatches.length > 0) {
      throw new Error(`Seed validation failed:\n- ${mismatches.join("\n- ")}`);
    }

    return counts;
  }, { maxWait: 10_000, timeout: 30_000 });

  console.info("Catalog seed completed and validated:", counts);
}

main()
  .catch((error) => {
    console.error("Catalog seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
