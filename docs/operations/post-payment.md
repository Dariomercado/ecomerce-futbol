# Operating post-payment cancellation and refunds

These endpoints are a temporary, server-only administrative boundary for Mercado Pago order cancellation and refund. Enable them only after the database migration and Prisma client generation succeed. They are not a replacement for administrator sessions, roles, or RBAC.

## Quick path

1. Apply the post-payment migration and regenerate Prisma before deploying the routes.
2. Store `POST_PAYMENT_ADMIN_TOKEN` and the separate `RECONCILIATION_CRON_SECRET` only in the deployment secret manager and restart every application instance.
3. Call an administrative endpoint with `POST_PAYMENT_ADMIN_TOKEN`, or the reconciliation scheduler endpoint with `RECONCILIATION_CRON_SECRET`, in an `Authorization: Bearer <token>` header over an approved private/HTTPS path.
4. Use the returned operation status and verified Mercado Pago evidence for reconciliation; never retry by editing stock or order records manually.

## Deployment prerequisites

The application needs all server-side payment values below. Do not add any of them to `NEXT_PUBLIC_*` variables or browser configuration.

| Variable | Required for | Handling |
| --- | --- | --- |
| `DATABASE_URL` | Ledger, order, reservation, and stock transaction | Server-only secret |
| `MERCADO_PAGO_ACCESS_TOKEN` | Mercado Pago cancel/refund request | Server-only secret |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Verified webhook reconciliation | Server-only secret |
| `POST_PAYMENT_ADMIN_TOKEN` | Temporary administrative route authorization | Server-only secret; use a high-entropy value from the approved secret manager |
| `RECONCILIATION_CRON_SECRET` | Server-to-server authorization for the bounded reconciliation scheduler | Server-only secret; use a separate high-entropy value from the approved secret manager |

Before the first deployment, stop the local development server if Windows holds Prisma's native DLL, then run:

```powershell
pnpm.cmd exec prisma migrate deploy
pnpm.cmd exec prisma generate
```

In a non-PowerShell environment, use the equivalent `pnpm exec` commands. Do not run the migration against production without the normal backup, change-approval, and deployment process. Task 4.2 is the evidence-bearing migration step; this guide does not apply it.

## Enable and use the boundary

Set `POST_PAYMENT_ADMIN_TOKEN` in the server secret manager, deploy it to every instance, and restart the instances so their environment is refreshed. The routes are:

```text
POST /api/internal/orders/{orderId}/cancel
POST /api/internal/orders/{orderId}/refund
```

The request has no body. Send the token only through the `Authorization` header. Missing credentials return `401`, invalid credentials return `403`, and an unset server token returns `503`. Authentication occurs before database, provider, or stock work.

Cancellation is eligible only before a paid or terminal order. Refund is eligible only for a paid order. A successful operation is recorded durably and reuses its provider idempotency key; a duplicate completed operation returns `409` rather than repeating provider or stock effects.

## Reconciliation scheduler

`POST /api/internal/payments/reconcile` is a server-to-server scheduler endpoint, not an administrative endpoint. Its `RECONCILIATION_CRON_SECRET` must be different from `POST_PAYMENT_ADMIN_TOKEN`; possessing one secret must not authorize the other boundary. The scheduler may invoke it over the approved private/HTTPS path with no request body:

```powershell
Invoke-WebRequest -Method Post -Uri "https://app.example.com/api/internal/payments/reconcile" -Headers @{ Authorization = "Bearer $env:RECONCILIATION_CRON_SECRET" }
```

Inject `RECONCILIATION_CRON_SECRET` directly into the scheduler's process from the approved secret manager. Do not place its value in a scheduler definition, command history, logs, source control, or `.env` file. Missing or malformed credentials return `401 RECONCILIATION_AUTH_REQUIRED`; a wrong token returns `403 RECONCILIATION_AUTH_INVALID`; an unset scheduler secret returns `503 RECONCILIATION_AUTH_UNAVAILABLE`. These checks run before payment configuration, attempt leasing, repository creation, or Mercado Pago gateway construction. A valid call leases at most one bounded page of due attempts and performs provider lookups through the normal reconciliation flow.

