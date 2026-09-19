export type AdminProductStatus = "draft" | "published";

export type AdminProductVariantInput = {
  name: string;
  size?: string | null;
  color?: string | null;
  surface?: string | null;
  price?: number | null;
  sku: string;
  stock: number;
  isActive: boolean;
};

export type AdminProductImageInput = {
  url: string;
  alt: string;
  position: number;
  isPrimary: boolean;
  variantSku?: string | null;
};

export type AdminProductInput = {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  brandId: string;
  price: number;
  compareAtPrice: number | null;
  featured: boolean;
  status: AdminProductStatus;
  variants: AdminProductVariantInput[];
  images: AdminProductImageInput[];
};

export type AdminProductValidationIssue = {
  field: string;
  message: string;
};

export type AdminProductValidationError = {
  code: "INVALID_ADMIN_PRODUCT";
  issues: AdminProductValidationIssue[];
};

/**
 * Validates the complete product aggregate before any repository work. Prices
 * are stored as integer ARS minor-free amounts, and image-to-variant links use
 * submitted SKUs rather than client-controlled database identifiers.
 */
export function validateAdminProductInput(input: unknown): AdminProductValidationError | null {
  const issues: AdminProductValidationIssue[] = [];
  if (!isRecord(input)) {
    return { code: "INVALID_ADMIN_PRODUCT", issues: [{ field: "body", message: "A product object is required." }] };
  }

  requireNonEmptyString(input, "name", issues);
  requireSlug(input.slug, issues);
  requireNonEmptyString(input, "description", issues);
  requireUuid(input.categoryId, "categoryId", issues);
  requireUuid(input.brandId, "brandId", issues);
  requirePositiveInteger(input.price, "price", issues);

  if (input.compareAtPrice !== null && input.compareAtPrice !== undefined) {
    requirePositiveInteger(input.compareAtPrice, "compareAtPrice", issues);
    if (isPositiveInteger(input.price) && isPositiveInteger(input.compareAtPrice) && input.compareAtPrice <= input.price) {
      issue(issues, "compareAtPrice", "compareAtPrice must be greater than price.");
    }
  }

  if (typeof input.featured !== "boolean") issue(issues, "featured", "featured must be a boolean.");
  if (input.status !== "draft" && input.status !== "published") {
    issue(issues, "status", "status must be draft or published.");
  }

  const variants = Array.isArray(input.variants) ? input.variants : null;
  if (!variants) {
    issue(issues, "variants", "variants must be an array.");
  } else {
    validateVariants(variants, issues);
  }

  const images = Array.isArray(input.images) ? input.images : null;
  if (!images || images.length === 0) {
    issue(issues, "images", "At least one image is required.");
  } else {
    validateImages(images, variants, issues);
  }

  return issues.length > 0 ? { code: "INVALID_ADMIN_PRODUCT", issues } : null;
}

function validateVariants(variants: unknown[], issues: AdminProductValidationIssue[]) {
  const skus = new Set<string>();
  variants.forEach((variant, index) => {
    const field = `variants.${index}`;
    if (!isRecord(variant)) {
      issue(issues, field, "variant must be an object.");
      return;
    }
    requireNonEmptyString(variant, "name", issues, field);
    requireNonEmptyString(variant, "sku", issues, field);
    requireNonNegativeInteger(variant.stock, `${field}.stock`, issues);
    if (typeof variant.isActive !== "boolean") issue(issues, `${field}.isActive`, "isActive must be a boolean.");
    if (variant.price !== undefined && variant.price !== null) requirePositiveInteger(variant.price, `${field}.price`, issues);
    for (const key of ["size", "color", "surface"] as const) {
      if (variant[key] !== undefined && variant[key] !== null && !isNonEmptyString(variant[key])) {
        issue(issues, `${field}.${key}`, `${key} must be a non-empty string when provided.`);
      }
    }
    if (isNonEmptyString(variant.sku)) {
      if (skus.has(variant.sku)) issue(issues, `${field}.sku`, "sku must be unique within the product.");
      skus.add(variant.sku);
    }
  });
}

function validateImages(images: unknown[], variants: unknown[] | null, issues: AdminProductValidationIssue[]) {
  const positions = new Set<number>();
  let primaryImages = 0;
  const variantSkus = new Set(
    (variants ?? []).flatMap((variant) => isRecord(variant) && isNonEmptyString(variant.sku) ? [variant.sku] : []),
  );

  images.forEach((image, index) => {
    const field = `images.${index}`;
    if (!isRecord(image)) {
      issue(issues, field, "image must be an object.");
      return;
    }
    requireNonEmptyString(image, "url", issues, field);
    requireNonEmptyString(image, "alt", issues, field);
    requirePositiveInteger(image.position, `${field}.position`, issues);
    if (isPositiveInteger(image.position)) {
      if (positions.has(image.position)) issue(issues, `${field}.position`, "image positions must be unique.");
      positions.add(image.position);
    }
    if (typeof image.isPrimary !== "boolean") {
      issue(issues, `${field}.isPrimary`, "isPrimary must be a boolean.");
    } else if (image.isPrimary) {
      primaryImages += 1;
    }
    if (image.variantSku !== undefined && image.variantSku !== null) {
      if (!isNonEmptyString(image.variantSku) || !variantSkus.has(image.variantSku)) {
        issue(issues, `${field}.variantSku`, "variantSku must reference a submitted variant.");
      }
    }
  });

  if (primaryImages !== 1) issue(issues, "images", "Exactly one primary image is required.");
}

function requireNonEmptyString(value: Record<string, unknown>, key: string, issues: AdminProductValidationIssue[], prefix = "") {
  if (!isNonEmptyString(value[key])) issue(issues, prefix ? `${prefix}.${key}` : key, `${key} is required.`);
}

function requireSlug(value: unknown, issues: AdminProductValidationIssue[]) {
  if (!isNonEmptyString(value) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    issue(issues, "slug", "slug must use lowercase hyphenated text.");
  }
}

function requireUuid(value: unknown, field: string, issues: AdminProductValidationIssue[]) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    issue(issues, field, `${field} must be a UUID.`);
  }
}

function requirePositiveInteger(value: unknown, field: string, issues: AdminProductValidationIssue[]) {
  if (!isPositiveInteger(value)) issue(issues, field, `${field} must be a positive integer.`);
}

function requireNonNegativeInteger(value: unknown, field: string, issues: AdminProductValidationIssue[]) {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0) issue(issues, field, `${field} must be a non-negative integer.`);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(issues: AdminProductValidationIssue[], field: string, message: string) {
  issues.push({ field, message });
}
