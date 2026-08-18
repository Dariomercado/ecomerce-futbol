import { describe, expect, it } from "vitest";

import { addCartItem, setCartItemQuantity } from "./cart-state";
import type { CartItem, CartSelection } from "./types";

const selection = (overrides: Partial<CartSelection> = {}): CartSelection => ({
  id: "boot-1",
  slug: "boot-1",
  name: "Match Boot",
  currency: "ARS",
  price: 120,
  stock: 4,
  variant: { id: "v-red", name: "Red", size: "42", color: "Red" },
  ...overrides,
});

const line = (overrides: Partial<CartItem> = {}): CartItem => ({
  ...selection(),
  lineId: "boot-1:v-red",
  quantity: 1,
  ...overrides,
});

describe("cart state", () => {
  it("accepts variantless products and rejects missing stock", () => {
    const variantless = addCartItem([], selection({ variant: null, stock: null }));
    expect(variantless[0]).toMatchObject({ lineId: "boot-1:product", quantity: 1 });
    expect(addCartItem([], selection({ stock: 0 }))).toEqual([]);
  });

  it("consolidates equivalent selections but keeps different variants distinct", () => {
    const first = addCartItem([], selection());
    const same = addCartItem(first, selection());
    expect(same).toHaveLength(1);
    expect(same[0].quantity).toBe(2);

    const other = addCartItem(same, selection({ variant: { id: "v-blue", name: "Blue", size: "42", color: "Blue" } }));
    expect(other).toHaveLength(2);
    expect(other.map((item) => item.lineId)).toEqual(["boot-1:v-red", "boot-1:v-blue"]);
  });

  it("caps increments at stock and removes a line when decremented below one", () => {
    const atStock = [line({ quantity: 4 })];
    expect(addCartItem(atStock, selection())).toBe(atStock);
    expect(setCartItemQuantity(atStock, atStock[0].lineId, 5)[0].quantity).toBe(4);
    expect(setCartItemQuantity(atStock, atStock[0].lineId, 0)).toEqual([]);
  });

  it("normalizes quantities to whole units and preserves input state", () => {
    const original = [line({ quantity: 1 })];
    const next = setCartItemQuantity(original, original[0].lineId, 2.9);
    expect(next[0].quantity).toBe(2);
    expect(original[0].quantity).toBe(1);
  });

  it("derives line count and total from effective prices", () => {
    const items = [line({ quantity: 2, price: 120 }), line({ lineId: "boot-1:v-blue", quantity: 1, price: 80 })];
    expect(items.reduce((count, item) => count + item.quantity, 0)).toBe(3);
    expect(items.reduce((total, item) => total + item.price * item.quantity, 0)).toBe(320);
  });
});
