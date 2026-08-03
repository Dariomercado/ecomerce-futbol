# Proposal: Catalog Products Through Local Cart

## Intent

Deliver the catalog foundation and the first usable shopping flow for a football ecommerce storefront. The active change now covers the accumulated work from Slice 1 through Slice 6.1: typed catalog UI, PostgreSQL persistence, public read APIs, API-backed catalog/detail screens, a local session-only cart, and a guest checkout/order boundary.

Slice 1 intentionally validated the catalog and product-detail experience with typed local mock data and no backend or cart state. That boundary remains part of the delivery history; later phases deliberately expanded the active change.

## Scope

### In Scope

- `Product`, `ProductVariant`, `Category`, `Brand`, and `ProductImage` domain rules.
- PostgreSQL/Prisma catalog persistence and repeatable seed data.
- Public read-only product, detail, featured-product, category, and brand APIs.
- API-backed `/catalogo` and `/productos/[slug]` experiences.
- Variant selection where applicable, including unavailable-stock feedback.
- A local, session-only `/carrito` flow with product/variant line identity, equivalent-line consolidation, quantity controls, totals, header count, removal, and empty state.
- Cart quantity bounded by the selected variant's available stock.
- Guest checkout contact and shipping capture with no authentication requirement.
- A local pending-order API boundary that recalculates commercial totals from trusted catalog and variant data.

### Out of Scope

- Cart persistence across reloads, browser sessions, devices, or authenticated accounts.
- Mercado Pago or other payment processing, payment configuration, webhooks, and payment UI.
- Supabase Auth, customer accounts, admin authorization, product admin, uploads, and promotion engine.
- Real `/botines`, `/camisetas`, `/entrenamiento`, or `/accesorios` pages; navigation continues to use `/catalogo` query filters.

## Capabilities

### New Capabilities

- `catalog-products-domain`: Product, variant, category, brand, image, pricing, publication, and stock rules.
- `products-public-api`: Public read-only list, filter, detail, featured, category, and brand contracts.
- `catalog-ui`: Catalog route, filters, responsive grid, editorial categories, and empty state.
- `product-detail-ui`: Detail route, gallery, product context, variant selection, and validated add-to-cart intent.
- `cart`: Local/session-only line management, quantity/stock rules, totals, header count, and empty state.
- `checkout`: Guest contact/shipping capture and a local pending-order boundary with server-side catalog price verification.

### Modified Capabilities

- None; these capabilities are introduced by this active change.

## Approach

Deliver the change in explicit slices:

1. Validate catalog/detail UX against typed local fixtures.
2. Add Prisma/PostgreSQL persistence and repeatable seed data.
3. Expose stable public read APIs.
4. Move catalog/detail UI to those APIs without changing user-facing contracts.
5. Add a client-side cart provider and route while keeping persistence deferred.
6. Add the Slice 6.1 guest checkout/order boundary; keep payment processing and account authentication deferred.

## Affected Areas

| Area | Impact |
|---|---|
| `prisma/*`, `src/lib/catalog/*` | Catalog persistence, seed, contracts, and read repository |
| `src/app/api/catalog/*` | Public read-only catalog endpoints |
| `src/app/catalogo/*`, `src/app/productos/*`, `src/components/catalog/*` | API-backed catalog and detail UI |
| `src/lib/cart/*`, `src/components/cart/*`, `src/app/carrito/*` | Local cart state and presentation |
| `src/lib/checkout/*`, `src/app/checkout/*`, `src/app/api/checkout/orders/*` | Guest contact/shipping and local pending-order boundary |
| `src/app/layout.tsx`, `src/components/layout/header.tsx` | Cart provider and header count integration |

## Risks

| Risk | Mitigation |
|---|---|
| Client cart exceeds live stock | Carry selected-variant stock into cart lines and enforce the bound on add/increment. |
| Session-only cart is mistaken for durable state | Explicitly exclude persistence and communicate the boundary in UI and specs. |
| API/UI contract drift | Preserve public DTOs and verify list/detail scenarios against runtime data. |

## Success Criteria

- [x] Catalog persistence, public read APIs, and API-backed catalog/detail UI are delivered.
- [x] A local session-only cart supports selection, equivalent-line consolidation, quantity changes, removal, totals, header count, and empty state.
- [x] Cart quantity cannot exceed the selected variant's available stock.
- [x] Guest checkout accepts contact and shipping data without requiring authentication, and server-side order totals derive from trusted catalog data.
- [x] Payment processing, authentication, and admin behavior remain outside the delivered scope.
