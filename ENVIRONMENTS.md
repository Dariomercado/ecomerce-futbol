# Environments

Local development runs Next.js with Prisma and PostgreSQL. Production uses
Supabase PostgreSQL through Netlify. Mercado Pago server configuration and the
GitHub Actions reconciliation scheduler are configured in production; Supabase
Auth/admin remains work in progress and is not delivered or deployed.

## Current environment status

| Area | Current decision |
| --- | --- |
| Local app | Next.js app runs locally with `pnpm dev` |
| Package manager | `pnpm` only |
| Runtime config | `DATABASE_URL` is required for catalog persistence and API reads |
| Safe template | `.env.example` documents the current local database contract |
| Auth provider | Supabase Auth server boundary configured; sign-in UI and persistent application roles remain deferred |
| Database provider | Supabase PostgreSQL through Prisma; healthy in production and configured locally |
| Payment provider | Mercado Pago server configuration is present in Netlify Production |
| App deployment provider | Netlify Production configured |
| Reconciliation scheduler | GitHub Actions configured; invokes the deployed internal endpoint every five minutes |

## Production status (2026-09-15)

| Area | Verified state |
| --- | --- |
| Supabase project | Healthy after resuming an inactivity pause on the Free plan; all four Prisma migrations applied |
| Seeded catalog | 4 categories, 5 brands, 8 products, 14 variants, 10 images; 7 active published and 1 archived/inactive product |
| Netlify database connection | Production `DATABASE_URL` uses the Supavisor Transaction Pooler on port 6543 with `?pgbouncer=true` for Prisma |
| Catalog | Production catalog loads successfully |
| Reconciliation scheduler | GitHub Actions **Reconcile payments** run `#406` succeeded after GitHub endpoint/cron secrets and Netlify reconciliation/Mercado Pago secrets were configured |
| Post-payment admin token | Not verified in Netlify; do not treat cancellation/refund administration as enabled |

No secret values are recorded in this document.

## Local development

```bash
pnpm install
pnpm dev
```

Expected local URL:

```text
http://localhost:3000
```

Local PostgreSQL runs through `docker-compose.yml`. The recommended
`DATABASE_URL` is documented in `.env.example`.

## Environment files

`.env.example` is safe to commit and documents non-secret local variables. Real
environment files stay ignored by Git.

Current `.gitignore` behavior:

- ignores `.env*`
- explicitly allows `.env.example`

## Integration boundaries

- Netlify is the selected application deployment target. Its deployment secret
  manager must provide all required server-only application variables.
- GitHub Actions is the selected reconciliation scheduler. It calls the deployed
  Netlify endpoint with repository secrets and never stores those values in the
  workflow file.
- Supabase Auth uses `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for request-scoped server clients.
  `SUPABASE_ADMIN_USER_IDS` is a server-only bootstrap allowlist of Supabase
  user IDs until a repository-owned roles model exists. Do not use editable
  user metadata as an authorization source.
- Prisma + PostgreSQL continue to own catalog, cart, order, and other commercial
  data.
- Checkout must support guests; a Supabase identity is optional for an order.
- Admin access requires both Supabase authentication and application
  authorization.
- Mercado Pago server secrets are configured in Netlify Production. Keep them
  server-only and never expose them through `NEXT_PUBLIC_*` variables.
- `RECONCILIATION_ENDPOINT_URL` and `RECONCILIATION_CRON_SECRET` are GitHub
  repository secrets for the scheduler. Netlify needs the matching cron secret
  to authorize its internal endpoint; it does not need the endpoint URL.
- The Supabase Free plan can pause an inactive project. If catalog reads fail
  with an otherwise valid deployment configuration, verify the Supabase project
  status before changing application code or workflow configuration.
