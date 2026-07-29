# Design: Catalog Products Through Local Cart

## Technical Approach

The delivered architecture progresses from the original typed-fixture UI slice to PostgreSQL-backed public catalog reads and a client-only cart. Server-rendered catalog routes consume stable public API contracts; a root cart provider owns ephemeral line state for the current page session. Checkout, payments, authentication, and cart persistence remain separate future boundaries.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Catalog source | Prisma/PostgreSQL behind `src/app/api/catalog/*` and `src/lib/catalog/prisma-public-repository.ts` | Keeps visibility/filter rules server-side while exposing Prisma-independent DTOs. |
| UI integration | `/catalogo` and `/productos/[slug]` consume public catalog contracts | Preserves the Slice 1 component/route contract while replacing mock reads. |
| Cart ownership | `CartProvider` in `src/lib/cart/cart-provider.tsx`, mounted by `src/app/layout.tsx` | Shares cart state between product detail, header, and `/carrito` without introducing a backend. |
| Line identity | Deterministic `productId:variantId`; variantless products use `productId:product` | Equivalent selections consolidate; different variants remain separate lines. |
| Quantity semantics | Add/increment changes quantity by one, decrement changes it by one, and `Remove` deletes the complete line | Provides predictable controls and an explicit full-line removal action. |
| Stock bound | Store the selected variant's available stock on the cart selection and reject/cap additions or increments beyond it | Implemented in cart-state transitions and provider delegation; the CTA passes selected stock and the cart disables increment at the known bound. |
| Deferred boundaries | No local storage, cookies, database cart, checkout, orders, payment, or auth coupling | Keeps Phase 5 session-only and prevents premature commercial-state design. |

## Data Flow

```text
PostgreSQL -> public catalog repository -> /api/catalog/*
    -> /catalogo and /productos/[slug]
    -> variant selection -> addItem(product + variant + stock)
    -> CartProvider -> Header count + /carrito lines and totals
```

Product detail MUST require a variant selection when active variants exist and MUST reject an out-of-stock selection. `addItem` derives line identity from product plus variant. An equivalent add increments the existing line only when the stock bound allows it. `setQuantity` applies the same bound; a quantity below one removes the line. `removeItem` always removes the full matching line.

`itemCount` is the sum of line quantities. `total` is the sum of unit price multiplied by quantity. Both are derived from provider state rather than stored separately. Empty provider state renders the cart empty state and catalog return path.

## Concrete File Boundaries

| Path | Responsibility |
|---|---|
| `src/lib/catalog/public-contracts.ts` | Public product and active-variant DTOs |
| `src/app/api/catalog/*` | Read-only catalog HTTP routes |
| `src/components/catalog/product-detail-api-content.tsx` | Selected-variant state |
| `src/components/catalog/mock-cart-cta.tsx` | Validated add intent (legacy filename) |
| `src/lib/cart/types.ts` | Cart selection and line contracts, including stock bound |
| `src/lib/cart/cart-provider.tsx` | Local line mutations and derived totals/count |
| `src/components/cart/cart-content.tsx` | Empty state, lines, quantity controls, removal, totals |
| `src/components/layout/header.tsx` | Cart route link and derived item count |

## Testing Strategy

Runtime tests SHOULD mount the provider with product-detail, header, and cart consumers. Scenarios MUST cover: required variant selection; variantless add; equivalent-line consolidation; distinct variants; increment/decrement; decrement from one; full-line removal; totals; header count; empty state; out-of-stock rejection; and attempts to exceed selected-variant stock. Reload behavior SHOULD confirm that cart state is not persisted. Checkout and payment affordances MUST remain absent or explicitly deferred.

Static validation remains lint, TypeScript, and production build. These checks do not replace runtime assertions for state transitions.

## Threat Matrix

N/A — this design adds no shell, subprocess, VCS/PR automation, executable classification, or process-integration boundary.

## Migration / Rollout

No data migration is required for cart state. Phase 5 stock-bound behavior is verified by the external runtime matrix: zero-stock selection is disabled, equivalent selections consolidate at quantity two, known-stock increments cap at three, and reload resets session state. Future checkout work must consume a separately validated server-side cart/order boundary rather than assuming client totals are authoritative.

## Open Questions

None blocking for the stock-bound correction.
