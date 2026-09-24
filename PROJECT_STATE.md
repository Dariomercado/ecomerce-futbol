# Project State

This is the concise operational checkpoint for resuming work. The detailed
source of truth for the payment slice is `openspec/changes/post-payment-operations/`.

## Operating Mode

The repository is using a transparent **ordinary-policy compatibility mode**:
RDD stays disabled at clone scope, no receipt or native approval may be
simulated, and lightweight SDD/OpenSpec planning plus delegated implementation
and ordinary verification remain in use. See
[`docs/development/gentle-ai-workflow.md`](docs/development/gentle-ai-workflow.md).

The current native SDD attempt-ledger/authority block is a historical
infrastructure-state limitation, not an application defect. Do not retry
native `verify` or `archive` until Gentle AI publishes and the environment
installs a relevant fix, or an authorized maintainer explicitly repairs the
native authority. Record future native blocks once with bounded evidence; do
not enter retry loops. `/plan` is optional and is not a workflow precondition.

## Resume Point

Updated 2026-09-22. The next delivery slice is the admin visual polish and
safe catalog restore work. Supabase Storage for drag-and-drop and multiple
product images follows; roles/RBAC and final portfolio verification come
after that.

The payment implementation is functionally complete, but the
`post-payment-operations` change is not formally archived yet. Continue under
ordinary repository policy; retain truthful verification evidence and do not
claim a native archive result while its authority remains blocked.

| Item | Current state |
| --- | --- |
| Latest payment-core commit | `18100af` - `feat(payments): complete payment core and checkout bridge` |
| Slice 6.2A | Complete |
| Slice 6.2B | Complete; historical RDD approval exists, but RDD is currently disabled |
| Slice 6.2C | Complete; application boundary covers payment routes, webhooks, and reconciliation |
| Slice 6.2D | Already implemented: CardForm, tokenization, 3DS, and checkout UI |
| Bridge | Complete; durable reconciliation compatibility foundation |
| Post-payment operations | Functionally complete; OpenSpec tasks 15/15, including sandbox E2E task 4.4 |
| Ordinary verification | 21 test files / 165 tests passing; typecheck passes; lint has 0 errors / 2 warnings |
| Formal verification | `verify-report.md` remains a historical, stale FAIL (9/10 snapshot); native refresh and archive remain blocked by authority state |
| RDD mode | Disabled at clone scope; do not enable, simulate, or substitute receipts |
| Operational workflow | Lightweight SDD/OpenSpec planning + delegated implementation + Vitest/lint/typecheck/build/E2E under ordinary policy |
| Native retry criterion | Published and installed Gentle AI fix, or explicit authorized authority repair |
| Production deployment | Recovered and verified on 2026-09-15; Supabase is healthy, four Prisma migrations are applied, and the seeded catalog loads in production |
| Catalog UI data source | Home, catalog, and detail use public catalog data |
| Authentication decision | Supabase Auth only; Magic Link sign-in and callback/auth boundary exist locally. Persistent roles/RBAC are not finished, and deployment still requires verification |
| Admin catalog | CRUD, archive/restore, request-integrity/CSRF protection, authorization, audit logging, and focused tests exist locally; the current slice also improves admin form controls visually |
| Commercial data | Prisma + PostgreSQL remain authoritative |
| Checkout identity | Guest checkout allowed; customer identity is optional |
| Deployment configuration | Netlify Production uses Supavisor Transaction pooler on port 6543 with `?pgbouncer=true`; public GitHub repository and scheduler remain configured |

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
- Bridge provides durable reconciliation support, leases, reservation
  transitions, and server-only provider order lookup.
- Slice 6.2C provides payment routes, webhooks, cancellation/refund
  transitions, idempotency, and sandbox refund proof. The focused PAID
  cancellation test covers `422 ORDER_NOT_CANCELLABLE` with zero provider calls.
- Slice 6.2D is implemented: CardForm, tokenization, 3DS, and checkout UI.
- Admin catalog management is implemented locally with CRUD, safe archive/
  restore, request-integrity/CSRF checks, authorization, audit logging, and
  focused tests. Admin inputs, selects, and textareas also received visual
  improvements.
- Netlify Production is configured with the Supavisor Transaction pooler; GitHub
  Actions remains configured for scheduled reconciliation.
- Supabase Magic Link sign-in, callback handling, and the server-side auth
  boundary are present locally. Persistent roles/RBAC remain future work, so
  this is not yet a complete authentication or admin feature release.

## Production recovery (2026-09-15)

- Supabase Free paused the project after inactivity. The project was resumed and
  verified healthy; production catalog reads recovered.
- GitHub Actions **Reconcile payments** run `#406` completed successfully after
  configuring the endpoint and reconciliation secrets in GitHub, and the
  reconciliation plus Mercado Pago server secrets in Netlify.
- The database credential was rotated. The Netlify Prisma connection uses the
  Supavisor Transaction Pooler and requires `?pgbouncer=true`; catalog reads
  were verified again after the update.
- `POST_PAYMENT_ADMIN_TOKEN` has not been verified in Netlify. Do not claim
  that cancellation or refund administration is operational until it is
  separately configured and verified.

## Scope Boundaries

- Keep public catalog APIs read-only.
- Preserve the configured production scheduler and deployment integration.
- Checkout must work without authentication when it is implemented.

## Next slices

1. Deliver the admin visual polish and safe catalog restore slice.
2. Add Supabase Storage support for drag-and-drop uploads and multiple product
   images.
3. Complete persistent roles/RBAC.
4. Run final verification, deployment checks, and portfolio documentation.
