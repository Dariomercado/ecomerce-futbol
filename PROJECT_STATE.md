# Project State

This is the concise operational checkpoint for resuming work. The detailed
source of truth is `openspec/changes/catalog-products/`.

## Resume Point

Continue Slice 5 with **Work Unit 5 - Cart**. Slice 4 is complete: home,
catalog, and product detail consume the public catalog backend while retaining
their established UI contracts.

| Item | Current state |
| --- | --- |
| Latest Slice 3 commit | `62bc8ec` - `feat(catalog): complete featured products API` |
| Public API phase | Work Units 3B-3E complete |
| Native SDD status | 28/36 complete, 8 pending, no blockers |
| Next SDD work | Slice 5, Work Unit 5 |
| Catalog UI data source | Home, catalog, and detail use public catalog data |
| Authentication decision | Supabase Auth only; implementation is a future slice |
| Commercial data | Prisma + PostgreSQL remain authoritative |
| Checkout identity | Guest checkout allowed; customer identity is optional |
| Automated tests | No test runner is configured |

## Current Implementation

- Slice 1 visual catalog and product-detail components are retained with public data adapters.
- Slice 2 provides Prisma, PostgreSQL infrastructure, migration, and seed data.
- Slice 3 provides public read-only catalog routes under `/api/catalog/*`.
- Slice 4A uses `/api/catalog/featured-products` on home, including loading,
  empty, and error states.
- Slice 4B uses client Route Handler reads for interactive catalog loading,
  error, and empty states; the detail Server Component reads the public
  repository directly so server-safe `notFound()` behavior is preserved.

## Scope Boundaries

- Keep public catalog APIs read-only.
- Do not begin cart, checkout, Mercado Pago, Supabase Auth, or product admin.
- Checkout must work without authentication when it is implemented.
