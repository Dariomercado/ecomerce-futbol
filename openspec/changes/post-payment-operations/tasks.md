# Tasks: Protected Post-Payment Operations

## Baseline (already implemented; do not reimplement)
- [x] States, migration, Mercado Pago gateway, ledger service, and terminal webhook mapping exist.
- [x] ACTIVE-only release, winner reread, HTTP boundary, docs, migration application, and full proof are complete.

## Review Workload Forecast
| Field | Value |
|---|---|
| Estimated changed lines | 650-900 authored |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Boundary -> transaction/service -> proof |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units
| Unit | Goal | PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Protected boundary | PR 1 | `pnpm test -- src/lib/payments/post-payment.test.ts` | authenticated local POST; no provider call | auth adapter and routes |
| 2 | Correct terminal transaction | PR 2 | `pnpm test -- src/lib/payments/post-payment.test.ts src/lib/payments/webhook.test.ts` | seeded DB transaction | repository, service, webhook |
| 3 | Operate and prove | PR 3 | `pnpm test -- src/lib/payments` | sandbox operation via secret manager | docs, config, rollout evidence |

## Phase 1: Auth and Contract
- [x] 1.1 RED: add auth/route tests proving absent, mismatched, or unset tokens return `401`/`403`/`503` before DB, gateway, or stock work.
- [x] 1.2 Create `src/lib/admin/temporary-admin-auth.ts`: server-only Bearer parsing, SHA-256/`timingSafeEqual`, and no leakage. **Files: 2 max.**
- [x] 1.3 Add typed `post-payment.ts` errors and redacted mapping: `404`, `409`, `422`, `502`. **Files: 1 max.**

## Phase 2: Handlers
- [x] 2.1 RED: create `src/app/api/internal/orders/[orderId]/*/route.test.ts` for exact JSON and no-body POST.
- [x] 2.2 Create `cancel/route.ts` and `refund/route.ts`; authenticate first, then construct collaborators and call `executePostPaymentOperation`. **Files: 4 max including tests.**

## Phase 3: Transaction, Ledger, Webhook
- [x] 3.1 RED: cover `PAID + CONSUMED -> REFUNDED + RELEASED`, `ACTIVE -> RELEASED`, duplicate/retry, action-webhook race, and rollback.
- [x] 3.2 Refactor `src/lib/checkout/order-repository.ts` to one serializable conditional release helper: cancel claims `ACTIVE`; refund claims `CONSUMED`; each increments stored quantities once and retries serialization conflicts. **Files: 2 max.**
- [x] 3.3 Update `post-payment.ts`: completed-first, unique-create winner reread/key reuse, normalized terminal provider status, and `RUNNING` retained on `502`. **Files: 2 max.**
- [x] 3.4 Use the shared helper from webhook processing; late/duplicate receipts acknowledge without order reversal or stock changes. **Files: 3 max.**

## Phase 4: Operations and Proof
- [x] 4.1 Update `.env.example` and add `docs/operations/post-payment.md`: setup, rotation/removal disablement, redaction, rollback/reconciliation, limits, and `supabase-admin-auth`. **Files: 2 max.**
- [x] 4.2 Validate schema/migration; run `pnpm exec prisma migrate deploy`, stop dev server only if DLL-locked, then `pnpm exec prisma generate`; edit only if drift is proven.
- [x] 4.3 Run focused Vitest unit/integration/route suites, `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build`.
- [x] 4.4 Execute sandbox cancel/refund E2E using secret-manager env only; redact IDs/tokens, verify one restock and duplicate-webhook safety; no automated commits.