## GitHub Actions scheduler setup

The committed workflow `.github/workflows/reconcile-payments.yml` is the selected
scheduler. GitHub evaluates `*/5 * * * *` in UTC and may delay scheduled runs
under platform load. It also provides `workflow_dispatch` for a deliberate,
manually triggered run. Its concurrency group does not cancel an in-progress
reconciliation; it queues the next eligible run instead, preventing overlap.

Configure the GitHub repository secrets exactly as follows:

1. Open the repository in GitHub, then go to **Settings** > **Secrets and variables** > **Actions**.
2. Select **New repository secret** and create `RECONCILIATION_ENDPOINT_URL`. Set its value to the deployed Netlify HTTPS endpoint, for example `https://<site>.netlify.app/api/internal/payments/reconcile`.
3. Select **New repository secret** again and create `RECONCILIATION_CRON_SECRET`. Set its value to the same high-entropy server-only value injected into the Netlify application as `RECONCILIATION_CRON_SECRET`.
4. Confirm the Netlify deployment has its own `RECONCILIATION_CRON_SECRET` environment variable. Do not use `POST_PAYMENT_ADMIN_TOKEN` for either secret.
5. Trigger **Reconcile payments** through the Actions tab only after the endpoint is deployed and the normal operational approval process permits it.

The workflow fails closed before sending a request if either GitHub secret is
missing. It sends one POST request with the cron secret only in the Bearer
header, has a 15-second connection timeout and a 210-second total curl timeout,
and discards the response body. Do not enable verbose curl output or echo either
environment variable: workflow logs must not expose secrets or the endpoint URL.

When rotating the reconciliation secret, update the Netlify environment variable
and the GitHub repository secret together, then redeploy the application before
triggering a run. If a scheduled run fails, inspect only its HTTP outcome and
redacted GitHub Actions metadata; do not copy request headers, secret values, or
response bodies into tickets or logs.

## Production recovery record (2026-09-15)

The scheduler and catalog were revalidated after recovering the production
database dependency:

- The Supabase Free project had paused after inactivity and was resumed.
- GitHub Actions **Reconcile payments** run `#406` then completed successfully.
- GitHub holds the scheduler endpoint and cron secrets. Netlify holds the
  matching reconciliation cron secret plus Mercado Pago server secrets.
- After the database credential rotation, Prisma required the Supavisor
  Transaction Pooler connection to include `?pgbouncer=true`. Catalog reads
  succeeded after that configuration was updated.

No secret values or endpoint URLs are recorded here. `POST_PAYMENT_ADMIN_TOKEN`
was not verified during this recovery; treat the temporary cancel/refund
boundary as unavailable until that separate token is configured and verified.
## Rotate or disable access

The temporary adapter accepts one configured token at a time.

### Rotate

1. Generate and store a replacement value through the approved secret manager; do not paste it into source control, tickets, chat, logs, or `.env.example`.
2. Update `POST_PAYMENT_ADMIN_TOKEN` or `RECONCILIATION_CRON_SECRET` on every application instance or scheduler process that uses the rotating boundary.
3. Restart or redeploy every instance.
4. Verify an authorized request only through the approved sandbox or operational process.
5. Revoke the previous value in the secret manager after all instances use the new value.

Rotation invalidates callers that still use the old value. Plan the caller update and deployment together; the implementation does not support a grace period with two tokens.

### Disable

Remove `POST_PAYMENT_ADMIN_TOKEN` to disable the administrative routes; they return `503 POST_PAYMENT_UNAVAILABLE` before any database, Mercado Pago, or stock work. Remove `RECONCILIATION_CRON_SECRET` to disable the scheduler endpoint; it returns `503 RECONCILIATION_AUTH_UNAVAILABLE` before payment configuration, database leasing, repository creation, or Mercado Pago gateway construction. Restart/redeploy every affected process and preserve the other payment secrets unless the broader payment integration is also being disabled.

## Redaction and safe evidence

Never write or expose these values in responses, browser code, screenshots, issue trackers, test fixtures, CI output, or application logs:

