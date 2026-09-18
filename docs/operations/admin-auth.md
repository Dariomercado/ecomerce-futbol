# Operating Supabase administrator access

Use Supabase only for an invited operator's identity. The application grants access only when that identity also has an active `AdminMembership` record. This runbook is for a project owner or approved database operator; it is not an application endpoint or a browser workflow.

## Quick path

1. Deploy the additive membership/audit migration and the auth UI while the prior cancel/refund boundary is still available.
2. In Supabase **Authentication > Users**, have a project owner send an invitation to the operator. Configure the production Site URL and allow the exact `https://<app-origin>/auth/confirm` redirect first.
3. Obtain the invited user's immutable UUID from the trusted Auth dashboard, then run the bootstrap SQL below through an approved privileged database session.
4. The operator accepts the invite, signs in at `/auth/sign-in`, and opens `/admin`. Verify the membership and audit evidence before cutting over a second operator.

Do not use an email address, `user_metadata`, JWT role claim, or a cached claim as authorization. The app checks active membership on each sensitive request.

## Invite and membership bootstrap

### Privileged-only procedure

Use the Supabase Dashboard invite flow or a separate, access-controlled administration service. Inviting users through the Auth Admin API requires a Supabase secret key; keep that key outside this application and never expose it to a browser, `NEXT_PUBLIC_*` variable, source control, shell history, logs, or this runbook.

Run the following SQL only as an approved project/database administrator (for example, a controlled Dashboard SQL session or a direct privileged connection). It writes to the application database; it is **not** a Data API or application-user operation. Substitute UUIDs through your approved operator tooling—do not paste credentials into the command.

```sql
BEGIN;

-- Confirm the supplied UUID belongs to the invited Auth user before granting access.
SELECT id, email_confirmed_at
FROM auth.users
WHERE id = :'supabase_user_id'::uuid;

-- :membership_id must be a newly generated UUID, distinct from the user ID.
INSERT INTO "AdminMembership" (
  "id", "supabaseUserId", "isActive", "createdAt", "updatedAt", "revokedAt"
) VALUES (
  :'membership_id'::uuid,
  :'supabase_user_id'::uuid,
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
| Cut over | Verify a second operator, then deploy the version that uses session authorization for cancel/refund and enables the admin catalog routes. Retire `POST_PAYMENT_ADMIN_TOKEN` only after this verification. | No human workflow depends on the temporary token. |

## Scheduler is not an administrator

`RECONCILIATION_CRON_SECRET` authenticates only the machine-to-machine reconciliation scheduler. It must remain a different server-only secret, injected into the scheduler and deployed application by the approved secret manager. It does **not** create a Supabase session, grant `/admin`, or authorize human cancel/refund/catalog actions.

Conversely, an administrator's browser session must not be supplied to the scheduler. Keep the scheduler request on its existing `Authorization: Bearer` credential and follow the reconciliation runbook for its rotation and failure handling.

## Safe environment variables

| Variable | Handling |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public project URL; browser-safe, but use the intended environment only. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key; browser-safe. It does not grant administrator access. |
| `APP_ORIGIN` | Server-only exact application origin used for request-integrity checks; no path, wildcard, or untrusted preview value. |
| `RECONCILIATION_CRON_SECRET` | Server-only scheduler credential, separate from all human-session and temporary-token values. |
| Supabase secret/service-role key | Never configure in this application or as `NEXT_PUBLIC_*`. If an external invite tool needs a secret key, inject it only into that trusted tool. |

Never log cookies, CSRF tokens, invite links, Authorization headers, database URLs, or any secret value. Use the secret manager rather than `.env` files for deployed credentials; `.env.example` contains placeholders only.

## Verification checklist

- [ ] Supabase Site URL and exact `/auth/confirm` redirect URL match the deployed `APP_ORIGIN`.
- [ ] Invite was sent by a project owner or trusted external admin process; no secret/service-role key reached the application or browser.
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
| Cutover must stop | Disable admin catalog routes and deploy the previously verified human cancel/refund boundary if needed. Retain membership and immutable audit data; do not delete it as rollback. |
| Scheduler fails during auth changes | Restore only its approved `RECONCILIATION_CRON_SECRET` injection and endpoint configuration. Never substitute an admin session or human credential. |

Application rollback does not revoke existing Supabase identities or erase audit history. To remove an operator immediately, set that membership inactive through the same privileged process and retain the record for auditability.
