# Proposal: Catalog Products Through Card Payment

## Intent

Deliver Slices 1-6.2 of the football storefront: catalog, persistence, public reads, catalog/detail UI, session-only cart, server-authoritative guest orders, and in-storefront card payment through Mercado Pago.

## Scope

### In Scope

- Existing catalog domain rules, persistence, seed data, public reads, catalog/detail UI, and local cart.
- Existing guest contact/shipping capture and server-authoritative totals and stock validation.
- Mercado Pago Checkout API through Orders API, without storefront redirects.
- Credit and supported debit card rails available for the application's Mercado Pago site.
- MercadoPago.js secure fields/tokenization; PAN and CVV never reach or persist on the application server.
- Automatic processing, immediate capture, and deterministic idempotency.
- Pending and ambiguous outcome handling through Mercado Pago `order` webhooks and provider lookup; browser responses never establish paid state.

### Out of Scope

- Pix, boleto, account balance, other payment rails, Checkout Pro, and redirect checkout.
- Manual or staged processing, authorization-only flows, and later capture.
- Persistent carts, authentication, accounts, admin tools, uploads, and promotions.
- Provider credential retrieval or storage in artifacts; secrets remain server-only.

## Capabilities

### New Capabilities

- `catalog-products-domain`: Catalog domain rules.
- `products-public-api`: Public catalog reads.
- `catalog-ui`: Catalog browsing.
- `product-detail-ui`: Details and variants.
- `cart`: Session-only, stock-bounded cart.
- `checkout`: Guest details and authoritative orders.
- `checkout-payments`: Secure card tokenization, Orders API submission, idempotency, payment-state mapping, webhook reconciliation, and provider lookup.

### Modified Capabilities

- None; all capabilities belong to this active change.

## Approach

Preserve Slices 1-6.1 and add Slice 6.2 separately. MercadoPago.js collects card data. The server revalidates the order, submits an idempotent automatic payment, records non-final outcomes, and reconciles state from provider notifications and lookups.

## Affected Areas

| Area | Impact |
|---|---|
| Existing catalog, cart, and checkout paths | Preserve prior behavior |
| Checkout UI and server payment boundary | Add secure card payment and status presentation |
| Webhook/reconciliation boundary | Add provider-authoritative state updates |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Duplicate charges | Medium | Deterministic idempotency and retry-safe state transitions |
| Ambiguous provider outcomes | Medium | Pending state, webhooks, and provider lookup |
| Card-data or secret exposure | Low | MercadoPago.js fields and server-only secrets |
| Stock or total drift | Medium | Revalidate from trusted server data before payment |

## Rollback Plan

Disable the payment entry point and provider calls, retain Slice 6.1 pending-order behavior, and continue reconciling already-submitted orders until terminal.

## Dependencies

- Existing Mercado Pago Developers application `ecomerce-futbol` and approved server-side configuration.
- MercadoPago.js, Orders API access, supported site cards, and a reachable webhook endpoint.

## Success Criteria

- [ ] A guest can complete a supported card payment without leaving the storefront.
- [ ] Server totals and stock are revalidated for every payment attempt.
- [ ] Repeating the same checkout intent cannot create a second charge.
- [ ] PAN, CVV, and secrets are absent from application-server storage and logs.
- [ ] Pending/ambiguous outcomes reconcile from provider evidence, not browser claims.
