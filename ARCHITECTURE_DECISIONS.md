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

## ADR-005 - Backend integrations are deferred

Decision: Prisma, API routes, Supabase, Auth, Mercado Pago, checkout persistence, real cart behavior, and admin surfaces are not part of Slice 1.

Current absence is intentional:

- No `prisma/` directory yet.
- No `src/app/api/` directory yet.
- No real cart yet.
- No checkout yet.
- No Mercado Pago integration yet.
- No admin surface yet.
- No automated tests yet.

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
