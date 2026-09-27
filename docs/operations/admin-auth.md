# Operating Supabase administrator access

Use Supabase Auth for an invited operator's identity. The application grants access only when that identity also has an active `AdminMembership` record. This runbook is for a project owner or approved database operator; it is not an application endpoint or a browser workflow.

## Quick path

1. Deploy the additive membership/audit migration and the auth UI before exercising session-authorized cancel/refund routes.
2. In Supabase **Authentication > Users**, have a project owner send an invitation to the operator. Configure the production Site URL, the exact local/production `/auth/confirm` redirects, and the restricted Netlify Preview redirect pattern first.
3. Obtain the invited user's immutable UUID from the trusted Auth dashboard, then run the bootstrap SQL below through an approved privileged database session.
4. The operator accepts the invite, signs in at `/auth/sign-in`, and opens `/admin`. Verify the membership and audit evidence before cutting over a second operator.

Do not use an email address, `user_metadata`, JWT role claim, or a cached claim as authorization. The app checks active membership on each sensitive request.

## Invite and membership bootstrap

### Privileged-only procedure

Use the Supabase Dashboard invite flow or a separate, access-controlled administration service. Inviting users through the Auth Admin API requires a Supabase secret key; keep invite-tool credentials outside the Auth/session boundary and never expose them to a browser, `NEXT_PUBLIC_*` variable, source control, shell history, logs, or this runbook.

Run the following SQL only as an approved project/database administrator (for example, a controlled Dashboard SQL session or a direct privileged connection). It writes to the application database; it is **not** a Data API or application-user operation. Substitute UUIDs through your approved operator tooling—do not paste credentials into the command.

```sql
BEGIN;

-- Confirm the supplied UUID belongs to the invited Auth user before granting access.
SELECT id, email_confirmed_at
FROM auth.users
WHERE id = :'supabase_user_id'::uuid;

-- :membership_id must be a newly generated UUID, distinct from the user ID.
INSERT INTO "AdminMembership" (
  "id", "supabaseUserId", "role", "isActive", "createdAt", "updatedAt", "revokedAt"
) VALUES (
  :'membership_id'::uuid,
  :'supabase_user_id'::uuid,
  'EDITOR', -- Use ADMIN explicitly only for the approved first administrator.
  TRUE,
  now(),
  now(),
  NULL
)
ON CONFLICT ("supabaseUserId") DO UPDATE
SET "isActive" = TRUE,
    "revokedAt" = NULL,
    "updatedAt" = now()
RETURNING "id", "supabaseUserId", "isActive", "createdAt", "revokedAt";

COMMIT;
```

Stop and roll back the transaction if the initial lookup returns anything other than exactly the intended user. Record only an approved opaque operator reference and timestamp; never copy invite URLs, session cookies, secret keys, or full headers into tickets.

## Rollout and cutover

| Stage | Action | Exit criterion |
| --- | --- | --- |
| Prepare | Apply the additive migration, deploy auth code, configure Supabase Site URL and the exact `/auth/confirm` redirect. | Public catalog, guest checkout, and reconciliation are unchanged. |
| Bootstrap | Invite and grant one staging operator, then a first production operator using the privileged procedure. | The user can sign in and `/admin` reports neither unauthenticated, forbidden, nor unavailable. |
| Verify | Exercise an authorized same-origin admin operation and confirm its bounded audit event; revoke a test membership and confirm the next sensitive request is forbidden. | Authorization, audit, and immediate revocation behave as expected. |
| Cut over | Verify a second operator and the deployed session-authorized cancel/refund/catalog routes. Current routes already use this boundary; the legacy bearer token cannot authorize them. | No human workflow depends on the temporary token. |

## Scheduler is not an administrator

`RECONCILIATION_CRON_SECRET` authenticates only the machine-to-machine reconciliation scheduler. It must remain a different server-only secret, injected into the scheduler and deployed application by the approved secret manager. It does **not** create a Supabase session, grant `/admin`, or authorize human cancel/refund/catalog actions.

Conversely, an administrator's browser session must not be supplied to the scheduler. Keep the scheduler request on its existing `Authorization: Bearer` credential and follow the reconciliation runbook for its rotation and failure handling.

## Safe environment variables

| Variable | Handling |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public project URL; browser-safe, but use the intended environment only. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key; browser-safe. It does not grant administrator access. |
| `APP_ORIGIN` | Server-only exact application origin override. Set `http://localhost:3000` locally and the exact Netlify Production origin in Production; no path, wildcard, query, fragment, or credentials. |
| `DEPLOY_PRIME_URL` | Trusted Netlify system variable used only when `APP_ORIGIN` is absent. Deploy Previews must omit `APP_ORIGIN`; the application accepts only an exact HTTP(S) origin from this variable. |
| `RECONCILIATION_CRON_SECRET` | Server-only scheduler credential, separate from all human-session values. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged Storage credential for product images; never expose as `NEXT_PUBLIC_*`, to the browser, or to Auth/session clients. External invite tools need their own controlled credential handling. |
| `SUPABASE_PRODUCT_IMAGES_BUCKET` | Server-side Storage bucket name; defaults to `product-images`. Verify bucket setup for the deployed environment. |

