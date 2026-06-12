# Ecomerce Futbol

Ecomerce Futbol is a UI-first football ecommerce portfolio project. The repository now has a working Next.js frontend foundation and keeps backend, auth, payment, and persistence decisions intentionally deferred.

## Current foundation

| Area | Status |
| --- | --- |
| Git | Initialized |
| Framework | Next.js 16.2.9 |
| Router | App Router |
| Source directory | `src/` |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Linting | ESLint |
| Package manager | pnpm |
| Lockfile | `pnpm-lock.yaml` committed with the project |

## Quick start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Project scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local Next.js dev server |
| `pnpm build` | Build the production app |
| `pnpm start` | Start the production server after build |
| `pnpm lint` | Run ESLint |

## Documentation map

| File | Purpose |
| --- | --- |
| `PROJECT_STATE.md` | Current real workspace state and guardrails |
| `PROJECT_VISION.md` | Product direction and scope boundaries |
| `PLAN.md` | Delivery phases |
| `ARCHITECTURE_DECISIONS.md` | Architecture decisions and tradeoffs |
| `DESIGN_SYSTEM.md` | Visual system direction |
| `BRAND_GUIDE.md` | Brand foundations |
| `CONTENT_STRATEGY.md` | Content and copy direction |
| `CATALOG_DESIGN.md` | Catalog model and merchandising plan |
| `UI_ROADMAP.md` | Planned UI screens and sections |
| `FOLDER_STRUCTURE.md` | Proposed application structure |
| `ENVIRONMENTS.md` | Environment strategy |
| `TESTING_STRATEGY.md` | Testing direction |
| `SITEMAP.md` | Route plan |
| `USER_FLOWS.md` | Main user journeys |
| `MOCK_DATA_STRATEGY.md` | Mock data strategy |

## Current guardrails

Do not add yet:

- shadcn/ui
- next-themes
- TanStack Query
- React Hook Form
- Zod
- Prisma
- Supabase
- Auth
- Mercado Pago
- Database migrations
- Real checkout/order persistence

The next step is visual infrastructure only after the bootstrap foundation is clean and committed.