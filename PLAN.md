# Delivery Plan

OpenSpec is authoritative for the detailed requirements, design, task ledger,
and implementation evidence for `catalog-products`.

## Current Checkpoint

| Area | Status |
| --- | --- |
| Catalog Slice 1 - mock UI | Complete |
| Catalog Slice 2 - persistence foundation and seed | Complete |
| Catalog Slice 3 - public read API | Complete; latest commit `62bc8ec` |
| Catalog Slice 4 - API-backed UI | In progress; 4A complete, next 4B catalog/detail |
| Cart, checkout, payments, auth, admin | Pending |

Native SDD status is **26/36 complete, 10 pending, with no blockers**. Home
featured products use the public API; catalog and detail still use local mock
data. No automated test runner is configured.

## Delivery Sequence

1. **Storefront UX** - complete.
2. **Catalog persistence** - complete.
3. **Public catalog API** - complete through Work Unit 3E.
4. **API-backed UI** - complete Work Unit 4B for catalog listing and product
   detail, preserving existing contracts and running focused scenarios. Next.
5. **Cart** - only after Slice 4.
6. **Checkout and payments** - allow guest checkout before optional identity.
7. **Authentication** - add Supabase Auth for optional customers and required
   admin identity, without moving commercial data from Prisma + PostgreSQL.
8. **Administration** - add product management after authorization is enforced.

## Guardrails

- Public catalog APIs remain read-only.
- Do not add cart, checkout, payment, or admin behavior before their slices.
- Authentication must not block checkout.
- A valid Supabase session proves identity, not admin authorization.
