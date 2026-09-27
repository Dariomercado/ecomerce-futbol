// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminAuthorizationResult } from "@/lib/auth/admin-authorization";

const requireAdmin = vi.fn();

vi.mock("@/lib/auth/admin-authorization", () => ({ requireAdmin }));

describe("/admin shell authorization states", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [{ authorized: false, status: 401, code: "ADMIN_SESSION_REQUIRED" }, "unauthenticated"],
    [{ authorized: false, status: 403, code: "ADMIN_ACCESS_DENIED" }, "forbidden"],
    [{ authorized: false, status: 503, code: "ADMIN_AUTH_UNAVAILABLE" }, "unavailable"],
  ] satisfies Array<[AdminAuthorizationResult, string]>)
  ("renders the %s shell without exposing protected content", async (authorization, expectedState) => {
    requireAdmin.mockResolvedValue(authorization);
    const { default: AdminLayout } = await import("@/app/admin/layout");

    const output = await AdminLayout({ children: <div data-testid="protected-content">Private admin content</div> });
    render(output);

    expect(screen.getByTestId("admin-shell")).toHaveAttribute("data-state", expectedState);
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("renders protected content only for an active operator", async () => {
    requireAdmin.mockResolvedValue({
      authorized: true,
      user: { id: "11111111-1111-4111-8111-111111111111" },
      membership: { id: "33333333-3333-4333-8333-333333333333", supabaseUserId: "11111111-1111-4111-8111-111111111111" },
    });
    const { default: AdminLayout } = await import("@/app/admin/layout");

    const output = await AdminLayout({ children: <div data-testid="protected-content">Private admin content</div> });
    render(output);

    expect(screen.getByTestId("admin-shell")).toHaveAttribute("data-state", "authorized");
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });
});


it.each(["ADMIN", "EDITOR"])("shows only permitted navigation for %s", async (role) => {
  requireAdmin.mockResolvedValue({ authorized: true, membership: { id: "member", role }, user: { id: "user" } });
  const { default: AdminLayout } = await import("@/app/admin/layout");
  render(await AdminLayout({ children: <p>Catalog</p> }));
  expect(screen.getByRole("link", { name: "Catalog" })).toBeInTheDocument();
  expect(Boolean(screen.queryByRole("link", { name: "Staff access" }))).toBe(role === "ADMIN");
  expect(Boolean(screen.queryByRole("link", { name: "Orders" }))).toBe(role === "ADMIN");
  cleanup();
});
