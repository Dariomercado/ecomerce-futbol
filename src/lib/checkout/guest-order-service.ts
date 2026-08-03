import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

import type { CheckoutLineInput, CheckoutValidationError, GuestOrder, GuestOrderInput, OrderLine } from "./contracts";

type GuestOrderResult = { order: GuestOrder } | { error: CheckoutValidationError };

export async function createGuestOrder(input: unknown): Promise<GuestOrderResult> {
  const validationError = validateGuestOrderInput(input);
  if (validationError) return { error: validationError };

  const normalizedInput = input as GuestOrderInput;
  const consolidatedLines = consolidateLines(normalizedInput.lines);
  const products = await prisma.product.findMany({
    where: {
      id: { in: consolidatedLines.map((line) => line.productId) },
      isActive: true,
      status: "PUBLISHED",
      category: { isActive: true },
      brand: { isActive: true },
    },
    include: { variants: { where: { isActive: true }, select: { id: true, name: true, price: true, stock: true } } },
  });
  const productsById = new Map(products.map((product) => [product.id, product]));
  const issues: CheckoutValidationError["issues"] = [];

  const lines = consolidatedLines.flatMap((line): OrderLine[] => {
    const product = productsById.get(line.productId);
    if (!product) { issues.push({ field: "lines", message: "A selected product is unavailable." }); return []; }

    const variant = line.variantId ? product.variants.find((candidate) => candidate.id === line.variantId) : null;
    if (line.variantId && !variant) { issues.push({ field: "lines", message: "A selected variant is unavailable." }); return []; }
    if (!line.variantId && product.variants.length > 0) { issues.push({ field: "lines", message: "Select a product variant before checkout." }); return []; }
    if (variant && line.quantity > variant.stock) { issues.push({ field: "lines", message: "The requested quantity exceeds available stock." }); return []; }

    const unitPrice = variant?.price ?? product.price;
    const lineTotal = unitPrice * line.quantity;
    if (!Number.isSafeInteger(unitPrice) || !Number.isSafeInteger(lineTotal)) {
      issues.push({ field: "lines", message: "The requested quantity cannot be processed safely." }); return [];
    }
    return [{ ...line, name: variant ? `${product.name} · ${variant.name}` : product.name, unitPrice, lineTotal }];
  });

  if (issues.length > 0) return { error: { code: "INVALID_CHECKOUT", message: "Invalid checkout data.", issues } };

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  if (!Number.isSafeInteger(total)) {
    return { error: { code: "INVALID_CHECKOUT", message: "Invalid checkout data.", issues: [{ field: "lines", message: "The order total cannot be processed safely." }] } };
  }

  return { order: { id: randomUUID(), userId: null, contact: normalizedInput.contact, shippingAddress: normalizedInput.shippingAddress, lines, currency: "ARS", total, status: "PENDING_CONFIRMATION" } };
}

function validateGuestOrderInput(input: unknown): CheckoutValidationError | null {
  const issues: CheckoutValidationError["issues"] = [];
  if (!isRecord(input)) return invalidShapeIssue();

  const { contact, shippingAddress, lines } = input;
  if (!isRecord(contact)) issues.push({ field: "contact", message: "Contact details are required." });
  else {
    if (!isNonEmptyString(contact.fullName)) issues.push({ field: "contact.fullName", message: "Full name is required." });
    if (!isNonEmptyString(contact.email) || !/^\S+@\S+\.\S+$/.test(contact.email)) issues.push({ field: "contact.email", message: "A valid email is required." });
    if (!isNonEmptyString(contact.phone)) issues.push({ field: "contact.phone", message: "Phone is required." });
  }
  if (!isRecord(shippingAddress)) issues.push({ field: "shippingAddress", message: "Shipping address is required." });
  else {
    for (const [field, message] of [["addressLine1", "Address is required."], ["city", "City is required."], ["province", "Province is required."], ["postalCode", "Postal code is required."]] as const) {
      if (!isNonEmptyString(shippingAddress[field])) issues.push({ field: `shippingAddress.${field}`, message });
    }
    if (shippingAddress.addressLine2 !== undefined && !isNonEmptyString(shippingAddress.addressLine2)) issues.push({ field: "shippingAddress.addressLine2", message: "Address line 2 must be a string." });
  }
  if (!Array.isArray(lines)) issues.push({ field: "lines", message: "Order lines must be an array." });
  else if (lines.length === 0) issues.push({ field: "lines", message: "At least one item is required." });
  else lines.forEach((line, index) => {
    if (!isRecord(line)) { issues.push({ field: `lines.${index}`, message: "Order line must be an object." }); return; }
    if (!isNonEmptyString(line.productId)) issues.push({ field: `lines.${index}.productId`, message: "Product is required." });
    else if (!isUuid(line.productId)) issues.push({ field: `lines.${index}.productId`, message: "Product must be a valid UUID." });
    if (line.variantId !== null && line.variantId !== undefined && !isNonEmptyString(line.variantId)) issues.push({ field: `lines.${index}.variantId`, message: "Variant must be a string or null." });
    else if (line.variantId !== null && line.variantId !== undefined && !isUuid(line.variantId)) issues.push({ field: `lines.${index}.variantId`, message: "Variant must be a valid UUID." });
    if (typeof line.quantity !== "number" || !Number.isSafeInteger(line.quantity) || line.quantity < 1) issues.push({ field: `lines.${index}.quantity`, message: "Quantity must be a safe positive integer." });
  });
  return issues.length > 0 ? { code: "INVALID_CHECKOUT", message: "Invalid checkout data.", issues } : null;
}

function consolidateLines(lines: CheckoutLineInput[]): CheckoutLineInput[] {
  const consolidated = new Map<string, CheckoutLineInput>();
  for (const line of lines) {
    const identity = `${line.productId}\u0000${line.variantId ?? ""}`;
    const current = consolidated.get(identity);
    const quantity = (current?.quantity ?? 0) + line.quantity;
    if (!Number.isSafeInteger(quantity)) return [{ ...line, quantity: Number.MAX_SAFE_INTEGER + 1 }];
    consolidated.set(identity, { ...line, variantId: line.variantId ?? null, quantity });
  }
  return [...consolidated.values()];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function invalidShapeIssue(): CheckoutValidationError {
  return { code: "INVALID_CHECKOUT", message: "Invalid checkout data.", issues: [{ field: "body", message: "Checkout data must be an object." }] };
}
