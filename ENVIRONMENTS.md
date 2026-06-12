# Environments

This project currently has a local Next.js frontend foundation. Backend, auth, payment, and persistence environments remain intentionally deferred.

## Current environment status

| Area | Current decision |
| --- | --- |
| Local app | Next.js app runs locally with `pnpm dev` |
| Package manager | `pnpm` only |
| Runtime config | No runtime environment variables required yet |
| Safe template | `.env.example` is kept as the future env contract |
| Auth provider | Not configured |
| Database provider | Not configured |
| Payment provider | Not configured |
| Deployment provider | Not selected |

## Local development

```bash
pnpm install
pnpm dev
```

Expected local URL:

```text
http://localhost:3000
```

## Environment files

`.env.example` is safe to commit and documents future variables. Real environment files stay ignored by Git.

Current `.gitignore` behavior:

- ignores `.env*`
- explicitly allows `.env.example`

## Deferred infrastructure

Do not add yet:

- Supabase
- Prisma
- Auth
- Mercado Pago
- database migrations
- production deployment configuration

These choices should happen only after the UI-first foundation and product assumptions are validated.