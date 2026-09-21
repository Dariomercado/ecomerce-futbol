// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/admin/admin-catalog-crud", () => ({
  AdminCatalogCrud: (props: Record<string, unknown>) => <div data-testid="catalog-crud" data-has-csrf-prop={String("csrfToken" in props)} />,
}));

describe("admin page CSRF boundary", () => {
  it("does not serialize the HttpOnly CSRF token into client props", async () => {
    const { default: AdminPage } = await import("@/app/admin/page");

    render(await AdminPage());

    expect(screen.getByTestId("catalog-crud")).toHaveAttribute("data-has-csrf-prop", "false");
  });
});