- `POST_PAYMENT_ADMIN_TOKEN`, `RECONCILIATION_CRON_SECRET`, and full `Authorization` headers;
- Mercado Pago access tokens and webhook secrets;
- raw provider response bodies or request headers;
- customer data, full order identifiers, and provider identifiers outside the approved operational system.

For support and reconciliation, record only the operation type, redacted/opaque correlation references, timestamp, HTTP outcome, local operation status, and normalized provider status. The public route response intentionally exposes stable error codes, not raw provider diagnostics.

## Failure, rollback, and reconciliation

Provider action failures or invalid provider action responses leave the local operation ledger in `RUNNING`. This preserves its idempotency key for a safe retry or for reconciliation with verified signed webhook evidence. Do not create a second operation, invent a completion state, or manually change stock to "make it match."

If an operator must halt new administrative actions, disable the token first. Then reconcile from authoritative evidence in this order:

1. Confirm the Mercado Pago operation through the approved provider channel.
2. Inspect the durable operation ledger, order state, webhook receipt, reservations, and stock under the normal production access controls.
3. If the provider confirms the terminal action, allow the existing retry or validated webhook path to perform the local terminal transaction.
4. Escalate any mismatch for a forward repair with database backup and audit evidence; do not directly overwrite order, reservation, or stock rows.

After a confirmed cancellation or refund, the local transaction claims the applicable reservation once and changes stock exactly once. Later duplicate or delayed webhooks are informational and must not reverse terminal order state or restock again.

Application rollback does not automatically undo the Prisma migration or a provider-confirmed refund. Treat database rollback and financial reversal as separate, approved incident procedures. Prefer a forward fix and reconciliation after provider confirmation.

## Operational limits

- This boundary is for approved internal operators only; it has no user sessions, roles, RBAC, audit UI, or multi-token grace period.
- It is not a public client API and must not be called from browser code.
- Use sandbox credentials and secret-manager injection for end-to-end verification. Do not place live credentials in local files or automated test output.
- The provider is authoritative. Completion requires a normalized terminal provider result or validated signed webhook evidence.
- The service supports cancellation and refund only; it does not perform arbitrary payment corrections.

## Sandbox E2E harness

Task 4.4 has a dedicated executable harness at `scripts/e2e/post-payment-sandbox.mts`. It proves the full protected-operation path without exposing credentials or identifiers in command history or output:

1. It snapshots the fixture's local order, reservations, and variant stock from Prisma.
2. It invokes exactly one authenticated internal `cancel` or `refund` request.
3. It verifies the terminal order/ledger transition and one stock restoration using the reservation quantities stored before the action.
4. It replays the same signed, real Mercado Pago webhook twice.
5. It verifies the webhook receipt is processed and that the second replay leaves the complete local snapshot unchanged.

The harness does **not** manufacture a card token, create a Mercado Pago test user, or silently create a payment. Those are provider-owned sandbox setup steps. Prepare a fresh dedicated fixture through the normal sandbox checkout first:

- for `refund`, create and pay a sandbox order so it is locally `PAID` with `CONSUMED` reservations;
- for `cancel`, create a sandbox provider order that remains locally eligible to cancel with `ACTIVE` reservations;
- retain the provider's actual signed webhook body, signature, and optional request ID in the secret manager. Do not put those values in a shell command, `.env`, source control, or test output.

For deployment and shared environments, an approved secret manager must inject the following process environment values into both the running Next.js application and the harness. The harness never reads `.env` files. It refuses production mode and always requires `--execute`, `E2E_POST_PAYMENT_ENVIRONMENT=sandbox`, and `E2E_POST_PAYMENT_CONFIRM=SANDBOX_ONLY`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Reads the local ledger, reservation, webhook-receipt, and stock assertions. |
| `MERCADO_PAGO_ACCESS_TOKEN` | Lets the application validate the provider action and webhook evidence. |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Lets the application validate the replayed signed webhook. |
| `POST_PAYMENT_ADMIN_TOKEN` | Authorizes the one protected cancel/refund call; never printed. |
| `E2E_POST_PAYMENT_ENVIRONMENT=sandbox` | Hard safety assertion; live/prod execution is refused. |
| `E2E_POST_PAYMENT_SECRET_SOURCE=secret-manager` | Declares an approved secret-manager injection path. |
| `E2E_POST_PAYMENT_CONFIRM=SANDBOX_ONLY` | Requires an explicit operator confirmation. |
| `E2E_POST_PAYMENT_BASE_URL` | Localhost or HTTPS sandbox application URL. |
| `E2E_POST_PAYMENT_ORDER_ID` | Fresh prepared local sandbox order ID; never printed. |
| `E2E_POST_PAYMENT_WEBHOOK_BODY_BASE64` | Base64 of the exact provider notification body; never printed. |
| `E2E_POST_PAYMENT_WEBHOOK_SIGNATURE` | Exact `x-signature` header; never printed. |
| `E2E_POST_PAYMENT_WEBHOOK_REQUEST_ID` | Optional original `x-request-id` header. |

