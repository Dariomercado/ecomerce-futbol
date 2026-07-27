# Architecture decisions

This document records current technical decisions and their tradeoffs.

## ADR-001 - UI-first architecture

Decision: start with documentation, information architecture, UX/UI, and mock data before backend infrastructure.

Why:

- Ecommerce projects fail fast when checkout, catalog, and admin complexity are added before the customer journey is clear.
- Mock data lets the UI reveal missing business rules earlier.
- Backend choices should serve validated flows, not drive them.

Tradeoff:

- Real persistence comes later.
- Some frontend code may need refactoring once the domain model is finalized.

## ADR-002 - Use `pnpm`

Decision: use `pnpm` as the project package manager.

Rules:

- Do not use `npm install`.
- Do not use `npx` unless there is a specific justification.
- Future setup commands should use `pnpm` and `pnpm dlx` only when appropriate.

Why:

- Faster installs.
- Deterministic workspace-friendly dependency management.
- Clear project convention from day one.

## ADR-003 - Mock data before database models

Decision: catalog-products Slice 1 uses local mock fixtures before adding Prisma models or API routes.

Implemented in Slice 1:

- Catalog data foundation under `src/lib/catalog/`.
- `ProductCard`, `ProductGrid`, and `CatalogEmptyState` under `src/components/catalog/`.
- `/catalogo` page with mock filters.
- `/productos/[slug]` mock product detail page.
- Navigation toward `/catalogo`.

Why:

- The first risk is product experience, not persistence.
- Mock fixtures make product cards, filters, empty states, and detail pages usable without infrastructure.
- The UI can expose missing domain rules before the database shape is locked.

Tradeoff:

- Slice 2 must still add the Prisma schema and product seed.
- Slice 3 must still add public read APIs before the UI becomes data-backed.

## ADR-004 - Feature-oriented frontend structure

Decision: organize source code around user-facing features, with shared UI primitives separated from domain flows.

Current and proposed structure:

```text
src/
  app/
    catalogo/
    productos/[slug]/
  components/
    ui/
    layout/
    catalog/
  lib/
    catalog/
```

Future slices can still introduce additional feature boundaries when cart, checkout, and admin become real flows.

Why:

- Keeps catalog, cart, and checkout concerns isolated.
- Avoids dumping all components into one generic folder.
- Supports gradual migration from mocks to real services.

## ADR-005 - Slice 1 deferred backend integrations

Decision: Prisma, API routes, Supabase, Auth, Mercado Pago, checkout persistence, real cart behavior, and admin surfaces are not part of Slice 1.

That boundary enabled incremental delivery. The current state has advanced:

- Prisma, local PostgreSQL, the catalog migration and seed are implemented.
- Read-only public catalog APIs exist under `/api/catalog/*`.
- Real cart, checkout, Mercado Pago, Supabase Auth, admin, and automated tests
  remain pending.

Why:

- They introduce irreversible decisions too early.
- The project needs validated UX, flows, and product assumptions first.
- Slice 2 is the correct boundary for Prisma schema and product seed.

## ADR-006 - Use shadcn/ui and next-themes foundation

Decision: the project now has the shadcn/ui foundation and `next-themes` installed, and the UI is already using a design system foundation.

Current evidence:

- `components.json` is present.
- `src/components/ui/button.tsx` is present.
- `next-themes` is listed in project dependencies.
- Supporting utility dependencies for the component foundation are present.

Why:

- Shared UI primitives keep catalog screens consistent.
- Theme support is foundational UI infrastructure, not backend scope.
- This keeps future catalog, cart, checkout, and admin screens aligned visually.

Tradeoff:

- New primitives should be added only when a real screen needs them.
- Design system expansion should stay tied to product slices, not speculative component inventory.

## ADR-007 - Use local PostgreSQL for the catalog persistence foundation

Decision: Work Unit 2A.3 uses a local PostgreSQL service through Docker Compose before adding seed data, API routes, cart, checkout, or admin flows.

Current configuration:

- Docker image: `postgres:16-alpine`.
- Compose service: `postgres`.
- Database: `ecomerce_futbol`.
- User: `ecomerce_futbol`.
- Local development password: `ecomerce_futbol_password`.
- Host port: `5432`.
- Persistent volume: `postgres_data`.
- Healthcheck: `pg_isready`.
- Local `DATABASE_URL` template is documented in `.env.example`.

Why:

- The catalog schema needs a real PostgreSQL target before seed and public read APIs are added.
- Docker Compose keeps the local persistence dependency explicit and reproducible.
- The initial migration should be generated and reviewed independently from seed data and application routes once PostgreSQL is reachable.

Tradeoff:

- Local migration application depends on Docker daemon access.
- No seed, API routes, UI changes, cart, checkout, or admin behavior is included in this work unit.

## ADR-008 - Separate identity from commercial data and authorization

Decision:

- Use Supabase for authentication only.
- Keep Prisma + PostgreSQL as the authoritative data layer for catalog, cart,
  orders, and other commercial records.
- Allow checkout without authentication. Customer accounts are optional, and an
  order may contain a nullable reference to an authenticated Supabase user.
- Require Supabase authentication for administrative access, followed by a
  separate application authorization check.

Why:

- Guest checkout avoids making account creation a purchase barrier.
- Optional identity still allows future order history and returning-customer
  features.
- Keeping commercial data in one Prisma/PostgreSQL boundary avoids splitting
  domain ownership between Supabase and the existing persistence layer.
- Authentication answers who the user is; authorization answers what that user
  may do. A valid session alone must never grant admin privileges.

Tradeoff:

- Orders must support both guest contact data and an optional external user ID.
- The authentication slice must define session handling and the admin
  authorization policy before the admin slice begins.
- Supabase credentials and dependencies remain deferred until the authentication
  work unit; this ADR does not configure them.
