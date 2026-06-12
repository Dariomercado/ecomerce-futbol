# Folder structure

This is the proposed structure for the future Next.js app. It is not created yet because the project has not been scaffolded.

```text
src/
  app/
    (storefront)/
      page.tsx
      products/
      categories/
    cart/
    checkout/
  components/
    ui/
    layout/
    product/
  features/
    catalog/
      components/
      data/
      types/
    cart/
      components/
      state/
      types/
    checkout/
      components/
      types/
  lib/
    constants/
    utils/
  mocks/
    products.ts
    categories.ts
  styles/
  types/
```

## Rules

- Keep reusable primitives in `components/ui`.
- Keep layout-specific pieces in `components/layout`.
- Keep product display components in `components/product`.
- Keep feature behavior inside `features/*`.
- Keep mock fixtures in `mocks`.
- Do not add backend folders until backend integration starts.

## Why this shape

The structure separates reusable UI from business flows. That matters because catalog, cart, checkout, and admin will evolve at different speeds.