Never log cookies, CSRF tokens, invite links, Authorization headers, database URLs, or any secret value. Use the secret manager rather than `.env` files for deployed credentials; `.env.example` contains placeholders only.

Storage uses a separate server-only privileged client. Auth uses the public
publishable key (the browser-safe/anon boundary) plus verified session identity;
it must not use the Storage service-role credential. Active membership, not
public keys or user metadata, grants administrator access.

## Approved v1 roles

| Permission | ADMIN | EDITOR |
| --- | --- | --- |
| Catalog, prices, stock, images, archive/restore | Yes | Yes |
| Read orders; cancel/refund | Yes | No |
| Change existing staff roles and revoke/reactivate access | Yes | No |

Role changes live in `AdminMembership`, not editable Auth metadata. Every sensitive
request rereads membership and role. Unknown roles fail closed. `/admin/staff`
only manages existing invited memberships; provisioning stays privileged and external.
Staff forms submit an independently rendered hidden CSRF token; the action
compares that submitted token with the issued cookie, preserving Origin checks.
Self-demotion/revocation is blocked. Membership writes are serialized with a
transactional table lock; actor authorization and the last-active-admin invariant
are rechecked inside the transaction, and audit creation is atomic with the write.

Migration `20260928000000_admin_roles` preserves all existing memberships as ADMIN
and defaults future memberships to EDITOR. The migration file exists locally but
has NOT been applied. Deploy it before role-aware code. Bootstrap the first ADMIN
explicitly; do not automatically elevate an existing membership in bootstrap SQL.

Orders are shown as a bounded latest-50 read-only list. Financial actions retain
the protected existing cancel/refund endpoints and sandbox harness; financial
buttons in the order panel and pagination are not part of this local slice.

Verification still required: migrated staging/production database, real ADMIN and
EDITOR sessions, role changes and revocation on the next request, concurrent staff
changes, audit rollback on write failure, and deployed navigation/sign-out.
Retain role/audit data on application rollback; do not drop columns or audit records.

## Origin and redirect configuration

- Local development sets `APP_ORIGIN=http://localhost:3000` and permits `http://localhost:3000/auth/confirm` in Supabase Auth Redirect URLs.
- Netlify Production sets `APP_ORIGIN` to its exact HTTPS application origin. Supabase Site URL and Redirect URLs must allow `<production-origin>/auth/confirm`.
- Netlify Deploy Previews omit `APP_ORIGIN`. The application uses Netlify's `DEPLOY_PRIME_URL`; Supabase Redirect URLs must allow the restricted site pattern `https://**--<netlify-site>.netlify.app/**`, which covers `/auth/confirm` for preview URLs. Do not configure that wildcard as `APP_ORIGIN`.

## Verification checklist

- [ ] Supabase Site URL is the production origin; Redirect URLs allow local/production `/auth/confirm` plus the restricted Netlify Preview pattern.
- [ ] Invite was sent by a project owner or trusted external admin process; no invite-tool secret reached Auth/session clients or the browser; the Storage service-role credential remains server-only.
- [ ] The bootstrap SQL matched exactly one intended Auth UUID and returned an active membership.
- [ ] An invited operator can sign in, refresh, open `/admin`, and complete one approved same-origin action with an audit record.
- [ ] Revoking that membership denies the next sensitive request without affecting public catalog, guest checkout, or reconciliation.
- [ ] The reconciliation scheduler still succeeds with `RECONCILIATION_CRON_SECRET` and no operator session.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` pass for the candidate deployment.

## Failure and rollback

| Situation | Immediate response |
| --- | --- |
| Invite link fails or redirects incorrectly | Do not change application redirects ad hoc. Correct the Supabase Site URL/allow list, send a new invite, and re-check the exact production origin. |
| Operator is forbidden | Confirm the immutable Auth UUID and active `AdminMembership`; do not add metadata roles or loosen authorization. |
| Auth or membership is unavailable | Keep the failure closed for admin actions. Public browsing, guest checkout, and reconciliation remain independent. Investigate provider/database availability before retrying. |
| Cutover must stop | Revoke affected memberships and use an approved application rollback if needed; do not assume the legacy token still authorizes current routes. Retain membership and immutable audit data; do not delete it as rollback. |
| Scheduler fails during auth changes | Restore only its approved `RECONCILIATION_CRON_SECRET` injection and endpoint configuration. Never substitute an admin session or human credential. |

Application rollback does not revoke existing Supabase identities or erase audit history. To remove an operator immediately, set that membership inactive through the same privileged process and retain the record for auditability.
