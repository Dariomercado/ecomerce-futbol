import type { CartItem, CartSelection } from "./types";

export function addCartItem(items: CartItem[], selection: CartSelection): CartItem[] {
  const lineId = `${selection.id}:${selection.variant?.id ?? "product"}`;
  if (selection.stock !== null && selection.stock < 1) return items;

  const existing = items.find((item) => item.lineId === lineId);
  if (!existing) return [...items, { ...selection, lineId, quantity: 1 }];
  if (existing.stock !== null && existing.quantity >= existing.stock) return items;
  return items.map((item) => item.lineId === lineId ? { ...item, quantity: item.quantity + 1 } : item);
}

export function setCartItemQuantity(items: CartItem[], lineId: string, quantity: number): CartItem[] {
  const item = items.find((candidate) => candidate.lineId === lineId);
  if (!item) return items;

  const nextQuantity = Math.floor(quantity);
  if (nextQuantity < 1) return items.filter((candidate) => candidate.lineId !== lineId);

  const boundedQuantity = item.stock === null ? nextQuantity : Math.min(nextQuantity, item.stock);
  return items.map((candidate) => candidate.lineId === lineId ? { ...candidate, quantity: boundedQuantity } : candidate);
}
