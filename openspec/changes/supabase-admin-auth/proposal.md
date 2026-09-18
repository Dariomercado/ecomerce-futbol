# Proposal: Supabase Admin Authentication and Catalog Operations

## Intent

Replace the temporary human token with invite-only operator sessions and add bounded, auditable catalog management. Supabase provides identity; Prisma/PostgreSQL owns authorization and commerce data while guest shopping remains public.

## Scope

### In Scope
- Supabase invite sign-in, callback, cookie refresh, server verification, and sign-out.
- Revocable Prisma admin membership keyed by immutable Supabase user ID; fail-closed authorization.
- Protected `/admin` with unauthenticated, forbidden, and unavailable states.
- Session-authorized cancel/refund with same-origin/CSRF protection; unchanged scheduler credential.
- Audited product read/create/update/archive for required catalog fields.
- Regression protection for public browsing, order status, and guest checkout.

### Out of Scope
- Customer accounts, mandatory sign-in, social login, MFA, or custom recovery.
- General RBAC, multiple roles, analytics, bulk import, promotions, advanced inventory, or a full dashboard.
- Hard deletion, payment redesign, or replacing `RECONCILIATION_CRON_SECRET`.
- Commerce data or authorization in Supabase metadata/Data API.

## Capabilities

### New Capabilities
- `admin-operator-auth`: Invite identity, cookie sessions, Prisma membership, revocation, protected access, and CSRF defense.
- `admin-order-actions`: Authorized human cancel/refund without changing domain or scheduler boundaries.
- `admin-catalog-management`: Audited catalog create/read/update/archive constrained to the existing aggregate.

### Modified Capabilities
- None. Public catalog behavior and its first-slice rule remain unchanged.

## Approach

Isolate Supabase cookies behind request-scoped adapters. Verify identity server-side, then resolve active Prisma membership for every sensitive request; never authorize from user metadata or stale role claims. Apply shared authorization, same-origin/CSRF and domain validation, plus append-only audits recording actor, action, entity, timestamp, and bounded change context.

Catalog delivery ends with product listing, create/edit/archive, and necessary taxonomy, variants, images, pricing, publication, and stock controls. Richer merchandising and role policy remain deferred.

## Affected Areas

- `src/lib/auth/`, `src/app/admin/`: identity and operator UI.
- `src/app/api/internal/`: protected order and catalog mutations.
- `prisma/schema.prisma`: membership and audit persistence.
- Storefront/checkout: regression-only.

## Risks

- Cookie mutations add CSRF exposure; enforce same-origin checks.
- Supabase session integration may change; pin dependencies and verify current guidance during design.
- Outages or premature cutover may lock out operators; bootstrap before retiring the token.
- Catalog scope may expand; enforce the delivery boundary and audit every mutation.

## Rollback Plan

Disable catalog mutations, restore the human token only for cancel/refund, and revert auth/UI routing while retaining additive membership/audit data. Leave scheduler and public checkout unchanged.

## Success Criteria

- [ ] Only invited active members reach `/admin` or mutate operations; revocation blocks the next sensitive request.
- [ ] Cancel/refund rejects the human token; scheduler authentication is unchanged.
- [ ] Catalog create/edit/archive is validated and auditable within the first slice.
- [ ] Cross-origin unsafe requests fail; guest checkout and public catalog remain unchanged.


