# Exploration: Supabase Admin Authentication

## Current State

The storefront and checkout are public. Guest checkout is an explicit product requirement, and `Order.userId` is already optional. Supabase must therefore add identity without becoming a prerequisite for buying.

Administrative identity is not delivered. The current cancel/refund Route Handlers use a server-only bearer token through `src/lib/admin/temporary-admin-auth.ts`. The `src/lib/auth/` directory is untracked work in progress: it can validate a request-scoped Supabase user and compare the immutable user ID with a server allowlist, but it has no sign-in flow, session refresh boundary, persistent application roles, protected admin page, or route integration.

Prisma/PostgreSQL owns catalog, order, payment, and inventory data. There is no application user or role model. Supabase user metadata must not become an authorization source: `user_metadata` is user-editable, while JWT-carried claims can be stale. Current Supabase guidance also describes `@supabase/ssr` as beta, so its cookie integration needs an isolated adapter and explicit verification during design.

### Current-state map

| Boundary | Current behavior | Gap for this change |
| --- | --- | --- |
| Public storefront and checkout | No authentication required; guest order/status capabilities remain independent | Preserve this behavior unchanged |
| Supabase identity | Server helper exists only as untracked WIP and calls `auth.getUser()` | Add a complete sign-in, callback, cookie refresh, sign-out, and verified-session path |
| Application authorization | Temporary environment allowlist exists in WIP | Add repository-owned, revocable admin membership/role lookup |
| Admin UI | `/admin` is only a deferred sitemap entry | Add the smallest authenticated admin entry and denial states |
| Post-payment admin routes | Bearer token protects cancel/refund routes | Replace the human-operator boundary with session plus application authorization without touching payment orchestration |
| Commercial persistence | Prisma models own all commerce state | Keep Supabase Auth limited to identity; keep business data and permissions in application persistence |

## Affected Areas

- `src/lib/auth/` - isolate Supabase SSR client/session verification and application authorization ports; treat current files as evidence, not an accepted design.
- `src/app/admin/` and auth callback/sign-in routes - provide the minimal human admin entry, redirect, sign-out, and explicit unauthenticated/forbidden/unavailable states.
- `src/app/api/internal/orders/[orderId]/{cancel,refund}/route.ts` - replace temporary human bearer authorization while preserving all existing domain, provider, idempotency, and stock behavior.
- `src/lib/admin/temporary-admin-auth.ts` - retire only the human admin token adapter; retain the separate reconciliation scheduler secret boundary.
- `prisma/schema.prisma` and a future migration - persist application-owned admin membership/role state keyed by verified Supabase user ID.
- `.env.example` and operational documentation - document Supabase URL/publishable key, invitation/bootstrap, revocation, rollout, and rollback without exposing secret or service-role credentials.
- Checkout routes and tests - regression boundary only; prove guest checkout remains session-independent.

## Approaches

1. **Server allowlist as the delivered authorization model** - keep `SUPABASE_ADMIN_USER_IDS` as the source of admin access.
   - Pros: Smallest implementation; no schema change; easy emergency disable.
   - Cons: Deployment-coupled membership changes, weak auditability, no role lifecycle, and contradicts the stated persistent-role goal.
   - Effort: Low

2. **Supabase identity plus Prisma-owned admin membership** - verify the Supabase user server-side, then resolve active admin membership from application persistence.
   - Pros: Clear identity/authorization separation, revocable access, extensible roles, no trust in user-editable metadata, and commerce ownership remains with Prisma.
   - Cons: Requires migration, bootstrap procedure, cache/revocation policy, and fail-closed database behavior.
   - Effort: Medium

3. **JWT/app-metadata roles** - place the admin role in Supabase app metadata and authorize from claims.
   - Pros: Fewer application queries and natural fit for Supabase RLS-heavy systems.
   - Cons: Claim freshness complicates immediate revocation, role ownership moves away from the application, and editable `user_metadata` is unsafe. This project does not need Supabase Data API authorization for commerce data.
   - Effort: Medium

## Recommendation

Use approach 2. The first product boundary should be an **invite-only human operator slice**:

1. An invited operator can sign in through Supabase and establish a cookie-backed server session.
2. The application verifies the user on the server and checks an active Prisma-owned admin membership keyed by the immutable Supabase user ID.
3. `/admin` exposes only a minimal authenticated shell and clear sign-in, forbidden, and unavailable states.
4. Existing cancel/refund Route Handlers accept the authorized operator session instead of the temporary human bearer token, while the reconciliation scheduler continues using its separate server-to-server secret.
5. Unsafe cookie-authenticated operations include an explicit same-origin/CSRF defense, and revocation fails closed.
6. Public browsing, guest checkout, order capabilities, payment orchestration, and commercial persistence remain unchanged.

This boundary proves the complete identity-to-authorization chain against an already valuable administrative capability. Catalog mutation screens and broader RBAC can build on it later without mixing authentication into payment domain services.

### Explicit non-goals

- Customer registration, customer account pages, saved addresses, or mandatory checkout sign-in.
- Moving orders, catalog, payments, stock, or roles into Supabase user metadata.
- Social login, passkeys, MFA, password recovery customization, or broad identity-provider selection.
- Catalog CRUD APIs or a full admin dashboard.
- Customer self-service cancellation/refunds, partial refunds, or payment-domain redesign.
- Replacing `RECONCILIATION_CRON_SECRET`; machine-to-machine scheduling remains separate from human sessions.
- Supabase Data API/RLS access to Prisma-owned commerce tables in this first slice.

### Blocking product decision

Before proposal approval, confirm whether the first release is the recommended **internal-operations boundary** (sign-in, persistent admin membership, minimal `/admin`, and session-protected cancel/refund) or whether catalog management must ship in the same release. Combining catalog CRUD materially changes scope, permissions, UI, audit requirements, and review size. The recommended default is internal operations first and catalog management as a follow-up change.

## Risks

- Cookie-backed mutation routes introduce CSRF/same-origin requirements that the bearer-token boundary did not have.
- `@supabase/ssr` remains beta and may change; keep it behind request-scoped adapters and pin reviewed dependency versions.
- JWT/session invalidation is not instantaneous in every case; sensitive operations need a documented revocation expectation and server-side verification.
- A role lookup outage must deny access without making public checkout unavailable.
- Replacing the token before sign-in, callback, refresh, bootstrap, and rollback are operationally proven could lock out administrators.
- The untracked `src/lib/auth/` work may encode useful tests, but adopting it without a specification would turn an implementation sketch into accidental architecture.

## Ready for Proposal

Yes, after the product boundary above is accepted or corrected. The proposal should make invite-only onboarding, Prisma-owned authorization, temporary-token cutover, CSRF protection, guest-checkout preservation, and rollback observable acceptance criteria.
