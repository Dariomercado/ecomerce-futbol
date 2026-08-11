import { createHash, timingSafeEqual } from "node:crypto";

export type CheckoutContact = { email: string; fullName: string; phone: string };
export type ShippingAddress = { addressLine1: string; addressLine2?: string; city: string; province: string; postalCode: string };
export type CheckoutLineInput = { productId: string; variantId: string | null; quantity: number };
export type GuestOrderInput = { contact: CheckoutContact; shippingAddress: ShippingAddress; lines: CheckoutLineInput[] };
export type OrderLine = CheckoutLineInput & { name: string; unitPrice: number; lineTotal: number };
export type GuestOrder = { id: string; userId: string | null; contact: CheckoutContact; shippingAddress: ShippingAddress; lines: OrderLine[]; currency: "ARS"; total: number; status: "PENDING_CONFIRMATION" };
export type CheckoutValidationError = { code: "INVALID_CHECKOUT" | "CATALOG_ITEM_UNAVAILABLE"; message: string; issues: Array<{ field: string; message: string }> };

const rawCardKeys = new Set(["cardnumber", "card_number", "pan", "cvv", "cvc", "securitycode", "security_code"]);

export function rejectRawCardData(value: unknown, parentKey?: string, insideCard = false): { field: string; message: string } | null {
  if (Array.isArray(value)) return value.map((item) => rejectRawCardData(item, parentKey, insideCard)).find(Boolean) ?? null;
  if (!value || typeof value !== "object") return null;
  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (rawCardKeys.has(normalizedKey) || (insideCard && ["number", "expiry", "expiration", "securitycode"].includes(normalizedKey))) return { field: key, message: "Raw card data is not accepted." };
    const rejected = rejectRawCardData(nested, normalizedKey, insideCard || normalizedKey === "card");
    if (rejected) return rejected;
  }
  return null;
}

export function hashStatusCapability(capability: string): string {
  return createHash("sha256").update(capability).digest("hex");
}

export function matchesStatusCapability(capability: string, storedHash: string): boolean {
  const actual = Buffer.from(hashStatusCapability(capability), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
