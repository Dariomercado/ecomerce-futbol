// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CartProvider, useCart } from "./cart-provider";

function CartProbe() {
  const { itemCount, total } = useCart();
  return <output data-testid="cart-state">{itemCount}:{total}</output>;
}

describe("CartProvider session boundary", () => {
  it("starts a fresh session empty without reading browser persistence", () => {
    const read = vi.spyOn(Storage.prototype, "getItem");
    window.localStorage.setItem("cart", JSON.stringify([{ quantity: 99 }]));
    render(<CartProvider><CartProbe /></CartProvider>);

    expect(screen.getByTestId("cart-state")).toHaveTextContent("0:0");
    expect(read).not.toHaveBeenCalled();
    read.mockRestore();
  });
});
