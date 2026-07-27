# Apply Progress: Catalog Products

## Cumulative Completed Tasks

- [x] 1.1 Create local catalog types, mock data, and query helpers.
- [x] 1.2 Create the catalog route and browsing components.
- [x] 1.3 Create the product detail route and detail components.
- [x] 1.4 Update catalog navigation.
- [x] 2A.3 Add local PostgreSQL infrastructure and apply the initial migration.
- [x] 2B Add the repeatable product seed and fixture validation.
- [x] 3A Add the Prisma singleton and public catalog contracts.
- [x] 3E Add the featured-products endpoint and public API hardening.
- [x] 4.1 Replace the home featured-products fixture read with `GET /api/catalog/featured-products`.

## Work Unit Evidence: 3E

| Evidence | Result |
|---|---|
| Focused validation | `pnpm.cmd lint` and `.\\node_modules\\.bin\\tsc.CMD --noEmit --incremental false` both exited `0`. No test runner is configured. |
| Runtime harness | Existing local Next development server at `http://localhost:3000`: `GET /api/catalog/featured-products` returned `200` with four card summaries; `?limit=2` returned `200` with two card summaries; `?limit=0` returned the stable `400 INVALID_CATALOG_QUERY` body. `GET /api/catalog/products?limit=0` also returned stable `400 INVALID_CATALOG_QUERY`. |
| Rollback boundary | Revert `src/app/api/catalog/featured-products/route.ts`, `src/lib/catalog/public-route-errors.ts`, and the catalog route error-boundary edits only; no repository, schema, seed, or UI behavior is coupled to this unit. |

## Work Unit Evidence: 4A

| Evidence | Result |
|---|---|
| Focused validation | `pnpm.cmd lint` exited `0`; `.\\node_modules\\.bin\\tsc.CMD --noEmit --incremental false` exited `0`. There is no test runner. |
| Runtime harness | Local Next dev server: `GET /api/catalog/featured-products` returned `200` with four public card summaries, including product slugs, ARS prices, compare-at prices, categories, and brands. `GET /` returned `200` and the client-rendered home section exposed its loading label. `GET /api/catalog/featured-products?limit=0` returned the stable `400 INVALID_CATALOG_QUERY` error. |
| Rollback boundary | Revert `src/components/home/featured-products.tsx` to restore the local fixture rendering; no API, schema, seed, cart, checkout, auth, or admin behavior is coupled to this work unit. |

## Deviations

None. The home section consumes the public browser endpoint instead of an internal server-side self-fetch, avoiding Next.js deployment-origin coupling while retaining a visible loading and error state.

## Remaining Work

10 of 36 tasks remain in `tasks.md`, beginning with Work Unit 4B. This work unit does not implement catalog/detail API reads, cart, checkout, payments, authentication, or admin behavior.
