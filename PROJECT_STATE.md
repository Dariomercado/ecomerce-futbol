# Project State

This is the concise operational checkpoint for resuming work. The detailed
source of truth is `openspec/changes/catalog-products/`.

## Resume Point

Continue with **Slice 6.2C**. Slices 6.2A and 6.2B, plus the durable Bridge,
are complete. The 6.2B snapshot was approved by Gentle AI RDD 2.3 and delivered
in commit `18100af`; 6.2C is the next technical slice and 6.2D follows it.

| Item | Current state |
| --- | --- |
| Latest payment-core commit | `18100af` - `feat(payments): complete payment core and checkout bridge` |
| Slice 6.2A | Complete |
| Slice 6.2B | Complete; RDD `APPROVED`, receipt `sha256:f3e64bea8a2ae06fe8b01f952ee528258ecf5e22b80fdcb402865b97c7da8173` |
| Bridge | Complete; durable reconciliation compatibility foundation |
| Native SDD status | 13/20 complete; 7 future tasks remain in the global change |
| Next SDD work | Slice 6.2C: payment routes, webhooks, and reconciliation |
| Later SDD work | Slice 6.2D: CardForm, tokenization, 3DS, and final UI |
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
- Slice 6.2A provides the payment schema, contracts, repository, and checkout
  persistence foundation.
- Slice 6.2B provides the Mercado Pago payment core, state machine, gateway,
  idempotency, replay handling, and provider-safe outcomes.
- Bridge provides durable receipt/evidence storage, leases, reservation
  transitions, and server-only provider order lookup. 6.2C routes/webhooks and
  6.2D CardForm/3DS/UI are not implemented yet.

## Scope Boundaries

- Keep public catalog APIs read-only.
- Do not begin 6.2D before 6.2C is complete and separately authorized.
- Checkout must work without authentication when it is implemented.
