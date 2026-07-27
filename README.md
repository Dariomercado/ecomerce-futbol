# Ecomerce Futbol

Ecomerce Futbol is a UI-first football ecommerce portfolio project evolving
through reviewable slices. The repository has the storefront foundation, Prisma
with local PostgreSQL, repeatable catalog seed data, and public read-only
catalog APIs.

The next work is the API-backed UI. Cart, guest checkout, Mercado Pago,
Supabase Auth, and authenticated admin authorization remain future slices.

## Current foundation

| Area | Status |
| --- | --- |
| Git | Initialized |
| Framework | Next.js 16.2.9 |
| Router | App Router |
| Source directory | `src/` |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI foundation | shadcn/ui foundation installed |
| Theme support | `next-themes` installed |
| Design system | Foundation in use |
| Linting | ESLint configured |
| Package manager | pnpm |
| Lockfile | `pnpm-lock.yaml` committed with the project |
| Catalog persistence | Prisma + local PostgreSQL |
| Public catalog API | Implemented under `/api/catalog/*` |
| Authentication | Supabase Auth selected; not configured |

## Catalog-products status

Slices 1 through 3 are implemented and committed. Current task-ledger progress
is **25/36 complete, 11 pending, with no blockers**.

| Scope | Status |
| --- | --- |
| Data foundation | Done with local mock data |
| `ProductCard` / `ProductGrid` / `CatalogEmptyState` | Done |
| `/catalogo` | Done with mock filters |
| `/productos/[slug]` | Done with mock detail data |
| Navigation toward `/catalogo` | Done |
| Prisma schema and migration | Done |
| Product seed | Done and repeatable |
| Public catalog API | Done |
| Home featured products API-backed | Next: Work Unit 4A |
| Catalog/detail API-backed | Pending: Work Unit 4B |

Not present yet:

- Real cart
- Guest checkout and order persistence
- Mercado Pago
- Supabase Auth
- Authenticated admin authorization and admin UI
- Automated tests

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

- Preserve existing UI contracts while Work Units 4A and 4B replace mock reads
  with public API reads.
- Keep public catalog routes read-only.
- Use Supabase for authentication only; keep catalog, cart, order, and other
  commercial data in Prisma + PostgreSQL.
- Guest checkout is required. Customer accounts are optional, and an order may
  optionally reference an authenticated Supabase user.
- Authentication does not imply admin authorization. Implement admin only after
  both boundaries are present.
- Do not add cart, checkout, Mercado Pago, Auth, or admin behavior before its
  planned slice.

The next step for `catalog-products` is Slice 4, Work Unit 4A: connect the home
featured-products section to the public API.
