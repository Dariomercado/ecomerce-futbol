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
- [x] 5.1 Add cart types/state under `src/lib/cart/` for product and variant selections.
- [x] 5.2 Add cart UI, `/carrito`, and real cart behavior for `MockCartCTA`.
- [x] 5.3 Carry selected-variant stock into cart lines and prevent add/increment operations from exceeding that bound.
- [x] 6.1 Add guest checkout contact/shipping and a server-verified local pending-order boundary without auth.

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

## Work Unit Evidence: 5

| Evidence | Result |
|---|---|
| Focused validation | `pnpm.cmd lint` exited `0`; `.\\node_modules\\.bin\\tsc.CMD --noEmit --incremental false` exited `0`; `git diff --check` exited `0`. No automated test runner is configured. |
| Runtime harness | Manual browser scenario on the existing localhost app: selected an active product variant, added it to cart, increased quantity, used `Quitar`, and confirmed the full cart line was removed and the cart became empty. Repeated add/increase and reloaded the browser; the in-memory cart reset to empty. `cart-content.tsx` independently confirms decrement (`setQuantity(quantity - 1)`) is distinct from full-line removal (`removeItem(lineId)`). |
| Rollback boundary | Revert `src/lib/cart/`, `src/components/cart/`, `src/app/carrito/page.tsx`, and the cart-provider/CTA/header wiring in `src/app/layout.tsx`, `src/components/layout/header.tsx`, `src/components/catalog/mock-cart-cta.tsx`, and `src/components/catalog/product-detail-api-content.tsx`; no persistence, checkout, payment, auth, API, or catalog data behavior is coupled to this unit. |

## Work Unit Evidence: 5.3

| Evidence | Result |
|---|---|
| Canonical path proof | The 5.3 delta is the `stock` field on cart selection/item contracts; bounded pure add/set-quantity transitions and provider delegation; at-stock increment disabled behavior; and selected-variant stock handoff from the CTA. It is implemented within `src/lib/cart/types.ts`, `src/lib/cart/cart-state.ts`, `src/lib/cart/cart-provider.tsx`, `src/components/cart/cart-content.tsx`, and `src/components/catalog/mock-cart-cta.tsx`. |
| Prior focused validation | `pnpm.cmd lint` exit `0` (stdout SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, stderr `ebfee82d478f07b1e725885398b7046100b7b6a51ffc6438f52db8dc0230ea78`); `.\\node_modules\\.bin\\tsc.CMD --noEmit --incremental false` exit `0` (stdout/stderr SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`); `git diff --check` exit `0` (stdout `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, stderr `a630170082c8eabd402e766c7b217aa3fbde96a2315c461f0f010611fde01ac1`). Casing warnings: `0`. |
| Prior production build | `node node_modules/next/dist/bin/next build --webpack` exit `0`; build ID `jaU6qM_bm-BmQEX2LYwaM`; stdout SHA-256 `c8824a634154c063ab9e94e75b4bcb1609c0b77815e511615f1a479b44019948`, stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Relevant cart sources predate `.next/BUILD_ID`. |
| Runtime matrix | `node %TEMP%\\ecomerce-futbol-cart-5-3-final\\cart-runtime-matrix.cjs C:\\Users\\DARIO-PC\\Desktop\\ecomerce-futbol %TEMP%\\ecomerce-futbol-cart-5-3-final\\runtime-out` exit `0`; ports Next `3131` and CDP `9341`; a-i all PASS; `allPass:true`; console errors `0`; E56 `0`; static failures `0`. Assertion d proves one line, quantity `2`, header `Carrito (2)`, and a quantity-coherent doubled total. Raw SHA-256: harness `3a473a1c58239cf0cca1ea39edb56d363aac558d21da58fed6c977d31f59efaf`; wrapper stdout `315430bb4b0f114dabd7ff4df255be3ef1cb43eec84aa3f23352711235aa71b8`; wrapper stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; Next stdout `84e53d702ded3b70e22a46ab97e3e529805fe9502d3e7ab7b1ac17cf31f681d1`; Next stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; report `34ea4689af2beba779ec897127a06b00c8b5ad74674217ffc34bdaa645003140`. Report: `%TEMP%\\ecomerce-futbol-cart-5-3-final\\runtime-out\\cart-runtime-matrix.json`. |
| Network note | Four `Network.loadingFailed` events reappeared, each non-static `canceled:true` with `net::ERR_ABORTED` during navigation; they are retained as observed rather than hidden. |
| Rollback boundary | Revert only the 5.3 delta: stock fields on cart selection/item, bounded transition/helper and provider delegation, the at-stock disabled cap, and CTA stock handoff. Preserve the five files and their 5.1/5.2 cart types, line operations, UI, route, and baseline add behavior. |


## Deviations

Catalog uses client Route Handler fetches for interactive states; the detail Server Component invokes the public detail Route Handler in-process and maps its `404` to `notFound()`.

## Remaining Work

5 of 37 tasks remain. Phase 6 is in progress: 6.1 is complete and 6.2 Mercado Pago remains pending.

## Work Unit Evidence: 6.1

| Evidence | Result |
|---|---|
| Focused validation | `pnpm.cmd lint`, `.\node_modules\.bin\tsc.CMD --noEmit --incremental false`, and `git diff --check` each exited `0`. No automated test runner is configured. |
| Runtime harness | Existing local Next server at `http://127.0.0.1:3000`: `POST /api/checkout/orders` with valid guest contact/shipping data and no lines returned `400 INVALID_CHECKOUT` with `At least one item is required.` The checkout route returned `200`. This verifies the unauthenticated API boundary parses guest input and rejects an invalid order before commercial lookup. |
| Rollback boundary | Revert `src/app/checkout/`, `src/app/api/checkout/`, `src/lib/checkout/`, and the checkout link/copy in `src/components/cart/cart-content.tsx`; this removes guest checkout boundary behavior without touching cart state, catalog APIs, auth, persistence, or payments. |
## Work Unit Evidence: 6.1 Corrective Reconciliation (v2)

| Evidence | Result |
|---|---|
| Planning contract | Guest contact/shipping, a nullable unauthenticated user reference, trusted server-side catalog totals, and local pending confirmation are in scope. Payment processing remains deferred. |
| Corrected behaviors | Runtime JSON shape validation; duplicate-line aggregation before stock validation; sanitized route failures; safe quantities and total arithmetic; stable unavailable-catalog 400 contract; and shopper-visible fetch/JSON recovery are covered by the v2 focused harness. |
| Authored delta | 295 additions, 53 deletions, 348 total |
| Focused validation | Direct installed ESLint, TypeScript no-emit, `git diff --check`, and the focused v2 correction harness are recorded in the v2 controls directory. |
| Rollback boundary | Revert only the Slice 6.1 checkout route, page, contracts, service, cart checkout link, and its planning/progress documentation. Catalog, cart state, payment, persistence, authentication, and admin boundaries remain unaffected. |
