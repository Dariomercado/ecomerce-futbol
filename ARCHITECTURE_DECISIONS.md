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

Decision: first catalog data should live as local mock fixtures.

Why:

- The first risk is product experience, not persistence.
- Mock fixtures make product cards, filters, empty states, and detail pages testable without infrastructure.

Initial mock domains:

- Products
- Categories
- Brands/clubs
- Sizes
- Prices
- Stock labels
- Promotional badges

## ADR-004 - Feature-oriented frontend structure

Decision: organize future source code around user-facing features, with shared UI primitives separated from domain flows.

Proposed structure:

```text
src/
  app/
  components/
    ui/
    layout/
    product/
  features/
    catalog/
    cart/
    checkout/
  mocks/
  types/
  lib/
```

Why:

- Keeps catalog, cart, and checkout concerns isolated.
- Avoids dumping all components into one generic folder.
- Supports gradual migration from mocks to real services.

## ADR-005 - Backend integrations are deferred

Decision: Prisma, Supabase, Auth, Mercado Pago, and migrations are not part of the first delivery.

Why:

- They introduce irreversible decisions too early.
- The project needs validated UX, flows, and product assumptions first.

