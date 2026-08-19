# Ecomerce Futbol

Ecomerce Futbol is a football ecommerce portfolio application with a public catalog, guest checkout, durable orders, and a production-oriented Mercado Pago payment lifecycle.

## Stack

| Area | Implementation |
| --- | --- |
| App | Next.js 16 App Router, TypeScript, Tailwind CSS |
| Commerce data | Prisma + PostgreSQL |
| Catalog | Public read-only catalog APIs powering home, catalog, and product detail views |
| Checkout | Cart, guest checkout, and persisted orders; accounts are optional |
| Payments | Mercado Pago tokenization, 3DS, payment state machine, idempotency, and provider-safe outcomes |
| Operations | Signed webhooks, cancellation/refund flows, and post-payment reconciliation |
| Authentication | Supabase Auth selected, but not yet configured |

## Payment operations

The payment core handles checkout-to-order persistence and provider state changes. Webhook signatures are verified before processing, and reconciliation protects against delayed or missed provider updates. Cancellation and refund paths are idempotent and include provider-safe state transitions.

A GitHub Actions workflow invokes the reconciliation endpoint every five minutes and can also be run manually. It requires repository secrets for the endpoint URL and cron authorization token; secrets are never committed.

## Quality evidence

Current ordinary-policy verification evidence:

- 165 tests passing across 21 test files
- Typecheck passing
- Production build passing
- ESLint: 0 errors, 2 warnings

The repository runs with RDD disabled at clone scope, using the ordinary-policy compatibility workflow instead: lightweight OpenSpec planning, delegated implementation, and standard test/build/lint evidence. Historical native SDD verification is stale and its archive is blocked by authority infrastructure, so this README does **not** claim a native SDD archive PASS. See [PROJECT_STATE.md](PROJECT_STATE.md) for the current operational checkpoint.

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Configure local environment variables for PostgreSQL, Mercado Pago, and the reconciliation endpoint before exercising payment operations. Keep all credentials in local environment files or deployment secrets.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Run the production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript without emitting files |
| `pnpm test` | Run the Vitest suite |
| `pnpm test:checkout` | Run focused checkout and payment tests |
| `pnpm e2e:post-payment` | Run the post-payment sandbox scenario |
| `pnpm db:seed` | Seed the Prisma database |

## Deployment

The selected deployment target is Netlify. GitHub Actions owns the scheduled reconciliation trigger and will call the deployed endpoint using repository secrets after the first production deployment. Set deployment configuration in the hosting platform and GitHub repository settings; never commit secret values.

## Documentation

- [PROJECT_STATE.md](PROJECT_STATE.md) — current workspace state, verification caveat, and resumption guidance
- [PROJECT_VISION.md](PROJECT_VISION.md) — product direction and scope
- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) — architecture choices and tradeoffs
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) — test approach
