export type CheckoutContact = {
  email: string;
  fullName: string;
  phone: string;
};

export type ShippingAddress = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
};

export type CheckoutLineInput = {
  productId: string;
  variantId: string | null;
  quantity: number;
};

export type GuestOrderInput = {
  contact: CheckoutContact;
  shippingAddress: ShippingAddress;
  lines: CheckoutLineInput[];
};

export type OrderLine = CheckoutLineInput & {
  name: string;
  unitPrice: number;
  lineTotal: number;
};

export type GuestOrder = {
  id: string;
  userId: string | null;
  contact: CheckoutContact;
  shippingAddress: ShippingAddress;
  lines: OrderLine[];
  currency: "ARS";
  total: number;
  status: "PENDING_CONFIRMATION";
};

export type CheckoutValidationError = {
  code: "INVALID_CHECKOUT" | "CATALOG_ITEM_UNAVAILABLE";
  message: string;
  issues: Array<{ field: string; message: string }>;
};
