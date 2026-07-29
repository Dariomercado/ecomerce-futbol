# Tasks: Catalog Products

## Current status

Phases 1 through 5 are complete. Phase 5 delivers a local, session-only cart with selected-variant stock bounds verified by the external runtime matrix. Local PostgreSQL, the initial catalog migration, repeatable seed data, the public read-only catalog API, and API-backed home/catalog/detail UI are complete. Guest checkout, payments, Supabase Auth, authenticated admin authorization, and automated tests remain pending. Current progress is 31/37 tasks complete, with 6 pending.

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
| Suggested split | PR1 Slice 1 -> PR2 Slice 2 -> PR3 Slice 3 -> PR4 Slice 4 -> PR5 Slice 5 -> PR6 Slice 6 -> PR7 Slice 7 -> PR8 Slice 8 |
| Delivery strategy | ask-on-risk (resolved) |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Mock catalog/detail UI | PR1 | Completed and committed; no Prisma/API/cart/checkout/admin. |
| 2A.3 | Local PostgreSQL infrastructure + initial migration | PR2 | Docker Compose and `DATABASE_URL` template are in place; the initial migration is generated and applied locally. No seed/API/UI/cart/checkout/admin. |
| 2B | Product seed | PR2 | Complete and validated with natural-key upserts, fixture-scoped counts, and repeatable seed execution. |
| 3 | Public read API | PR3 | Complete through Work Unit 3E; final commit `62bc8ec`. |
| 4A | Home API-backed | PR4 | Complete; home consumes featured-products API and preserves its UI contract. |
| 4B | Catalog and detail API-backed | PR4 | Complete; list/detail UI consumes public APIs while preserving Slice 1 component contracts. |
| 5 | Cart | PR5 | Complete: local/session-only cart with selected-variant stock bounds verified by the external runtime matrix. |
| 6 | Guest checkout + Mercado Pago | PR6 | Pending payment flow after cart; authentication must remain optional. |
| 7 | Supabase Auth | PR7 | Pending optional customer identity and required admin identity; no catalog/commercial data migration. |
| 8 | Product admin | PR8 | Pending admin CRUD with authenticated authorization, separated from public API. |

## Phase 1: Slice 1 - Catalog UI with local mock data + Product Detail UI with local mock data

- [x] 1.1 Create `src/lib/catalog/types.ts`, `mock-data.ts`, and `queries.ts` with ARS prices, proprietary brands, flat categories, variants, images, and inactive filtering.
- [x] 1.2 Create `src/app/catalogo/page.tsx` and `src/components/catalog/{CatalogFilters,CatalogTopBar,ProductGrid,ProductCard,CatalogEmptyState}.tsx`.
- [x] 1.3 Create `src/app/productos/[slug]/page.tsx` and `src/components/catalog/{ProductGallery,VariantSelector,MockCartCTA}.tsx`.
- [x] 1.4 Update navigation toward `/catalogo` from the header/home surfaces.

## Phase 2: Slice 2 - Persistence foundation

Status: complete.

### Work Unit 2A.3 - Local PostgreSQL infrastructure + initial migration

- [x] Add `docker-compose.yml` with a `postgres` service using `postgres:16-alpine`.
- [x] Configure local database `ecomerce_futbol`, user `ecomerce_futbol`, password `ecomerce_futbol_password`, host port `5432`, persistent volume `postgres_data`, and `pg_isready` healthcheck.
- [x] Document the recommended local `DATABASE_URL` in `.env.example`.
- [x] Generate and apply the initial catalog migration with `prisma migrate dev`.

Out of scope for Work Unit 2A.3:

- No seed.
- No API routes.
- No UI changes.
- No real cart.
- No checkout.
- No admin.

### Work Unit 2B - Product seed

- [x] Add `prisma/seed.ts` with 4 MVP categories, 5 fictional brands, 8 products, 14 SKU-addressable variants, and 10 ordered images.
- [x] Use natural-key upserts and validate fixture-scoped catalog counts in a transaction.
- [x] Validate Prisma, generate the client, run the seed twice with identical counts, and pass TypeScript and lint checks.

Size exception: The user explicitly approved Work Unit 2B above the 400-line budget because this atomic seed intentionally mirrors the complete approved fixture: 8 products, 14 variants, and 10 images. This exception applies only to Work Unit 2B.

## Phase 3: Slice 3 - Public read-only API

Status: complete. Work Units 3A through 3E are implemented. Public catalog routes are namespaced under `/api/catalog/*`.

Approved Slice 3 dependency order: 3A -> 3B -> 3C -> 3D -> 3E.

### Work Unit 3A - Prisma singleton + public contracts

- [x] Add the development-safe Prisma singleton in `src/lib/prisma.ts`.
- [x] Add Prisma-independent public catalog DTOs, normalized list-query types, pagination contracts, and stable validation error types in `src/lib/catalog/public-contracts.ts`.

### Work Unit 3B - Public catalog repository

