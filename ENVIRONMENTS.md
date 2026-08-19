# Environments

The local environment currently runs Next.js with Prisma and PostgreSQL.
Supabase Auth and Mercado Pago are selected future integrations but are not
configured yet.

## Current environment status

| Area | Current decision |
| --- | --- |
| Local app | Next.js app runs locally with `pnpm dev` |
| Package manager | `pnpm` only |
| Runtime config | `DATABASE_URL` is required for catalog persistence and API reads |
| Safe template | `.env.example` documents the current local database contract |
| Auth provider | Supabase Auth selected; not configured |
| Database provider | PostgreSQL through Prisma; configured locally |
| Payment provider | Mercado Pago selected; not configured |
| App deployment provider | Netlify selected |
| Reconciliation scheduler | GitHub Actions selected; invokes the deployed internal endpoint every five minutes |

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
- Supabase will provide authentication only. Its environment variables are
  added in the dedicated authentication slice, not during documentation
  reconciliation.
- Prisma + PostgreSQL continue to own catalog, cart, order, and other commercial
  data.
- Checkout must support guests; a Supabase identity is optional for an order.
- Admin access requires both Supabase authentication and application
  authorization.
- Mercado Pago production configuration remains deferred to its planned slice.
