# Design: Supabase Admin Authentication and Catalog Operations

## Technical Approach

Supabase Auth supplies invite-only identity; every protected request performs a fresh Prisma lookup for active membership. A request-scoped `@supabase/ssr` adapter owns cookies; authorization, CSRF, commerce, and audits remain server-only. Public catalog, status capabilities, guest checkout, and reconciliation never enter this chain.

```text
invite/magic link -> /auth/confirm -> Supabase cookie
request -> session verification -> AdminMembership -> CSRF (unsafe methods)
        -> existing payment service | admin catalog service -> AdminAuditEvent
```

## Architecture Decisions

| Area | Decision | Tradeoff / rationale |
|---|---|---|
| Identity | Provision users externally with Supabase invitations; `/auth/sign-in` sends OTP links with `shouldCreateUser:false`; `/auth/confirm` accepts only `invite|magiclink` token hashes and calls `verifyOtp`. | No secret/service-role key enters the app. Redirects are fixed to `/admin`, not user-controlled. |
| Cookies | `src/lib/auth/supabase-server.ts` creates one client per request from a cookie adapter. `src/proxy.ts` refreshes `/admin` and `/auth`; page/API authorization still uses `auth.getUser()`. | Isolates beta SSR APIs. `getSession()` and metadata never authorize. Auth responses are `private, no-store`. |
| Authorization | `AdminMembership.supabaseUserId` is immutable. `requireAdmin()` returns `401 SESSION_REQUIRED`, `403 ACCESS_DENIED`, or `503 AUTH_UNAVAILABLE`; no cache. | One indexed query per sensitive request gives immediate revocation and fails closed. |
| Integrity | Unsafe requests require exact `Origin === APP_ORIGIN`, non-cross-site `Sec-Fetch-Site`, and constant-time equality between an `HttpOnly`, `Secure`, `SameSite=Strict` CSRF cookie and the shell token sent as `X-CSRF-Token`. | Reject missing/malformed evidence before DB/provider work. |
| Audit | Append immutable attempt/outcome events. Catalog mutation plus success audit is one transaction; reads query plus audit transactionally. Order actions append `ATTEMPTED` before domain/provider evaluation and a bounded terminal event afterward; terminal audit failure prevents a success response. | Provider effects cannot be atomic with PostgreSQL; the pre-event preserves crash traceability. Context stores field names/correlation codes, never secrets or payloads. |
| Catalog | New admin services reuse the existing Product aggregate and Prisma models; public repositories/routes remain unchanged. Archive sets `status=ARCHIVED,isActive=false`, never deletes. | Prevents an admin DTO from weakening storefront rules or exposing mutation through public APIs. |

## Persistence and Contracts

Add `AdminMembership(id UUID, supabaseUserId UUID UNIQUE, isActive, createdAt, updatedAt, revokedAt)` and `AdminAuditEvent(id UUID, membershipId UUID, actorSupabaseUserId UUID, action TEXT, entityType TEXT, entityId TEXT, outcome TEXT, context JSONB, createdAt)`, indexed by `(actorSupabaseUserId,createdAt)` and `(entityType,entityId,createdAt)`. The migration enables RLS with no Data API policies, revokes `anon/authenticated` grants, and installs a trigger rejecting audit `UPDATE/DELETE`.

Admin catalog contracts are bounded: `GET /api/internal/catalog/products?page&limit<=50`; `POST /api/internal/catalog/products`; `PATCH /api/internal/catalog/products/[productId]`; `POST .../[productId]/archive`. Create/update accepts name, slug, description, active category/brand IDs, positive integer ARS price, optional compare-at greater than price, featured/status, variants, and images. It requires at least one image, exactly one primary image, unique positions/SKUs, nonnegative integer stock, valid variant image references, and existing publication/archive rules. Invalid aggregates return `400`; conflicts `409`; missing `404`; auth/integrity retain `401/403/503`.

Cancel/refund route paths and `executePostPaymentOperation` remain unchanged; only their human auth prelude and audit dependency change. `src/lib/admin/temporary-admin-auth.ts` retains only `authorizeReconciliationRequest`.

## File Changes

| Area | Paths |
|---|---|
| Auth/UI | Modify WIP `src/lib/auth/{supabase-server,admin-authorization}.ts`; create `admin-membership-repository.ts`, `request-integrity.ts`, `src/proxy.ts`, `src/app/auth/sign-in/page.tsx`, `src/app/auth/confirm/route.ts`, `src/app/auth/sign-out/route.ts`, and `src/app/admin/{layout,page}.tsx`. |
| Persistence | Modify `prisma/schema.prisma`; create the next Prisma migration and `src/lib/admin/audit-repository.ts`. |
| Catalog | Create `src/lib/catalog/{admin-contracts,admin-product-service,prisma-admin-repository}.ts` and `src/app/api/internal/catalog/products/**/route.ts`. |
| Orders/docs/tests | Modify cancel/refund routes and tests, temporary auth, `.env.example`, and `docs/operations/admin-auth.md`; add focused auth, CSRF, membership, audit, catalog, admin-shell, and regression tests. |

## Testing Strategy

RED tests cover invite/token type and fixed redirects; cookie refresh; 401/403/503 and next-request revocation; origin, Fetch Metadata, and CSRF rejection before collaborators; append-only bounded audits and audit failure; catalog validation/rollback/archive visibility; unchanged order rules, scheduler secret, public reads, status capability, and guest checkout. Run focused Vitest, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

## Threat Matrix

| Boundary | Applicability |
|---|---|
| Documentation-like paths | N/A: no executable-file classification. |
| Git repository selection | N/A: no Git invocation. |
| Commit state | N/A: no index/worktree automation. |
| Push state | N/A: no push automation. |
| PR commands | N/A: no PR command composition. |

## Migration / Rollout / Rollback

1. Deploy additive tables, RLS/grant hardening, trigger, and code while the temporary human token still works.
2. Invite the first operator externally; insert membership by immutable Supabase UUID using the documented operator SQL/runbook; verify sign-in, refresh, `/admin`, audit, and revocation in staging.
3. Bootstrap production membership, verify a second operator, then switch cancel/refund to session auth and enable catalog routes. Remove `POST_PAYMENT_ADMIN_TOKEN` only after smoke tests; keep `RECONCILIATION_CRON_SECRET` unchanged.
4. Roll back by disabling catalog routes and restoring token auth for cancel/refund; retain additive membership/audit records and trigger. Public/guest/scheduler paths require no rollback.

Official guidance checked: Supabase SSR clients/cookie refresh, server verification, token-hash email confirmation, local sign-out, and 2026 Data API exposure changes. Open questions: none.