- [x] Add read-only repository queries and Prisma-to-public-contract mappers.
- [x] Apply published/active visibility, active variant filtering, ordered images, AND-composed filters, search across name and description, sorting, and pagination.
- [x] Depends on 3A. No HTTP routes are part of this unit.

### Work Unit 3C - Product list route

- [x] Add `GET /api/catalog/products` with normalized query validation, stable 400 errors, and the `{ data, pagination }` envelope.
- [x] Support category, brand, minimum/maximum price, sort, search, featured, page, and limit parameters; return `200` with `data: []` when no products match.
- [x] Depends on 3B.

### Work Unit 3D - Product detail route

- [x] Add `GET /api/catalog/products/[slug]` using the public product-detail contract.
- [x] Add `GET /api/catalog/categories` and `GET /api/catalog/brands`.
- [x] Depends on 3C.

### Work Unit 3E - Featured route + cross-endpoint hardening

- [x] Add `GET /api/catalog/featured-products`.
- [x] Harden validation, stable error behavior, response contracts, and visibility rules consistently across all public catalog endpoints.
- [x] Depends on 3D.

## Phase 4: Slice 4 - Connect UI to API

Status: complete. Home featured products, catalog listing, and product detail use the public catalog backend.

### Work Unit 4A - Home API-backed

- [x] 4.1 Replace the home featured-products fixture read with `GET /api/catalog/featured-products`, preserving the established home section layout, links, price display, loading/error behavior, and public product visibility contract.

### Work Unit 4B - Catalog listing and product detail API-backed

- [x] 4.2 Replace local reads in `src/app/catalogo/page.tsx` and `src/app/productos/[slug]/page.tsx` with the public products, categories, brands, and product-detail APIs while preserving existing component contracts and URL filter behavior.
- [x] 4.3 Run focused scenario verification for home featured products, catalog filters, empty results, product not found, sale pricing, gallery ordering, and active variant selection using API data.

## Phase 5: Slice 5 - Cart

Status: complete. The local, session-only cart supports real product and variant selections without checkout or persistence, and selected-variant stock bounds are covered by the external runtime matrix.

- [x] 5.1 Add cart types/state under `src/lib/cart/` for product and variant selections.
- [x] 5.2 Add `src/components/cart/*`, `src/app/carrito/page.tsx`, and real cart behavior for `MockCartCTA`.
- [x] 5.3 Carry selected-variant stock into cart lines and prevent add/increment operations from exceeding that bound; add focused runtime coverage for zero-stock and at-stock behavior.

## Phase 6: Slice 6 - Guest checkout + Mercado Pago

Status: pending. There is no checkout or Mercado Pago integration yet.

- [ ] 6.1 Add `src/app/checkout/page.tsx`, `src/lib/checkout/*`, and checkout/order API boundaries that accept guest contact and shipping data. An order may store a nullable reference to an authenticated Supabase user, but authentication must never be required to place an order.
- [ ] 6.2 Add `src/lib/payments/*` Mercado Pago boundaries after approved config; verify totals and failure recovery.

## Phase 7: Slice 7 - Supabase Auth

Status: pending. Supabase is selected for authentication only and is not configured yet.

- [ ] 7.1 Add Supabase Auth boundaries for optional customer accounts and required admin sign-in. Keep catalog, cart, order, and other commercial data in Prisma + PostgreSQL.
- [ ] 7.2 Add and verify a distinct application authorization policy for administrative access. A valid Supabase session establishes identity but does not grant an admin role by itself.

## Phase 8: Slice 8 - Product admin

Status: pending. There is no admin surface yet.

- [ ] 8.1 Add `src/app/admin/products/*`, `src/lib/admin/*`, and `src/app/api/admin/products/*` behind the Slice 7 authentication and authorization boundaries.
- [ ] 8.2 Verify unauthenticated and authenticated-but-unauthorized users cannot perform admin mutations, and keep those mutations separate from public read-only APIs.

## Verification snapshot

Read-only checks confirmed during this documentation sync:

- `src/lib/catalog/` exists with catalog types, mock data, and queries.
- `src/components/catalog/` exists with catalog grid/card, empty state, gallery, variant selector, and mock cart CTA components.
- `src/app/catalogo/page.tsx` exists.
- `src/app/productos/[slug]/page.tsx` exists.
- `prisma/schema.prisma` exists.
- Local PostgreSQL infrastructure is defined in `docker-compose.yml`, and the database is healthy.
- The initial Prisma migration exists at `prisma/migrations/20260615232133_init_catalog_schema/migration.sql` and has been applied locally.
- `prisma validate` and `prisma generate` passed.
- `prisma db seed` passed twice with identical counts: 4 categories, 5 brands, 8 products, 14 variants, and 10 images.
- `tsc --noEmit` and lint passed.
- `src/lib/catalog/prisma-public-repository.ts` and its public mappers implement the read-only repository layer (`45008c0`).
- Public catalog list, detail, category, brand, and featured routes exist under `src/app/api/catalog/` (`5e567f7`, `33472b8`, `482b3e3`, `95ff5c7`, `62bc8ec`).
- Automated tests have not been added for this slice.
