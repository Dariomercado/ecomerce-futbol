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
    render(<Header isAuthenticated={false} />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/sign-in");
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
  });

  it("shows the existing sign-out route rather than sign-in for a verified session", () => {
    render(<Header isAuthenticated />);

    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" }).closest("form")).toHaveAttribute("action", "/auth/sign-out");
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
  });
});