Start the application through the same approved secret-manager injection mechanism, then run the harness through that mechanism as well. Substitute the approved command for `<secret-manager-inject>`; it must populate process environment rather than copy values into a file:

```powershell
<secret-manager-inject> -- pnpm.cmd dev
<secret-manager-inject> -- pnpm.cmd e2e:post-payment -- --execute --operation refund
```

### Local-process sandbox exception

When no secret manager is configured, a local developer may use `E2E_POST_PAYMENT_SECRET_SOURCE=local-process` **only** for a sandbox run. This marker does not relax any guard: the harness still requires `--execute`, rejects `NODE_ENV=production`, requires `E2E_POST_PAYMENT_ENVIRONMENT=sandbox` and `E2E_POST_PAYMENT_CONFIRM=SANDBOX_ONLY`, accepts only localhost or HTTPS for `E2E_POST_PAYMENT_BASE_URL`, and requires every input listed above.

Inject the values into the already-running local process through an approved local mechanism (for example, a protected IDE run configuration or an interactive shell session). Do not put them in `.env`, source control, command arguments, shell history, screenshots, or logs. `local-process` is strictly for an isolated local Mercado Pago sandbox run; it is not an approved deployment or shared-environment secret source.

Do not invent fixture values. `E2E_POST_PAYMENT_ORDER_ID`, `E2E_POST_PAYMENT_WEBHOOK_BODY_BASE64`, and `E2E_POST_PAYMENT_WEBHOOK_SIGNATURE` must come from one real, newly created sandbox checkout and its matching signed provider notification. `E2E_POST_PAYMENT_BASE_URL` is the URL of the locally running application (normally `http://localhost:3000`). The remaining fixed markers are:

```text
E2E_POST_PAYMENT_ENVIRONMENT=sandbox
E2E_POST_PAYMENT_SECRET_SOURCE=local-process
E2E_POST_PAYMENT_CONFIRM=SANDBOX_ONLY
```

Use `cancel` instead of `refund` only with a freshly prepared cancel-eligible fixture. The harness reports only an opaque order reference, operation name, and assertion names. It makes no provider request until `--execute` is present, and it fails closed for production mode, a non-sandbox marker, invalid secret source, missing confirmation, missing input, invalid fixture state, invalid protected-route response, or any double-restock signal.

## Planned authentication replacement

`src/lib/admin/temporary-admin-auth.ts` deliberately isolates the provisional Bearer-token check. The future `supabase-admin-auth` change must replace this adapter and its route integration with Supabase Auth sessions, administrator roles/RBAC, revocation, and auditable identity. It must not couple identity rules into the post-payment service, gateway, or stock transaction.

## Deployment checklist

- [ ] Migration `20260815000000_post_payment_operations` is applied.
- [ ] Prisma client is regenerated for the deployed schema.
- [ ] All server-side secrets are present only in the approved secret manager.
- [ ] `POST_PAYMENT_ADMIN_TOKEN` is configured or deliberately absent to keep the boundary disabled.
- [ ] `RECONCILIATION_CRON_SECRET` is configured only for the reconciliation scheduler and differs from `POST_PAYMENT_ADMIN_TOKEN`.
- [ ] No secret or raw provider payload is present in logs, tickets, tests, or deployment output.
- [ ] Sandbox verification and reconciliation evidence are retained with redacted identifiers.
