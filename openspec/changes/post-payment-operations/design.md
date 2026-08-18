# Design: Protected Post-Payment Operations

## Technical Approach

Add two thin Node.js App Router handlers that authenticate before constructing the existing Prisma repository and Mercado Pago gateway, then call `executePostPaymentOperation`. Fix the existing stock transition defect by making one repository-level transactional helper authoritative for both direct operations and webhooks: cancellation releases `ACTIVE` reservations; refund replenishes `CONSUMED` reservations. `StockReservation` is the source because it already preserves immutable `variantId` and `quantity` after payment; `OrderLine.variantId` is nullable and is less precise for inventory.

## Architecture Decisions

| Decision | Choice and rationale | Rejected tradeoff |
|---|---|---|
| Administrative boundary | `POST /api/internal/orders/[orderId]/cancel` and `/refund`; no body. Validate `Authorization: Bearer <POST_PAYMENT_ADMIN_TOKEN>` before DB/config/gateway work. Compare SHA-256 digests with `timingSafeEqual`; never expose/log token. Missing header = `401`, mismatch = `403`, missing server configuration = `503`. | Query/body tokens leak through URLs, traces, or payload logging. |
| Layering | Handler owns auth and HTTP mapping; `post-payment.ts` owns eligibility/idempotent orchestration; `order-repository.ts` owns transactions; Mercado Pago gateway owns HTTP/provider validation. | Provider or Prisma logic in routes duplicates existing boundaries. |
| Ledger | Keep unique `(orderId,type)` and states `RUNNING -> COMPLETED`. Check `COMPLETED` before lifecycle rejection. After create conflict, re-read the winning row and use its persisted key; all retries send that key. Complete ledger, order, reservation, and stock in one serializable transaction. | A new random key after a uniqueness race breaks provider idempotency; extra failure states add no safe provider knowledge. |
| Refund stock | For `REFUND`, read `CONSUMED` reservations, conditionally claim those IDs as `RELEASED`, require the full expected count, then increment each variant by its stored quantity in the same transaction. For `CANCEL`, use `ACTIVE -> RELEASED`. Centralize this transition for direct actions and verified webhooks; retry serialization conflicts. | Current `ACTIVE`-only logic cannot restock a `PAID` order because payment changes reservations to `CONSUMED`. |
| Terminal authority | `CANCELLED`/`REFUNDED` remain terminal. Require an expected normalized provider action status (`cancelled|canceled` or `refunded`) before committing. Direct success and verified webhook evidence call the same transaction; duplicate/late receipts only become processed. Failures/invalid statuses remain `RUNNING` and map to `502`. | Letting later payment webhooks reapply ordinary payment transitions can reverse state or double-stock. |
| Future auth | Isolate token parsing in `src/lib/admin/temporary-admin-auth.ts`; later Supabase Auth/RBAC replaces this adapter and route call site only. | Embedding token checks in the service couples domain operations to provisional identity. |

## Data Flow

```text
Admin caller -> route/auth -> post-payment service -> ledger repository -> Mercado Pago
                                      |                    |
                                      +-- persisted key <--+
Provider result/webhook -> shared serializable terminal transaction
                         -> reservation transition + stock + order + ledger/receipt
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app/api/internal/orders/[orderId]/{cancel,refund}/route.ts` | Create | Authorized handlers and stable error mapping. |
| `src/lib/admin/temporary-admin-auth.ts` | Create | Server-only Bearer-token adapter. |
| `src/lib/payments/post-payment.ts` | Modify | Winner re-read, completed-first check, typed errors. |
| `src/lib/checkout/order-repository.ts` | Modify | Shared `ACTIVE`/`CONSUMED` release transaction for operations/webhooks. |
| Route, post-payment, repository, webhook tests | Modify/Create | Authorization, races, consumed refund, duplicates. |
| `.env.example`, `docs/operations/post-payment.md` | Modify/Create | Setup, rotation, rollback, limits, Supabase replacement. |

## Interfaces / Contracts

Success returns `200 { operation, status: "completed", provider: { id, status, updatedAt? } }`. Errors: `401 ADMIN_AUTH_REQUIRED`, `403 ADMIN_AUTH_INVALID`, `404 ORDER_NOT_FOUND`, `409 POST_PAYMENT_OPERATION_ALREADY_COMPLETED`, `422 ORDER_NOT_CANCELLABLE|ORDER_NOT_REFUNDABLE|PROVIDER_ORDER_ID_MISSING`, `502 POST_PAYMENT_PROVIDER_FAILED`, `503 POST_PAYMENT_UNAVAILABLE`. Responses contain no credentials or raw provider body.

## Testing Strategy

| Layer | Coverage |
|---|---|
| Unit | Constant-time auth outcomes; completed-first and create-race persisted-key reuse. |
| Integration | `PAID + CONSUMED -> REFUNDED + RELEASED + exact stock`; cancel `ACTIVE`; concurrent action/webhook; rollback and duplicate retry. |
| Route | Auth executes before collaborators; exact HTTP contracts and redaction. |

## Threat Matrix

This change adds HTTP routing, but none of the matrix's execution/VCS boundaries apply: documentation-like executable classification, Git repository selection, commit state, push state, and PR commands are all **N/A** because handlers neither classify files nor invoke shell, Git, subprocess, or PR operations.

## Migration / Rollout

Apply `pnpm exec prisma migrate deploy`, then `pnpm exec prisma generate` (stop the dev server first if Windows locks the Prisma DLL). Deploy token and routes only after both succeed. Rotation replaces the server variable and restarts instances; removal disables access. The operator guide is explicitly provisional until `supabase-admin-auth` supplies sessions and RBAC.

## Open Questions

- [ ] Confirm the production secret manager and rotation owner before enabling the routes.
- [ ] Confirm whether internal callers require network allow-listing in addition to the temporary token.
