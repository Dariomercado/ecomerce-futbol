# Design: Catalog Products Through Guest Checkout

## Technical Approach

Slices 1-5 retain the typed catalog UI, Prisma/PostgreSQL public catalog reads, API-backed catalog/detail routes, and the session-only `CartProvider`. Slice 6.1 adds guest contact and shipping capture plus a server-only local pending-order boundary. The client submits identities and quantities; the server reloads trusted active catalog data and derives all commercial amounts.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Catalog source | Prisma/PostgreSQL behind public catalog routes and DTOs | Keeps publication, active-variant, and visibility rules on the server. |
| Cart ownership | `CartProvider` shares current-session lines between detail, header, and `/carrito` | Preserves Slice 5 line identity, stock limits, derived count, and derived display total without persistence. |
| Guest access | Checkout accepts contact and shipping without authentication; `userId` remains nullable | Supports guests now and leaves a future trusted identity reference optional. |
| Commercial authority | The order service reloads active products and variants, consolidates duplicate lines, validates aggregate stock, and derives unit prices, line totals, and total | Client totals are ignored and malformed or unsafe quantities cannot produce an order. |
| Pending result | Return an in-memory `PENDING_CONFIRMATION` order | Gives the shopper a local confirmation boundary without durable order state or payment side effects. |
| Failure behavior | Invalid or unavailable catalog input uses stable recoverable validation responses; unexpected route failures are sanitized; the page handles fetch and JSON failures | Supports safe retry and correction without exposing internals. |

## Data Flow

```text
Cart lines + guest contact/shipping
  -> /api/checkout/orders
  -> input validation and duplicate aggregation
  -> Prisma reload of active product, variant, and stock
  -> server-derived lines and total
  -> local PENDING_CONFIRMATION response
```

The `/checkout` form submits only product/variant identities and quantities with guest contact and shipping. It may display a client total, but that value is never trusted. The service rejects malformed JSON shapes, empty or invalid lines, unavailable products or variants, missing required variants, aggregate quantity above stock, and unsafe numeric results. It has no auth requirement and returns `userId: null` at this boundary.

## Concrete File Boundaries

| Path | Responsibility |
|---|---|
| `src/app/checkout/page.tsx` | Guest form, cart handoff, pending confirmation, and fetch/JSON recovery message. |
| `src/app/api/checkout/orders/route.ts` | JSON parsing, stable validation mapping, and sanitized unexpected failures. |
| `src/lib/checkout/contracts.ts` | Guest request, validation, and local pending-order contracts. |
| `src/lib/checkout/guest-order-service.ts` | Validation, aggregate stock checks, trusted catalog reload, and safe server arithmetic. |
| `src/components/cart/cart-content.tsx` | Checkout navigation from the local cart summary. |

## Verification

Run direct ESLint, TypeScript no-emit, `git diff --check`, and the focused harness for guest/no-auth checkout, server-authoritative totals, malformed input, aggregate stock, unavailable catalog, sanitized errors, safe arithmetic, and UI recovery.

## Deferred Scope

Payment integration, durable order persistence, authentication integration, and administration are deferred. No migration is required.
