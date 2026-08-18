# Tasks: Catalog Products

## Completed history
Slices 1-6.1 and 6.2A/6.2B are complete. This is a narrow, compatibility foundation amendment; their approved logical guarantees remain unchanged.

## Review Workload Forecast
| Field | Value |
|---|---|
| Estimated changed lines | 1,650-2,150 |
| Delivery strategy | ask-on-risk |
| Suggested split | 6.2A -> 6.2B -> bridge foundation -> 6.2C -> 6.2D |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units
| Unit | Goal | Likely PR/base | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 6.2A | Complete foundation | PR1/tracker | `pnpm test:checkout` | local Prisma migration | A paths |
| 6.2B | Provider core | PR2/PR1 | `pnpm test:checkout` | timeout fake | payment core |
| Bridge | Durable compatibility | PR3/PR2 | `pnpm test -- src/lib/checkout/order-repository.test.ts src/lib/payments/webhook.test.ts src/lib/payments/service.test.ts` | local migration + fake authenticated GET | migration/repository/gateway; retain after dispatch |
| 6.2C | API/webhook/recovery | PR4/PR3 | `pnpm test:checkout` | signed webhook fake | API/recovery; depends Bridge |
| 6.2D | CardForm/3DS | PR5/PR4 | `pnpm test:checkout` | sandbox CardForm/3DS | UI/dispatch; retain reconciliation |

## Phase 6: Slice 6.2 Payments (TDD)
- [x] 6.2A.1 SETUP: dependencies, checkout test script, Vitest config.
- [x] 6.2A.2 RED: schema/reservation invariants.
- [x] 6.2A.3 GREEN/REFACTOR: initial schema/migration.
- [x] 6.2A.4 RED: contracts/repository, capability hash, raw-card rejection.
- [x] 6.2A.5 GREEN/REFACTOR: checkout contracts/service/repository.
- [x] 6.2B.1 RED: rail/flag/redaction and monotonic state.
- [x] 6.2B.2 GREEN/REFACTOR: payment contracts/config/state machine.
- [x] 6.2B.3 RED: UUID/CAS replay, crash/timeout, reservation effects.
- [x] 6.2B.4 GREEN/REFACTOR: Mercado Pago gateway/service.
- [x] Bridge.1 RED: add `order-repository.test.ts` and `webhook.test.ts` for composite receipt uniqueness, concurrent claim, stale lease/retry, bounded `(nextReconcileAt,id)` selection, atomic evidence/receipt/reservation changes.
- [x] Bridge.2 GREEN: extend `prisma/schema.prisma` and create `prisma/migrations/20260805_checkout_reconciliation_foundation/migration.sql` for durable order/attempt evidence, `WebhookReceipt` composite identity/state/lease/counter; no pruning.
- [x] Bridge.3 GREEN: extend `src/lib/checkout/order-repository.ts` transactional order/attempt reads/updates, receipt claim/complete, reservation consume/release, bounded candidate leases.
- [x] Bridge.4 RED/GREEN: extend `src/lib/payments/{contracts,mercado-pago-orders-gateway,service}.ts` with server-only `getOrder`; test outside-transaction lookup plus invalid, missing, and external-reference-mismatched evidence remains pending.
- [x] 6.2C.1 RED/GREEN: `checkout-routes.test.ts`; implement config, create, and status routes under `src/app/api/checkout/**`.
- [x] 6.2C.2 RED/GREEN: test/implement payment submit at `src/app/api/checkout/orders/[orderId]/payment/route.ts`.
- [x] 6.2C.3 RED/GREEN: test/implement signed HMAC receipt ACK/dedupe in `src/lib/payments/webhook.ts` and `src/app/api/webhooks/mercado-pago/route.ts`.
- [x] 6.2C.4 RED/GREEN: test/implement bounded reconciliation at `src/app/api/internal/payments/reconcile/route.ts`; lookup is outside the transaction.
- [x] 6.2D.1 RED/GREEN: `mercado-pago-card-form.test.tsx` and `mercado-pago-card-form.tsx` token/no-network/PAN-CVV boundary.
- [x] 6.2D.2 RED/GREEN: 3DS URL/origin/message/close/expiry in CardForm and `src/app/checkout/page.tsx`.
- [x] 6.2D.3 Verify checkout tests, typecheck, lint, sandbox/production, and dispatch-disable evidence.

## Exclusions and routing
6.2D remains excluded from Bridge/6.2C. Apply Bridge first, then 6.2C; after dispatched/pending attempts retain migration, receipts, lookup, and reconciliation until terminal.

## 6.2D.3 Verification Status

- [x] 6.2D.3 completed: the lone invalid UTF-8 byte in `src/lib/checkout/guest-order-service.ts` was repaired without decoded-text changes; `pnpm.cmd test` passed (8 files, 51 tests), `pnpm.cmd typecheck` and `pnpm.cmd lint` passed, and `node_modules\.bin\next.cmd build --webpack` passed.
- Sandbox and production credentials remain absent or empty; no provider credentials were retrieved or loaded, and no live Mercado Pago sandbox or production charge/3DS dispatch was attempted.
- Retained dispatch-disable runtime evidence: the local app returned `GET /api/checkout/config` = `200 {"enabled":false}` and `POST /api/internal/payments/reconcile` = `503 {"code":"RECONCILIATION_UNAVAILABLE"}`.
