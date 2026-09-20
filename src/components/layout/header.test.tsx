// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Header } from "@/components/layout/header";

vi.mock("@/lib/cart/cart-provider", () => ({
  useCart: () => ({ itemCount: 0 }),
}));

describe("Header", () => {
  afterEach(cleanup);

  it("renders public authentication and administration navigation links", () => {
    render(<Header />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/sign-in");
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
  });
});
