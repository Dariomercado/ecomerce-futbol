# Mock data strategy

Mock data is the first data source for the storefront.

## Purpose

Use mocks to validate UI, sitemap, flows, and business assumptions before database modeling.

## Initial mock entities

| Entity | Purpose |
| --- | --- |
| Product | Render cards, detail pages, prices, and stock labels |
| Category | Drive category pages and navigation |
| Product option | Represent sizes, colors, or variants |
| Promotion badge | Show discounts, featured labels, or new arrivals |

## Suggested product fields

```ts
type MockProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: "ARS";
  categorySlug: string;
  imageUrl: string;
  sizes-: string[];
  isFeatured-: boolean;
  stockLabel: "in-stock" | "low-stock" | "out-of-stock";
};
```

## Rules

- Mock data should be realistic enough to expose layout problems.
- Mock data should not imitate the final database schema too early.
- Database models should be designed after UI and flow validation.

