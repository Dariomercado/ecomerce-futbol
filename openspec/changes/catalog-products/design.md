# Design: Durable Mercado Pago Card Checkout

## Technical Approach

Slices 1-6.1 remain unchanged. Slice 6.2 uses MercadoPago.js tokenization, server-authoritative validation, durable PostgreSQL state, an internal Orders adapter, authenticated webhooks, and bounded provider reconciliation. Work Unit 6.2C adds only the durable API/recovery foundation; 6.2D CardForm, 3DS, and checkout UI remain out of scope.

## Decisions and Authority

| Area | Decision |
|---|---|
| Existing guarantees | Preserve 6.2A/6.2B authoritative totals and stock, `(orderId,intentId)` fingerprint/unique-create/`CREATED -> DISPATCHING` CAS, exact idempotent replay, recursive raw-card rejection/redaction, immutable attempt history, and monotonic provider evidence. Browser evidence never marks an order paid. |
| Provider boundary | `MercadoPagoOrdersGateway` is our server-owned outbound adapter. Add `getOrder(providerOrderId)` using authenticated `GET /v1/orders/{id}`; never expose it to the browser. Paid still requires both order and corresponding payment `processed/accredited`. |
| Source of truth | PostgreSQL through Prisma is authoritative for orders, attempts, provider evidence, reservation transitions, webhook receipts, and reconciliation leases/counters. Memory, `localStorage`, and caches cannot drive transitions. A short-lived read-through cache may serve an already-authorized status projection only; invalidate it after commits and bypass it for submit, webhook, and reconciliation. |

Extend `PaymentAttempt` with provider order/payment IDs, order/payment status and detail, provider update time, reconciliation count/next-at/error, and a unique nullable provider-order ID. Provider timestamps continue to enforce newer-only transitions; equal-time conflicts force lookup and alert.

## Durable Webhook Receipt

Add `WebhookReceipt` with provider, application ID, topic, provider notification ID, resource ID, action, live mode, provider-created time, request ID, signature timestamp/version, exact-raw-body SHA-256, state (`RECEIVED|PROCESSING|PROCESSED|RETRYABLE_FAILED`), lease/attempt/error fields, and received/processed timestamps. Unique `(provider,applicationId,topic,notificationId)` is the dedupe identity: Mercado Pago documents body `id` as notification ID and `data.id` as the order resource ID. This supersedes request-ID/timestamp hashing. Payment webhook receipts are unrelated to Gentle AI review receipts.

Verify `x-signature` over lowercase query `data.id`, `x-request-id`, and `ts` before persistence; require query/body resource identity. Never persist the secret, full signature, raw body, card token, PAN, or CVV. Persist only the validated minimal envelope, validation metadata, and raw-body hash. 6.2C implements no receipt pruning or deletion: retain composite identity and state for the associated order/payment retention lifecycle. Future policy-driven cleanup is explicitly out of scope.

## Repository and Transaction Boundaries

`OrderRepository` adds operations to create/read an order by hashed capability; create/find/claim/read/update attempts; insert/read/lease/complete receipts; atomically apply evidence and consume/release reservations; and select a configured-limit page of due pending attempts with stable `(nextReconcileAt,id)` ordering plus skip-locked/lease semantics. Order creation must call `reserveOrder`; no route returns an unpersisted order.

After verified receipt insertion/lease, call `getOrder` outside the database transaction. One Serializable transaction then re-reads the attempt, applies existing monotonic rules, updates order/attempt and reservation exactly once, and marks the receipt `PROCESSED`. Crashes leave resumable `RECEIVED` or expired `PROCESSING` state. Processed/no-op duplicates return 200; malformed input returns 400; invalid signature returns 401; transient lookup/transaction failure records `RETRYABLE_FAILED` and returns 503. Receipt alone is not acknowledged. Mercado Pago documents 200/201 acknowledgement, a 22-second wait, and retries every 15 minutes with a longer interval after the third attempt.

`getOrder` maps only documented order/payment ID, status, status-detail, and update fields required by `ProviderOrderEvidence`; accept authority only when `external_reference` matches the local order. Timeout, 429, 5xx, malformed/missing evidence, reference mismatch, and unresolved 404 remain pending; bounded retries schedule backoff and alert on exhaustion. Treat 401/403 as configuration alerts. Assume no undocumented ordering, delivery, retry-header, or terminal-state guarantee.

## Files, Tests, and Delivery

Modify `prisma/schema.prisma`, `src/lib/checkout/order-repository.ts`, `src/lib/payments/{contracts,mercado-pago-orders-gateway,service}.ts`, and `src/app/api/checkout/orders/route.ts`. Create `prisma/migrations/20260805_checkout_reconciliation_foundation/migration.sql`, `src/lib/payments/webhook.ts`, the planned config/status/payment/webhook/reconcile route files, and focused checkout-route/webhook tests.

RED tests cover durable creation/retrieval, composite dedupe, concurrent/stale leases, crash recovery, ACK matrix, signature and identity mismatch, lookup error classes, external-reference mismatch, monotonic/out-of-order evidence, atomic consume/release, cache bypass, bounded selection/exhaustion, persistence privacy, and raw-card/log safety. Threat-matrix documentation-path, Git, commit, push, and PR-command rows are N/A: HTTP routes add no executable classification, shell/process, VCS, or PR automation.

Ship as isolated chained Work Unit/PR 6.2C after 6.2B; migrate before enabling routes. Before any provider dispatch, rollback may revert the 6.2C delta. After any dispatched or pending attempt, disable new ingress/dispatch but retain the migration, receipt/dedupe data, provider lookup, and reconciliation subset until every affected attempt is terminal; only then may that retained subset be removed.

Provider evidence: Mercado Pago MCP `search_documentation`, official [Orders webhooks](https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/additional-content/your-integrations/notifications/webhooks), and [Get order by ID](https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/get-order/get). Open questions: none.
