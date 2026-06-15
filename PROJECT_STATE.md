# Project state

This file records the current real workspace state after catalog-products Slice 1.

## Workspace audit

| Check | Result |
| --- | --- |
| Workspace path | `C:\Users\DARIO-PC\desktop\ecomerce-futbol` |
| Git repository | Initialized |
| Framework | Next.js 16.2.9 |
| Router | App Router |
| Source directory | `src/` |
| `package.json` | Present |
| Lockfile | `pnpm-lock.yaml` present |
| Package manager | `pnpm` |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI foundation | shadcn/ui foundation installed (`components.json`, `src/components/ui/button.tsx`) |
| Theme foundation | `next-themes` installed |
| Linting | ESLint configured |
| Local app | Confirmed responding on `localhost:3000` during bootstrap validation |

## Current implementation status

Slice 1 of `catalog-products` is implemented and committed.

| Area | Status |
| --- | --- |
| Data foundation | Implemented with local mock catalog data under `src/lib/catalog/` |
| Product cards/grid | Implemented under `src/components/catalog/` |
| Empty catalog state | Implemented under `src/components/catalog/` |
| `/catalogo` | Implemented with mock filters |
| `/productos/[slug]` | Implemented with mock detail data |
| Navigation to `/catalogo` | Implemented from current navigation/home surfaces |
| Slice 2 Prisma schema | Pending |
| Slice 2 product seed | Pending |

Recent commit evidence:

- `d8bcf7b` `fix(catalog): update remaining home catalog links`
- `69e39f4` `feat(catalog): wire catalog navigation`
- `ccf0f3e` `feat(catalog): add product detail mock page`
- `007f68a` `feat(catalog): add catalog page with mock filters`
- `4ceae80` `feat(catalog): add product card grid components`

## Explicitly not present yet

- No `prisma/` directory.
- No `src/app/api/` directory.
- No real cart.
- No checkout.
- No Mercado Pago integration.
- No admin surface.
- No automated tests for the catalog slice.

## Frontend foundation

The project currently includes:

- Next.js App Router under `src/app/`.
- TypeScript configuration with `@/*` mapped to `./src/*`.
- Tailwind CSS through `@tailwindcss/postcss`.
- shadcn/ui design system foundation with `components.json` and a Button primitive.
- `next-themes` installed for theme support.
- Design system foundation already in use by the current UI.
- ESLint with Next.js core web vitals and TypeScript config.
- pnpm 11 package manager metadata in `package.json`.
- `pnpm-workspace.yaml` with explicit approved dependency build scripts for `sharp` and `unrs-resolver`.

## Current non-documentation files

`.gga` exists and configures Gentleman Guardian Angel review settings.

Notable current values:

- `PROVIDER="claude"`
- `FILE_PATTERNS="*.ts,*.tsx,*.js,*.jsx"`
- `EXCLUDE_PATTERNS` excludes common test and declaration files.
- `RULES_FILE="AGENTS.md"`
- `STRICT_MODE="true"`

`.env.example` exists as a safe template for future environment variables and is intentionally allowed in `.gitignore`.

## Cleanup completed

The temporary bootstrap folders were removed because they were local installation/cache artifacts, not project source:

- `.corepack/`
- `.pnpm-home/`
- `.tmp/`
- `.home/`

They are also ignored in Git to prevent future accidental commits.

## Documentation created before bootstrap

- Workspace audit
- Project plan
- Architecture decisions
- Environment strategy
- Testing strategy
- Environment variable template
- Proposed sitemap
- Proposed user flows
- Proposed folder structure
- Project vision
- Catalog design
- UI roadmap
- Design system
- Brand guide
- Content strategy

## Guardrails

The project is still intentionally UI-first. Do not add yet:

- TanStack Query
- React Hook Form
- Zod
- Prisma schema or migrations before Slice 2 is started
- Supabase
- Auth
- API routes before the public read API slice
- Real cart behavior before the cart slice
- Checkout/order persistence
- Mercado Pago integration
- Admin surfaces

Next implementation step for `catalog-products` is Slice 2: Prisma schema plus product seed.
