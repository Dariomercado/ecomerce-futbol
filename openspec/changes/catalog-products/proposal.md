# Proposal: Catalog Products

## Intent

Define the catalog foundation for a football ecommerce storefront: product concepts, future read APIs, catalog browsing, and product detail UX. The first implementation slice must validate behavior with local typed mock data before adding persistence, APIs, cart, or checkout.

## Scope

### In Scope
- Conceptual `Product`, `ProductVariant`, `Category`, `Brand`, and `ProductImage` rules.
- Future public read-only API contracts for product list, detail, featured products, categories, and brands.
- `/catalogo` UI planning with category, brand, featured filters, responsive grid, and empty state.
- `/productos/[slug]` UI planning with gallery, optional variants, and disabled/mock cart CTA.

### Out of Scope
- Prisma, database, seed, Route Handlers, Server Actions, Supabase, payments, real cart, checkout, admin CRUD, uploads, promotion engine, and SEO category pages.
- Real `/botines`, `/camisetas`, `/entrenamiento`, or `/accesorios` pages; navigation uses `/catalogo` query filters.

## Capabilities

### New Capabilities
- `catalog-products-domain`: Product, variant, category, brand, image, pricing, publication, and MVP/V2 rules.
- `products-public-api`: Future public read-only list, filter, detail, featured, category, and brand contracts.
- `catalog-ui`: Catalog route, filters, responsive grid, editorial categories, and empty state.
- `product-detail-ui`: Detail route, gallery, brand/category context, variant selector, and mock cart CTA behavior.

### Modified Capabilities
- None; `openspec/specs/` is empty.

## Approach

Use a UI-first, mock-first plan. Split specs by domain, API, catalog UI, and detail UI so the first slice ships visual routes with typed local data while preserving upgrade paths for Prisma, APIs, stock validation, cart, and checkout.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `openspec/specs/catalog-products-domain/spec.md` | New | Future catalog entity/rule spec. |
| `openspec/specs/products-public-api/spec.md` | New | Future public read API spec. |
| `openspec/specs/catalog-ui/spec.md` | New | Future catalog browsing spec. |
| `openspec/specs/product-detail-ui/spec.md` | New | Future product detail spec. |
| `src/lib/catalog/*` | Planned | Future local mock data/filter helpers. |
| `src/app/catalogo/page.tsx` | Planned | Future catalog screen. |
| `src/app/productos/[slug]/page.tsx` | Planned | Future detail screen. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backend overbuild | Medium | Keep first slice UI-only with local data. |
| Ambiguous variant rules | Medium | Separate MVP simplifications from V2 stock/image validation. |
| Weak fictional branding | Low | Use consistent proprietary brands and examples. |

## Rollback Plan

Revert `openspec/changes/catalog-products/proposal.md` and the Engram artifact. No runtime files are changed.

## Dependencies

- Next.js App Router storefront conventions and hybrid SDD setup.

## Success Criteria

- [ ] Specs can be created for the four listed capabilities without implementation.
- [ ] First slice is limited to local typed mock data and visual catalog/detail UI.
- [ ] Deferred backend, cart, checkout, admin, and payment work is explicit.


