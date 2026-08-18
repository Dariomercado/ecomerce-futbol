"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { addCartItem, setCartItemQuantity } from "@/lib/cart/cart-state";
import type { CartItem, CartSelection } from "@/lib/cart/types";

type CartContextValue = {
  items: CartItem[];
  addItem: (selection: CartSelection) => void;
  removeItem: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    addItem(selection) { setItems((current) => addCartItem(current, selection)); },
    removeItem(lineId) { setItems((current) => current.filter((item) => item.lineId !== lineId)); },
    setQuantity(lineId, quantity) { setItems((current) => setCartItemQuantity(current, lineId, quantity)); },
    clearCart() { setItems([]); },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used within CartProvider.");
  return cart;
}
