import { describe, expect, it } from "vitest";
import { brands, products } from "@/lib/catalog/mock-data";
import { getProductBySlug, getProducts } from "@/lib/catalog/queries";

describe("catalog domain invariants", () => {
  it("preserves product catalog context and excludes archived aggregates", () => {
    const product = getProductBySlug("control-fg-verde");
    expect(product).toMatchObject({ category: { slug: "botines" }, brand: { slug: "arena-control" }, currency: "ARS", status: "published", isActive: true });
    expect(getProducts().some((item) => item.slug === "producto-archivado-demo")).toBe(false);
  });

  it("uses a selected variant price override and keeps base price otherwise", () => {
    const product = getProductBySlug("control-fg-verde")!;
    const override = product.variants.find((variant) => variant.id.endsWith("41"))!;
    const base = product.variants.find((variant) => variant.id.endsWith("40"))!;
    expect(override.price ?? product.price).toBe(115000);
    expect(base.price ?? product.price).toBe(product.price);
  });

  it("keeps MVP brands fictional and evaluates sale and gallery rules", () => {
    expect(brands.map((brand) => brand.name).join(" ")).not.toMatch(/nike|adidas|puma/i);
    for (const product of products) {
      expect(product.compareAtPrice !== null && product.compareAtPrice > product.price).toBe(product.slug === "control-fg-verde" || product.slug === "camiseta-verde-arena-local" || product.slug === "campera-northline-training" || product.slug === "botella-matchday-studio");
      const ordered = [...product.images].sort((a, b) => a.position - b.position);
      expect(ordered[0]?.isPrimary).toBe(true);
    }
  });
});
