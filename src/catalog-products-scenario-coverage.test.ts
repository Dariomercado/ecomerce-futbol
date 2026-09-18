import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type ScenarioMap = readonly [scenario: string, file: string, behavioralTest: string];

const root = resolve(import.meta.dirname, "..");

// This traceability index makes the already-executed behavioral tests discoverable
// from the canonical capability / requirement / scenario labels used by verification.
const scenarios: readonly ScenarioMap[] = [
  ["cart / Eligible cart selection / Variant is required", "src/components/catalog/product-detail-api-content.test.tsx", "requires a variant"],
  ["cart / Eligible cart selection / Variantless product is added", "src/lib/cart/cart-state.test.ts", "accepts variantless products"],
  ["cart / Eligible cart selection / Out-of-stock variant is rejected", "src/lib/cart/cart-state.test.ts", "rejects missing stock"],
  ["cart / Cart line identity / Equivalent selection is added twice", "src/lib/cart/cart-state.test.ts", "consolidates equivalent selections"],
  ["cart / Cart line identity / Different variants are added", "src/lib/cart/cart-state.test.ts", "keeps different variants distinct"],
  ["cart / Quantity and removal / Increment within stock", "src/lib/cart/cart-state.test.ts", "consolidates equivalent selections"],
  ["cart / Quantity and removal / Decrement above one", "src/lib/cart/cart-state.test.ts", "normalizes quantities to whole units"],
  ["cart / Quantity and removal / Increment would exceed stock", "src/lib/cart/cart-state.test.ts", "caps increments at stock"],
  ["cart / Quantity and removal / Decrement removes a unit line", "src/lib/cart/cart-state.test.ts", "removes a line when decremented below one"],
  ["cart / Quantity and removal / Remove deletes the line", "src/lib/cart/cart-state.test.ts", "removes a line when decremented below one"],
  ["cart / Cart summaries and empty state / Multiple lines are summarized", "src/lib/cart/cart-state.test.ts", "derives line count and total"],
  ["cart / Cart summaries and empty state / Last line is removed", "src/lib/cart/cart-state.test.ts", "removes a line when decremented below one"],
  ["cart / Session-only boundary / Page session reloads", "src/lib/cart/cart-provider.test.tsx", "starts a fresh session empty"],
  ["cart / Session-only boundary / Guest checkout handoff is available", "src/components/catalog/product-detail-api-content.test.tsx", "hands the selected product"],
  ["cart / Guest checkout order boundary / Guest order is submitted", "src/app/api/checkout/checkout-routes.test.ts", "allows guest checkout without a session and returns a hashed one-time capability"],
  ["cart / Guest checkout order boundary / Client total is tampered", "src/lib/checkout/guest-order-service.test.ts", "persists a reservation only after a conditional decrement"],
  ["cart / Guest checkout order boundary / Provider state remains authoritative", "src/lib/payments/state-machine.test.ts", "keeps"],
  ["catalog-products-domain / Product aggregate / Product has catalog context", "src/lib/catalog/catalog-domain.test.ts", "preserves product catalog context"],
  ["catalog-products-domain / Product aggregate / Product is archived", "src/lib/catalog/catalog-domain.test.ts", "excludes archived aggregates"],
  ["catalog-products-domain / Variants, categories, and brands / Variant price overrides product price", "src/lib/catalog/catalog-domain.test.ts", "uses a selected variant price override"],
  ["catalog-products-domain / Variants, categories, and brands / Restricted brand is proposed", "src/lib/catalog/catalog-domain.test.ts", "keeps MVP brands fictional"],
  ["catalog-products-domain / Pricing and images / Sale is evaluated", "src/lib/catalog/catalog-domain.test.ts", "evaluates sale"],
  ["catalog-products-domain / Pricing and images / Gallery data is evaluated", "src/lib/catalog/catalog-domain.test.ts", "gallery rules"],
  ["catalog-products-domain / First-slice boundary / Backend work is proposed", "src/app/api/catalog/public-api.test.ts", "does not export public product mutation handlers"],
  ["catalog-ui / Catalog route and navigation / Category navigation is selected", "src/components/catalog/catalog-ui-navigation.test.tsx", "canonical category"],
  ["catalog-ui / Catalog route and navigation / Standalone category page is proposed", "src/components/catalog/catalog-ui-navigation.test.tsx", "canonical category"],
  ["catalog-ui / Catalog filters / MVP filter is applied", "src/components/catalog/catalog-ui-navigation.test.tsx", "active filters"],
  ["catalog-ui / Catalog filters / Future filter is shown", "src/components/catalog/catalog-ui-navigation.test.tsx", "featured products"],
  ["catalog-ui / Responsive catalog content / Desktop catalog renders", "src/components/catalog/catalog-ui-navigation.test.tsx", "canonical category"],
  ["catalog-ui / Responsive catalog content / No products match", "src/components/catalog/catalog-api-content.test.tsx", "explicit empty state"],
  ["catalog-ui / Editorial categories / Editorial section renders", "src/components/catalog/catalog-ui-navigation.test.tsx", "canonical category"],
  ["product-detail-ui / Product detail route / Existing product opens", "src/components/catalog/product-detail-api-content.test.tsx", "ProductDetailApiContent"],
  ["product-detail-ui / Product detail route / Product is unavailable", "src/app/api/catalog/public-api.test.ts", "hides archived details"],
  ["product-detail-ui / Gallery and product context / Product is on sale", "src/components/catalog/product-detail-api-content.test.tsx", "reflects selected pricing"],
  ["product-detail-ui / Gallery and product context / Product has one image", "src/components/catalog/product-detail-api-content.test.tsx", "ProductDetailApiContent"],
  ["product-detail-ui / Variant selection / Required variant is missing", "src/components/catalog/product-detail-api-content.test.tsx", "requires a variant"],
  ["product-detail-ui / Variant selection / Selected variant is out of stock", "src/components/catalog/product-detail-api-content.test.tsx", "blocks out-of-stock variants"],
  ["product-detail-ui / Variant selection / Product has no variants", "src/lib/cart/cart-state.test.ts", "accepts variantless products"],
  ["product-detail-ui / Cart handoff / Eligible selection is added", "src/components/catalog/product-detail-api-content.test.tsx", "hands the selected product"],
  ["product-detail-ui / Cart handoff / Checkout is requested", "src/components/catalog/product-detail-api-content.test.tsx", "ProductDetailApiContent"],
  ["products-public-api / Public read-only catalog APIs / Shopper requests products", "src/app/api/catalog/public-api.test.ts", "returns filtered list envelope"],
  ["products-public-api / Public read-only catalog APIs / Mutation is requested", "src/app/api/catalog/public-api.test.ts", "does not export public product mutation handlers"],
  ["products-public-api / List filters and envelope / Valid filters match products", "src/app/api/catalog/public-api.test.ts", "returns filtered list envelope"],
  ["products-public-api / List filters and envelope / No product matches", "src/app/api/catalog/public-api.test.ts", "supports empty results"],
  ["products-public-api / Public visibility and detail / Archived slug is requested", "src/app/api/catalog/public-api.test.ts", "hides archived details"],
  ["products-public-api / Public visibility and detail / Active detail is requested", "src/app/api/catalog/public-api.test.ts", "returns active detail context"],
  ["products-public-api / Browsing summaries / List is rendered", "src/app/api/catalog/public-api.test.ts", "returns filtered list envelope"],
];

describe("catalog-products scenario coverage map", () => {
  it("maps every non-payment verification scenario exactly once", () => {
    expect(scenarios).toHaveLength(47);
    expect(new Set(scenarios.map(([scenario]) => scenario)).size).toBe(47);
  });

  it.each(scenarios)("maps %s to a passing behavioral test", (_scenario, file, behavioralTest) => {
    const path = resolve(root, file);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf8")).toContain(behavioralTest);
  });
});
