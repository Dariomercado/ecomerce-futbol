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
- [x] 4.2 Replace local catalog/detail reads with public catalog data.
- [x] 4.3 Verify API-backed catalog/detail scenarios.

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

## Work Unit Evidence: 4B

| Evidence | Result |
|---|---|
| Focused validation | Final verifier: `pnpm.cmd lint` exit `0`; `.\\node_modules\\.bin\\tsc.CMD --noEmit --incremental false` exit `0`; `git diff --check` exit `0`. No test runner is configured. Fresh bound snapshot: `node node_modules\\next\\dist\\bin\\next dev -p 3109 --webpack`; 13/13 SHA-256 match, binding `d5b7d9ecec6cd1759ca9e281c6d40a96667bdcfa62d338a213e9c4e5e50208f4`. Exact candidate: 400 lines (186 additions, 214 deletions). |
| Runtime harness | Hydrated Chrome/CDP at `http://localhost:3109`: filter transition `/catalogo` -> `?category=botines` showed zero prior results under the new URL, then exactly terreno/control products; intercepted pagination metadata `total=25,totalPages=3` produced next/previous links preserving `category=botines`, `brand=arena-control`, `featured=true`, changing only `page`. Prior current-candidate runtime verified API filters/empty, detail success/404, sale prices `112000`/`132000`, primary gallery, and variant click `112000->115000`. |
| Rollback boundary | Revert 4B catalog/detail pages and presentation components only; no endpoint, schema, seed, cart, checkout, auth, or admin changes. |

## Deviations

Catalog uses client Route Handler fetches for interactive states; the detail Server Component invokes the public detail Route Handler in-process and maps its `404` to `notFound()`.

## Remaining Work

8 of 36 tasks remain, beginning with Slice 5 cart.
