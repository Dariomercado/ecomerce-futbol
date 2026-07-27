# Delivery Plan

This file provides the high-level delivery sequence. For `catalog-products`,
OpenSpec is authoritative: use `openspec/changes/catalog-products/` for the
detailed requirements, design, task ledger, and implementation evidence.

## Current Checkpoint

| Area | Status |
| --- | --- |
| Catalog Slice 1 — mock UI | Complete |
| Catalog Slice 2 — persistence foundation and seed | Complete |
| Catalog Slice 3 — public read API (3B–3E) | Complete; latest commit `62bc8ec` |
| Catalog Slice 4 — API-backed UI | Next; begin with Work Unit 4A — Home API-backed |
| Cart, checkout, payments, auth, admin | Pending |

Native SDD status is **25/36 complete, 11 pending, with no blockers**. The
catalog UI continues to use local mock data until Slice 4 begins. No automated
test runner is configured.

## Delivery Sequence

1. **Storefront UX** — catalog browsing, product detail, navigation, and mock
   data. Complete.
2. **Catalog persistence** — Prisma schema, local database, migration, and
   repeatable seed. Complete.
3. **Public catalog API** — repository-backed read-only catalog endpoints.
   Complete through Work Unit 3E.
4. **API-backed UI** — complete Work Unit 4A for home featured products, then
   Work Unit 4B for catalog listing and product detail. Preserve established UI
   contracts and run focused scenario verification. Next.
5. **Cart** — add product and variant selection state only after Slice 4.
6. **Checkout and payments** — allow guest checkout and add Mercado Pago only
   after the cart flow is validated. Customer identity is optional on an order.
7. **Authentication** — add Supabase Auth for optional customer accounts and
   required admin identity. Keep catalog, cart, and order data in Prisma +
   PostgreSQL.
8. **Administration** — add product management separately from public reads
   after authenticated authorization is enforced.

## Guardrails

- Public catalog APIs remain read-only.
- Do not add cart, checkout, payment, or admin behavior before their planned
  slices.
- Authentication must not block checkout.
- A valid Supabase session proves identity, not admin authorization.
- Keep detailed implementation status in OpenSpec, not duplicated here.
