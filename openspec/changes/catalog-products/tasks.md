# Tasks: Catalog Products

## Current status

Slice 1 is implemented and committed. The catalog currently uses local mock data and UI-only flows; persistence, APIs, cart, checkout, payments, admin, and automated tests are still out of scope.

Recent commit evidence:

- `d8bcf7b` `fix(catalog): update remaining home catalog links`
- `69e39f4` `feat(catalog): wire catalog navigation`
- `ccf0f3e` `feat(catalog): add product detail mock page`
- `007f68a` `feat(catalog): add catalog page with mock filters`
- `4ceae80` `feat(catalog): add product card grid components`

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1600-2400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 Slice 1 -> PR2 Slice 2 -> PR3 Slice 3 -> PR4 Slice 4 -> PR5 Slice 5 -> PR6 Slice 6 -> PR7 Slice 7 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Mock catalog/detail UI | PR1 | Completed and committed; no Prisma/API/cart/checkout/admin. |
| 2 | Prisma schema and seed | PR2 | Pending persistence foundation. |
| 3 | Public read API | PR3 | Pending read-only shopper data. |
| 4 | API-backed UI | PR4 | Pending; preserve Slice 1 component contracts. |
| 5 | Cart | PR5 | Pending product/variant selections. |
| 6 | Checkout + Mercado Pago | PR6 | Pending payment flow after cart. |
| 7 | Product admin | PR7 | Pending admin CRUD separated from public API. |

## Phase 1: Slice 1 - Catalog UI with local mock data + Product Detail UI with local mock data

- [x] 1.1 Create `src/lib/catalog/types.ts`, `mock-data.ts`, and `queries.ts` with ARS prices, proprietary brands, flat categories, variants, images, and inactive filtering.
- [x] 1.2 Create `src/app/catalogo/page.tsx` and `src/components/catalog/{CatalogFilters,CatalogTopBar,ProductGrid,ProductCard,CatalogEmptyState}.tsx`.
- [x] 1.3 Create `src/app/productos/[slug]/page.tsx` and `src/components/catalog/{ProductGallery,VariantSelector,MockCartCTA}.tsx`.
- [x] 1.4 Update navigation toward `/catalogo` from the header/home surfaces.

## Phase 2: Slice 2 - Prisma schema + Product seed

Status: pending. The repository still has no `prisma/` directory.

- [ ] 2.1 Add `prisma/schema.prisma` models for Product, ProductVariant, Category, Brand, and ProductImage.
- [ ] 2.2 Add `prisma/seed.ts` with proprietary brands, MVP categories, active/inactive products, variants, and ordered images.

## Phase 3: Slice 3 - Public read-only API

Status: pending. The repository still has no `src/app/api/` directory.

- [ ] 3.1 Add `src/app/api/products/route.ts` with category, brand, price, sort, search, featured, page, and limit filters.
- [ ] 3.2 Add `src/app/api/products/[slug]/route.ts`, `categories/route.ts`, `brands/route.ts`, `featured-products/route.ts`, and catalog mappers.

## Phase 4: Slice 4 - Connect UI to API

Status: pending. Catalog pages still use local mock data.

- [ ] 4.1 Replace local reads in `src/app/catalogo/page.tsx` and `src/app/productos/[slug]/page.tsx` with API-backed access.
- [ ] 4.2 Verify filters, empty state, detail, sale, gallery, and variant scenarios with API data.

## Phase 5: Slice 5 - Cart

Status: pending. There is no real cart yet.

- [ ] 5.1 Add cart types/state under `src/lib/cart/` for product and variant selections.
- [ ] 5.2 Add `src/components/cart/*`, `src/app/carrito/page.tsx`, and real cart behavior for `MockCartCTA`.

## Phase 6: Slice 6 - Checkout + Mercado Pago

Status: pending. There is no checkout or Mercado Pago integration yet.

- [ ] 6.1 Add `src/app/checkout/page.tsx`, `src/lib/checkout/*`, and checkout API boundaries.
- [ ] 6.2 Add `src/lib/payments/*` Mercado Pago boundaries after approved config; verify totals and failure recovery.

## Phase 7: Slice 7 - Product admin

Status: pending. There is no admin surface yet.

- [ ] 7.1 Add `src/app/admin/products/*`, `src/lib/admin/*`, and `src/app/api/admin/products/*`.
- [ ] 7.2 Verify admin mutations remain separate from public read-only APIs.

## Verification snapshot

Read-only checks confirmed during this documentation sync:

- `src/lib/catalog/` exists with catalog types, mock data, and queries.
- `src/components/catalog/` exists with catalog grid/card, empty state, gallery, variant selector, and mock cart CTA components.
- `src/app/catalogo/page.tsx` exists.
- `src/app/productos/[slug]/page.tsx` exists.
- `prisma/` does not exist yet.
- `src/app/api/` does not exist yet.
- Automated tests have not been added for this slice.
