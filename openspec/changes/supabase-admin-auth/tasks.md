# Tasks: Supabase Admin Authentication and Catalog Operations

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 850–1,150 authored lines (schema, auth, routes, UI, tests, runbook) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → persistence/auth; PR 2 → order actions/catalog API; PR 3 → admin UI, rollout, regression coverage |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Membership, audit persistence, Supabase session/CSRF authorization | PR 1 | `pnpm exec vitest run src/lib/auth src/lib/admin` | Staging invite → callback → revoke → next request | Revert auth/persistence files; retain additive tables |
| 2 | Session-protected cancel/refund and bounded catalog API | PR 2 | `pnpm exec vitest run src/app/api/internal` | Authenticated same-origin catalog CRUD and refund smoke flow | Disable internal catalog routes; restore token prelude |
| 3 | Admin shell, operator runbook, and public/guest regression | PR 3 | `pnpm lint && pnpm exec tsc --noEmit` | Browser `/auth/*` → `/admin`; anonymous storefront/checkout | Revert UI/docs and route wiring only |

## Phase 1: RED Tests and Persistence Foundation

- [x] 1.1 RED: add auth tests for invite-only `invite|magiclink`, fixed `/admin` redirect, missing/revoked/unavailable `401/403/503`, fresh-request revocation, and metadata/stale-claim rejection in `src/lib/auth/*.test.ts`.
- [x] 1.2 RED: add request-integrity tests proving exact `Origin`, non-cross-site `Sec-Fetch-Site`, CSRF cookie/header constant-time match, and rejection before provider/DB collaborators.
- [x] 1.3 RED: add Prisma migration/schema tests for `AdminMembership`, `AdminAuditEvent`, indexes, RLS/no Data API grants, and UPDATE/DELETE rejection trigger; modify `prisma/schema.prisma` and create the next migration.
- [x] 1.4 GREEN: implement `src/lib/auth/supabase-server.ts`, `admin-membership-repository.ts`, `admin-authorization.ts`, `request-integrity.ts`, and `src/lib/admin/audit-repository.ts` with fail-closed, append-only bounded context.

## Phase 2: Protected Operations and Catalog Core

- [x] 2.1 RED: cover denied/valid cancel-refund, attempted/terminal audits, audit-failure no-success, bearer-token rejection, and unchanged `RECONCILIATION_CRON_SECRET` in existing order route tests.
- [x] 2.2 GREEN: modify cancel/refund routes and `temporary-admin-auth.ts`; preserve `executePostPaymentOperation` and scheduler authentication boundaries.
- [x] 2.3 RED: cover catalog auth, required fields, ARS price/compare-at, image/variant/SKU/position/stock aggregate rules, 400/404/409 responses, transactional rollback, audit failure, archive visibility, and public mutation isolation.
- [x] 2.4 GREEN: create `src/lib/catalog/{admin-contracts,admin-product-service,prisma-admin-repository}.ts` and internal products list/create/update/archive routes.

## Phase 3: Integration, UI, and Verification

- [x] 3.1 RED: add auth callback/sign-out, cookie refresh, `/admin` unauthenticated/forbidden/unavailable shell, and anonymous public catalog/order-status/guest-checkout regression tests.
- [x] 3.2 GREEN: create `src/proxy.ts`, `src/app/auth/{sign-in/page.tsx,confirm/route.ts,sign-out/route.ts}`, and `src/app/admin/{layout,page}.tsx`; update `.env.example`.
- [x] 3.3 Document external invite/bootstrap SQL, rollout/cutover/rollback, and scheduler separation in `docs/operations/admin-auth.md`; run `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build`.


