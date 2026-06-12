# Project state

This file records the real workspace state after the frontend bootstrap cleanup.

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
| Linting | ESLint |
| Local app | Confirmed responding on `localhost:3000` during bootstrap validation |

## Current non-documentation files

`.gga` exists and configures Gentleman Guardian Angel review settings.

Notable current values:

- `PROVIDER="claude"`
- `FILE_PATTERNS="*.ts,*.tsx,*.js,*.jsx"`
- `EXCLUDE_PATTERNS` excludes common test and declaration files.
- `RULES_FILE="AGENTS.md"`
- `STRICT_MODE="true"`

`.env.example` exists as a safe template for future environment variables and is intentionally allowed in `.gitignore`.

## Frontend foundation

The project currently includes:

- Next.js App Router under `src/app/`
- TypeScript configuration with `@/*` mapped to `./src/*`
- Tailwind CSS through `@tailwindcss/postcss`
- ESLint with Next.js core web vitals and TypeScript config
- pnpm 11 package manager metadata in `package.json`
- `pnpm-workspace.yaml` with explicit approved dependency build scripts for `sharp` and `unrs-resolver`

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

The project is intentionally not starting from backend infrastructure.

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

Do not customize the generated app UI until the bootstrap foundation is clean and committed.