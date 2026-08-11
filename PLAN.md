# Delivery Plan

OpenSpec is authoritative for the detailed requirements, design, task ledger,
and implementation evidence for `catalog-products`.

## Current Checkpoint

| Area | Status |
| --- | --- |
| Catalog Slice 1 - mock UI | Complete |
| Catalog Slice 2 - persistence foundation and seed | Complete |
| Catalog Slice 3 - public read API | Complete; latest commit `62bc8ec` |
| Catalog Slice 4 - API-backed UI | Complete; home, catalog, and detail use public catalog data |
| Cart and guest checkout foundation | Complete |
| Payment foundation and 6.2A | Complete |
| 6.2B payment core | Complete; Mercado Pago gateway, state machine, idempotency, and replay handling |
| Bridge | Complete; durable receipts, reconciliation persistence, leases, and provider lookup |
| 6.2C HTTP/webhook/reconciliation | Pending |
| 6.2D CardForm/3DS/final UI | Pending; after 6.2C |
| Authentication and administration | Later |

Native SDD status is **13/20 complete, 7 pending, with apply as the next
global-change phase**. The seven pending tasks are 6.2C.1-6.2C.4 and
6.2D.1-6.2D.3; they do not represent incomplete 6.2B work. RDD approved the
6.2B snapshot in commit `18100af` with receipt
`sha256:f3e64bea8a2ae06fe8b01f952ee528258ecf5e22b80fdcb402865b97c7da8173`.
No automated test runner is configured by the project SDD config.

## Delivery Sequence

1. **Storefront UX** - complete.
2. **Catalog persistence** - complete.
3. **Public catalog API** - complete through Work Unit 3E.
4. **API-backed UI** - complete through Work Unit 4B with focused scenarios.
5. **Cart and guest checkout** - complete.
6. **Payment foundation and core** - complete through 6.2B and Bridge.
7. **6.2C payment operations** - add HTTP payment routes, Mercado Pago webhook
   ACK/dedupe, and bounded reconciliation.
8. **6.2D payment UI** - add CardForm/tokenization boundaries, 3DS, and final
   checkout UI verification after 6.2C.
9. **Authentication** - add Supabase Auth for optional customers and required
   admin identity, without moving commercial data from Prisma + PostgreSQL.
10. **Administration** - add product management after authorization is enforced.

## Guardrails

- Public catalog APIs remain read-only.
- Do not add 6.2C routes or 6.2D UI behavior before their separately authorized
  slices.
- Authentication must not block checkout.
- A valid Supabase session proves identity, not admin authorization.
