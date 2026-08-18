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

The payment implementation is functionally complete, but the
`post-payment-operations` change is not formally archived yet. Continue under
ordinary repository policy; retain truthful verification evidence and do not
claim a native archive result while its authority remains blocked.

| Item | Current state |
| --- | --- |
| Latest payment-core commit | `18100af` - `feat(payments): complete payment core and checkout bridge` |
| Slice 6.2A | Complete |
| Slice 6.2B | Complete; historical RDD approval exists, but RDD is currently disabled |
| Bridge | Complete; durable reconciliation compatibility foundation |
| Post-payment operations | Functionally complete; OpenSpec tasks 15/15, sandbox E2E 4.4 completed |
| Formal verification | Historical `verify-report.md` is stale FAIL 9/10; remediation passes ordinary tests, but native refresh/archive is blocked by historical authority state |
| RDD mode | Disabled at clone scope; do not enable, simulate, or substitute receipts |
| Operational workflow | Lightweight SDD/OpenSpec planning + delegated implementation + Vitest/lint/typecheck/build/E2E under ordinary policy |
| Native retry criterion | Published and installed Gentle AI fix, or explicit authorized authority repair |
| Next product slice | Remaining Slice 6.2C: payment routes, webhooks, and reconciliation gaps |
| Later SDD work | Slice 6.2D: CardForm, tokenization, 3DS, and final UI |
| Catalog UI data source | Home, catalog, and detail use public catalog data |
| Authentication decision | Supabase Auth only; implementation is a future slice |
| Commercial data | Prisma + PostgreSQL remain authoritative |
| Checkout identity | Guest checkout allowed; customer identity is optional |
| Automated tests | Vitest is configured; latest ordinary verification: 157 tests passed, typecheck/build pass, lint 0 errors/2 warnings |

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
- `post-payment-operations` adds payment routes, webhooks, cancellation/refund
  transitions, idempotency, and the sandbox refund proof. The focused PAID
  cancellation test now covers `422 ORDER_NOT_CANCELLABLE` with zero provider
  calls.
- Remaining 6.2C work is the product-level route/webhook/reconciliation
  follow-through after this change is formally closed. 6.2D CardForm,
  tokenization, 3DS, and final UI remain later work.

## Scope Boundaries

- Keep public catalog APIs read-only.
- Do not begin 6.2D before 6.2C is complete and separately authorized.
- Checkout must work without authentication when it is implemented.
