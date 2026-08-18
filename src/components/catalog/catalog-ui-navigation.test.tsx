// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CatalogFilters } from "./catalog-filters";

describe("CatalogFilters navigation", () => {
  afterEach(cleanup);
  it("builds the canonical category, brand, and featured query links", () => {
    render(
      <CatalogFilters
        brands={[{ id: "b1", name: "Arena", slug: "arena", description: "", logoUrl: null }]}
        categories={[{ id: "c1", name: "Botines", slug: "botines", description: "", imageUrl: null }]}
        featuredOnly={false}
      />,
    );

    expect(screen.getAllByRole("link", { name: "Botines" })[0]).toHaveAttribute("href", "/catalogo?category=botines");
    expect(screen.getAllByRole("link", { name: "Arena" })[0]).toHaveAttribute("href", "/catalogo?brand=arena");
    expect(screen.getAllByRole("link", { name: "Solo destacados" })[0]).toHaveAttribute("href", "/catalogo?featured=true");
  });

  it("preserves active filters when toggling featured products", () => {
    render(
      <CatalogFilters
        brands={[]}
        categories={[]}
        featuredOnly
        selectedBrand="arena"
        selectedCategory="botines"
      />,
    );

    expect(screen.getAllByRole("link", { name: "Solo destacados" })[1]).toHaveAttribute(
      "href",
      "/catalogo?category=botines&brand=arena",
    );
  });
});
