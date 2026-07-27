# Project State

This is the concise operational checkpoint for resuming work. The detailed source
of truth is `openspec/changes/catalog-products/`: its proposal, specs, design,
tasks, and apply-progress artifacts take precedence over this file.

## Resume Point

Start Slice 4 with **Work Unit 4A — Home API-backed**. It must consume the
public featured-products API without changing the established home UI contract.
Do not begin cart, checkout, payments, authentication, or admin work.

| Item | Current state |
| --- | --- |
| Latest Slice 3 commit | `62bc8ec` — `feat(catalog): complete featured products API` |
| Public API phase | Work Units 3B–3E complete after task-ledger reconciliation |
| Native SDD status | 25/36 complete, 11 pending, no blockers |
| Next SDD work | Slice 4, starting with Work Unit 4A |
| Catalog UI data source | Local mock data; UI is not API-backed yet |
| Authentication decision | Supabase Auth only; implementation is a future slice |
| Commercial data | Prisma + PostgreSQL remain authoritative |
| Checkout identity | Guest checkout allowed; customer identity is optional |
| Automated tests | No test runner is configured |

## Current Implementation

- Slice 1 catalog and product-detail UI routes exist and still read local mock
  catalog data.
- Slice 2 provides the Prisma schema, local PostgreSQL infrastructure, initial
  migration, and repeatable product seed.
- Slice 3 provides read-only public routes under `/api/catalog/*`, including
  products, product detail, categories, brands, and featured products.
- Public catalog reads apply the repository visibility rules; route handlers do
  not access Prisma directly.
- Slice 4 is split into 4A Home API-backed and 4B catalog listing/product detail
  API-backed, followed by focused scenario verification.

## Scope Boundaries

- Preserve the mock-backed UI until Work Unit 4A changes that boundary.
- Keep public catalog APIs read-only.
- Keep cart, checkout, Mercado Pago, Supabase Auth, and product administration
  deferred to their planned slices.
- Checkout must work without authentication. A future order may optionally
  reference an authenticated Supabase user.
- Supabase owns authentication only. Prisma + PostgreSQL continue to own
  catalog, cart, order, and other commercial data.
- Admin access requires both a valid Supabase identity and an application
  authorization decision; authentication alone never grants admin access.
- Treat unrelated `.atl` changes and OpenSpec review mirrors as outside the
  catalog resume checkpoint.

## Verification Context

The repository has lint and TypeScript checks, but no automated test runner.
Runtime checks remain required for HTTP-boundary work.

## References

- Detailed plan and task ledger: `openspec/changes/catalog-products/tasks.md`
- Requirements: `openspec/changes/catalog-products/specs/`
- Technical approach: `openspec/changes/catalog-products/design.md`
- Cumulative implementation evidence:
  `openspec/changes/catalog-products/apply-progress.md`
