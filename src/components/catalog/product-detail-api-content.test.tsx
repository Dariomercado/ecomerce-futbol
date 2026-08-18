// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CartProvider, useCart } from "@/lib/cart/cart-provider";
import type { ProductDetail } from "@/lib/catalog/public-contracts";

import { ProductDetailApiContent } from "./product-detail-api-content";

const product: ProductDetail = {
  id: "p1", name: "Botín", slug: "botin", description: "Desc", price: 100, compareAtPrice: 140,
  currency: "ARS", featured: true,
  category: { id: "c1", name: "Botines", slug: "botines", description: "", imageUrl: null },
  brand: { id: "b1", name: "Arena", slug: "arena", description: "", logoUrl: null },
  images: [{ id: "i1", url: "x", alt: "Botín principal", position: 1, isPrimary: true, variantId: null }],
  activeVariants: [
    { id: "v1", name: "Talle 40", size: "40", color: null, surface: null, price: 110, sku: "v1", stock: 2 },
    { id: "v2", name: "Talle 41", size: "41", color: null, surface: null, price: null, sku: "v2", stock: 0 },
  ],
  createdAt: "", updatedAt: "",
};

function CartProbe() {
  const { itemCount, total } = useCart();
  return <output data-testid="cart">{itemCount}:{total}</output>;
}

describe("ProductDetailApiContent", () => {
  afterEach(cleanup);
  it("requires a variant, reflects selected pricing, and blocks out-of-stock variants", () => {
    render(<CartProvider><ProductDetailApiContent product={product} /></CartProvider>);
    const add = screen.getByRole("button", { name: "Agregar al carrito" });
    expect(add).toBeDisabled();
    expect(screen.getByText("Oferta")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Talle 40 40 Disponible/ }));
    expect(screen.getByText(/110/)).toBeInTheDocument();
    expect(add).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Talle 41 41 Sin stock/ }));
    expect(add).toBeDisabled();
    expect(screen.getByText("Esta variante no tiene stock disponible.")).toBeInTheDocument();
  });

  it("hands the selected product and variant to the session cart", () => {
    render(<CartProvider><ProductDetailApiContent product={product} /><CartProbe /></CartProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Talle 40 40 Disponible/ }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));
    expect(screen.getByTestId("cart")).toHaveTextContent("1:110");
  });
});
