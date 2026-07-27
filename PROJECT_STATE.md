# Project State

This is the concise operational checkpoint for resuming work. The detailed
source of truth is `openspec/changes/catalog-products/`.

## Resume Point

Continue Slice 4 with **Work Unit 4B - Catalog and detail API-backed**. Work
Unit 4A is complete: home featured products consume the public endpoint while
retaining the established home UI contract.

| Item | Current state |
| --- | --- |
| Latest Slice 3 commit | `62bc8ec` - `feat(catalog): complete featured products API` |
| Public API phase | Work Units 3B-3E complete |
| Native SDD status | 26/36 complete, 10 pending, no blockers |
| Next SDD work | Slice 4, Work Unit 4B |
| Catalog UI data source | Home featured products use the API; catalog and detail remain mock-backed |
| Authentication decision | Supabase Auth only; implementation is a future slice |
| Commercial data | Prisma + PostgreSQL remain authoritative |
| Checkout identity | Guest checkout allowed; customer identity is optional |
| Automated tests | No test runner is configured |

## Current Implementation

- Slice 1 catalog and product-detail routes remain mock-backed.
- Slice 2 provides Prisma, PostgreSQL infrastructure, migration, and seed data.
- Slice 3 provides public read-only catalog routes under `/api/catalog/*`.
- Slice 4A uses `/api/catalog/featured-products` on home, including loading,
  empty, and error states.
- Slice 4B must migrate catalog listing and product detail while preserving
  their component contracts.

## Scope Boundaries

- Keep public catalog APIs read-only.
- Do not begin cart, checkout, Mercado Pago, Supabase Auth, or product admin.
- Checkout must work without authentication when it is implemented.
- Supabase owns authentication only; Prisma + PostgreSQL own commercial data.
- Admin access requires both identity and application authorization.
- Treat unrelated `.atl` changes and OpenSpec review mirrors as out of scope.

## Verification Context

No test runner is configured. Use lint, TypeScript, and runtime checks for
HTTP-boundary work.
