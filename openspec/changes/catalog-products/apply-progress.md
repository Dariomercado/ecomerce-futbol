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

## Current Reconciled State (post-6.2B)

This section is the current checkpoint. Earlier work-unit counts and routing
notes remain below as historical evidence and are not the current change state.

| Area | Current state |
|---|---|
| 6.2A | Complete |
| 6.2B | Complete and RDD `APPROVED`; commit `18100af`; receipt `sha256:f3e64bea8a2ae06fe8b01f952ee528258ecf5e22b80fdcb402865b97c7da8173` |
| Bridge | Complete |
| 6.2C | Pending: tasks 6.2C.1-6.2C.4 |
| 6.2D | Pending: tasks 6.2D.1-6.2D.3 |
| Global change | 13/20 tasks complete; `next: apply` routes the remaining future work |

The seven remaining tasks are exactly 6.2C.1, 6.2C.2, 6.2C.3, 6.2C.4,
6.2D.1, 6.2D.2, and 6.2D.3. No new implementation or evidence is implied by
this reconciliation.

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

## Historical Remaining Work (pre-6.2)

The following count is retained as historical evidence from before the payment
work and is superseded by the current reconciled state above.

5 of 37 tasks remained at that earlier checkpoint; Phase 6 and its payment work
were not yet recorded there.

## Work Unit Evidence: 6.1

| Evidence | Result |
|---|---|
| Focused validation | `pnpm.cmd lint`, `.\node_modules\.bin\tsc.CMD --noEmit --incremental false`, and `git diff --check` each exited `0`. No automated test runner is configured. |
| Runtime harness | Existing local Next server at `http://127.0.0.1:3000`: `POST /api/checkout/orders` with valid guest contact/shipping data and no lines returned `400 INVALID_CHECKOUT` with `At least one item is required.` The checkout route returned `200`. This verifies the unauthenticated API boundary parses guest input and rejects an invalid order before commercial lookup. |
| Rollback boundary | Revert `src/app/checkout/`, `src/app/api/checkout/`, `src/lib/checkout/`, and the checkout link/copy in `src/components/cart/cart-content.tsx`; this removes guest checkout boundary behavior without touching cart state, catalog APIs, auth, persistence, or payments. |

## Historical Remaining Work (pre-6.2B)

The following blocked note predates the completed 6.2A, 6.2B, and Bridge work.
It remains as historical planning evidence, not as the current implementation
status.
## Work Unit Evidence: 6.1 Corrective Reconciliation

| Evidence | Result |
|---|---|
| Planning contract | Proposal, design, and cart spec now authorize only guest contact/shipping, nullable unauthenticated user reference, trusted server-side catalog totals, and a local pending confirmation. Mercado Pago/payment processing remains deferred to 6.2. |
| Authored delta | 218 additions + 18 deletions = 236 authored changed lines. |
| Focused validation | `pnpm.cmd lint`, `.\node_modules\.bin\tsc.CMD --noEmit --incremental false`, and `git diff --check` each exited `0`. No automated test runner is configured. |
| Runtime harness | Existing local Next server: a guest request with a tampered client `total: 1` and one eligible active catalog variant returned `201`; the server returned `userId: null` and catalog-derived total `18000`. Empty lines returned `400 INVALID_CHECKOUT` with `At least one item is required.` |
| Rollback boundary | Revert only `src/app/checkout/`, `src/app/api/checkout/`, `src/lib/checkout/`, the checkout link in `src/components/cart/cart-content.tsx`, and the 6.1 planning/progress edits. This leaves cart state, catalog APIs, payments, auth, persistence, and unrelated work untouched. |
## Blocked Work Unit: 6.2 Mercado Pago boundaries

**Status**: blocked before implementation. The active proposal, design, and cart delta spec explicitly defer Mercado Pago/payment configuration, webhooks, payment UI, and payment processing; task 6.2 names only `src/lib/payments/*` plus totals/failure recovery. No approved payment configuration or contract defines the Orders API endpoint/version, SDK-versus-HTTP adapter decision, environment variable names, order payload and response mapping, idempotency-key lifetime/storage, redirect/callback behavior, or the authoritative payment failure/recovery and webhook scope. Implementing any of those would invent requirements and could create an insecure or incompatible integration.

### Work Unit Evidence: 6.2

| Evidence | Result |
|---|---|
| Focused validation | N/A Ã¢â‚¬â€ no implementation was authorized because the planning contract is incomplete. |
| Runtime harness | N/A Ã¢â‚¬â€ no Mercado Pago boundary or route may be exercised without approved configuration and an adapter contract. |
| Rollback boundary | No source changes were made. Revert this blocked-status entry only if a superseding approved payment plan is persisted. |

## Required Planning Input

- Approved Mercado Pago Orders API boundary: request/response mapping, idempotency policy, payment-status mapping, callback/redirect contract, and whether webhooks are in scope.
- Approved server configuration contract: required environment variable names and validation behavior, without credentials in repository artifacts.
- Failure-recovery scenarios that preserve server-authoritative catalog totals and define retry behavior.

## Work Unit Evidence: 6.2B

### Completed Tasks
- [x] 6.2B.1 Rail/flag/redaction, terminal correlation, and monotonic authoritative-state RED tests.
- [x] 6.2B.2 Closed payment contracts, safe configuration, and state-machine implementation.
- [x] 6.2B.3 UUID/CAS replay, crash/timeout, and reservation-release/retain RED tests.
- [x] 6.2B.4 Orders gateway and replay-safe payment service implementation.

### TDD Cycle Evidence
| Task pair | RED | GREEN | REFACTOR |
|---|---|---|---|
| 6.2B.1-6.2B.2 | `vitest run src/lib/payments/state-machine.test.ts --reporter=verbose` exited `1`: one suite failed before collection because `./state-machine` did not exist. | The same focused test exited `0`: 1 file, 4 tests passed. | Broadened the rail input boundary to reject non-card types at runtime and narrowed provider state input to only the fields the state machine consumes. |
| 6.2B.3-6.2B.4 | `vitest run src/lib/payments/service.test.ts --reporter=verbose` exited `1`: one suite failed before collection because `./mercado-pago-orders-gateway` did not exist. | `vitest run src/lib/payments/state-machine.test.ts src/lib/payments/service.test.ts --reporter=verbose` exited `0`: 2 files, 7 tests passed. | Simplified invalid-UUID terminal construction without changing its closed safe-error shape. |

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm.cmd test:checkout` exited `0`: 3 files, 12 tests passed; final output SHA-256 `1ffeddae663ef9edc80d3d6f618e4b82abf0a88ecbc6960b974eacd7ecd2c109`. The service fake is the provider timeout/crash runtime harness: it proves one dispatch per UUID intent, retained reservation for timeout/interrupted dispatch, and one release for terminal rejection. |
| Static validation | `pnpm.cmd typecheck` exited `0` (SHA-256 `fcae678695f33c34ad80efce73aba910734cb7085566fc9795bcbfd2d3fa1899`); `pnpm.cmd lint` exited `0` (SHA-256 `3e2632774c9d0c68d506c980cd23ebd9e11f2c13942bf15e397b7e8f548933a5`); `git diff --check` exited `0` (SHA-256 `c872d18cb6f7273fbbe1654e515c778025c3c7fa48e79673ce40ed201d00dd04`). |
| Provider evidence | Mercado Pago MCP documentation search succeeded for Checkout API Orders (MLB), plus official API reference fallback/confirmation: `https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/create-order/post`, `https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/get-order/get`, and `https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/payment-integration/cards`. It confirms `POST /v1/orders`, `X-Idempotency-Key`, online cards, `processing_mode: automatic`, and `capture_mode: automatic`; no provider operation or credential was used. |
| Rollback boundary | Revert `src/lib/payments/`, the two payment tests, and the 6.2B extension to `test:checkout`; this removes provider-core behavior without touching 6.2A persistence, 6.2C HTTP/webhook, or 6.2D UI. |

### Preservation Proof
All pre-existing non-6.2B source and planning hashes matched after implementation. In particular, `.env.example`, `prisma/schema.prisma`, `src/app/api/checkout/orders/route.ts`, `src/app/checkout/page.tsx`, `src/components/cart/cart-content.tsx`, `src/lib/checkout/contracts.ts`, and `src/lib/checkout/guest-order-service.ts` are byte-identical to the preservation baseline. `package.json` changed only to include the two 6.2B test files in `test:checkout`.

### Deviations
None. The implementation uses a fetch-injected Orders adapter rather than a live SDK call so tests remain deterministic and no credentials are needed. The real submit/status routes, authoritative `Order.get` replay reconciliation, webhooks, and UI remain intentionally deferred to 6.2C/6.2D.

### Routing
Historical routing recorded 9 Slice 6.2 tasks remaining and recommended
`sdd-apply` for 6.2C. The current global ledger is 13/20 complete with the
seven 6.2C/6.2D tasks listed in the current reconciled state above.

## Work Unit Evidence: 6.2B Corrective Rerun

### Corrective RED/GREEN/REFACTOR Evidence
| Phase | Command and result | Reproducibility evidence |
|---|---|---|
| RED | `node_modules\\.bin\\vitest.cmd run src/lib/payments/state-machine.test.ts src/lib/payments/service.test.ts --reporter=verbose` exited `1`: 2 files, 5 failed and 3 passed. Failures proved missing payment-level accredited state, missing equal-time lookup/alert, absent replay fingerprint rejection, non-atomic reservation methods, and absent payment-level gateway mapping. | stdout SHA-256 `3677fb5b97f071f208b9e4b21d45bf705ec2013582dac4490eb8e353434d119d`; stderr SHA-256 `4ce1aed953f66e04d1092467a8a713f20394eed32bacfff28e84e2186c1225c2`; raw output: `%TEMP%\\catalog-products-6-2b-corrective-red.stdout.txt`, `%TEMP%\\catalog-products-6-2b-corrective-red.stderr.txt`. |
| GREEN | Same command exited `0`: 2 files, 8 tests passed. | stdout SHA-256 `4c0eff8283d8c6369c8e1d80abc82b85633d27db0cab16ab9f5383b418f98f71`; stderr SHA-256 `11dc7b65d66a0cb9c7aae9ff3e2f574075d95fa5cdd5552a96ff3320ff676461`; raw output: `%TEMP%\\catalog-products-6-2b-corrective-green.stdout.txt`, `%TEMP%\\catalog-products-6-2b-corrective-green.stderr.txt`. |
| REFACTOR | Replaced top-level-only state mapping with a closed order-plus-payment evidence model, a transition outcome for equal-timestamp conflicts, and a SHA-256 immutable submission fingerprint. | Existing terminal results remain correlated and browser evidence is not accepted by the service. |

### Corrective Behavior
- Payment is paid only when both authoritative order and payment evidence are `processed/accredited` and strictly newer.
- `FAILED` and `PAID` are absorbing states; equal-timestamp conflicting evidence returns `lookup_and_alert` with `EQUAL_TIMESTAMP_CONFLICT` for the later authoritative `Order.get` path.
- Attempt creation persists the exact SHA-256 submission fingerprint. Exact replay reuses the winning attempt; changed input under the same `(orderId,intentId)` fails safe with `contact_support` and never dispatches again.
- A unique-create conflict reloads the winner, so concurrent callers do not create a second provider request. `markPaidAndConsume` and `markFailedAndRelease` are the durable atomic repository boundary: timeout retains, failure releases once, and failed replay remains non-payable.

### Provider Evidence
- Callable tool: `mcp__mercadopago__search_documentation` (Checkout API Orders documentation search, no provider operation or credential use).
- Official URLs: `https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/create-order/post`; `https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/get-order/get`; `https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/payment-integration/cards`.
- These sources support `POST /v1/orders`, `X-Idempotency-Key`, online card Orders, automatic processing/capture, order retrieval, and payment transaction status/detail fields. Local payment-level mapping remains conservative: it requires both order and corresponding payment `processed/accredited`.

### Final Validation
| Command | Result |
|---|---|
| `pnpm.cmd test:checkout` | exit `0`, 3 files, 13 tests passed; SHA-256 `8d3e6bb63d6873d5af85d94b36d72fb9d7cddb5b15280d062e1a2bd89835c35b`. |
| `pnpm.cmd typecheck` | exit `0`; SHA-256 `fcae678695f33c34ad80efce73aba910734cb7085566fc9795bcbfd2d3fa1899`. |
| `pnpm.cmd lint` | exit `0`; SHA-256 `3e2632774c9d0c68d506c980cd23ebd9e11f2c13942bf15e397b7e8f548933a5`. |
| `git diff --check` | exit `0`; SHA-256 `c872d18cb6f7273fbbe1654e515c778025c3c7fa48e79673ce40ed201d00dd04`. |

### Corrective Preservation Proof
- Baseline: `%TEMP%\\catalog-products-6-2b-corrective-preservation-baseline.tsv`; 114 paths; SHA-256 `06d2ac5440f780326908d182e92dd5166aba74443ddc0338cea252a85fc3d267`.
- After manifest: `%TEMP%\\catalog-products-6-2b-corrective-preservation-after.tsv`; 114 paths; SHA-256 `06d2ac5440f780326908d182e92dd5166aba74443ddc0338cea252a85fc3d267`; `DIFF_ROWS=0`.
- Allowed path set: `src/lib/payments/**`, `package.json`, `openspec/changes/catalog-products/tasks.md`, `openspec/changes/catalog-products/apply-progress.md`, and (not used) `src/lib/checkout/order-repository.ts`.

```json
{
  "schema": "gentle-ai.sdd-apply-result/v1",
  "status": "success",
  "executive_summary": "Corrected payment authority, monotonicity, replay integrity, concurrent CAS handling, and durable reservation transition boundaries for 6.2B.",
  "artifacts": ["src/lib/payments/contracts.ts", "src/lib/payments/state-machine.ts", "src/lib/payments/service.ts", "src/lib/payments/mercado-pago-orders-gateway.ts", "src/lib/payments/state-machine.test.ts", "src/lib/payments/service.test.ts"],
  "next_recommended": "sdd-apply",
  "risks": ["Order.get lookup and alert execution belongs to 6.2C reconciliation; 6.2B returns its required lookup-and-alert outcome without calling a provider."],
  "skill_resolution": "paths-injected"
}
```

## Work Unit Evidence: 6.2B Safe Redaction Correction

### RED/GREEN/REFACTOR
| Phase | Result | Evidence |
|---|---|---|
| RED | `node_modules\\.bin\\vitest.cmd run src/lib/payments/state-machine.test.ts --reporter=verbose` exited `1`: 1 file, 1 failed / 5 passed. The failing assertion showed raw `pan`, `cvv`, `cvc`, `security_code`, nested `Cvv`, and nested `securityCode` values in the redacted output. | stdout SHA-256 `c9198ee27822cbead880b61966a57fcde1f356e2feeb24ad8aad77594cd26f2c`; stderr SHA-256 `f65140b092d82d69603e88fb6fdcec4ecccfffc4b2f24a416a86e2ca3e09e1ac`; raw files `%TEMP%\\catalog-products-6-2b-redaction-red.stdout.txt`, `%TEMP%\\catalog-products-6-2b-redaction-red.stderr.txt`. |
| GREEN | Same command exited `0`: 1 file, 6 passed. | stdout SHA-256 `0cfe4ebdf4892ff8c7c735756a4d8d09136586fc21ab8d19fe5473dabb27132b`; stderr SHA-256 `67ed26f3dd0c1da6d32b0368b3077b3371516ff22a358ae295576ba42b677eab`; raw files `%TEMP%\\catalog-products-6-2b-redaction-green.stdout.txt`, `%TEMP%\\catalog-products-6-2b-redaction-green.stderr.txt`. |
| REFACTOR | Added a normalized sensitive-key check for PAN/CVV aliases (`pan`, `cvv`, `cvc`, `security_code` / `securityCode`) while retaining recursive object/array traversal and preserving ordinary fields such as `orderNumber`. | Smallest authorized source change: `src/lib/payments/state-machine.ts`. |

### Final Validation
| Command | Result |
|---|---|
| `pnpm.cmd test:checkout` | exit `0`, 3 files, 14 tests passed; SHA-256 `c735e391b4d19c01322e86c4d655be8d0f98998b38970f67cdd6dbc072cd1adb`. |
| `pnpm.cmd typecheck` | exit `0`; SHA-256 `fcae678695f33c34ad80efce73aba910734cb7085566fc9795bcbfd2d3fa1899`. |
| `pnpm.cmd lint` | exit `0`; SHA-256 `3e2632774c9d0c68d506c980cd23ebd9e11f2c13942bf15e397b7e8f548933a5`. |
| `git diff --check` | exit `0`; SHA-256 `c872d18cb6f7273fbbe1654e515c778025c3c7fa48e79673ce40ed201d00dd04`. |

### Preservation Proof
- Baseline: `%TEMP%\\catalog-products-6-2b-redaction-preservation-baseline.tsv`; 122 paths; SHA-256 `631a73ab89b973bd428050e8f4dd16a7a436547b3d8afed103bd117bc5cee6a7`.
- After manifest: `%TEMP%\\catalog-products-6-2b-redaction-preservation-after.tsv`; 122 paths; SHA-256 `631a73ab89b973bd428050e8f4dd16a7a436547b3d8afed103bd117bc5cee6a7`; `DIFF_ROWS=0`.
- Allowed path set: `src/lib/payments/state-machine.test.ts`, `src/lib/payments/state-machine.ts`, and `openspec/changes/catalog-products/apply-progress.md`.
- No task checkbox was changed. Routing remains `sdd-apply` for 6.2C pending a fresh gate.

```json
{
  "schema": "gentle-ai.sdd-apply-result/v1",
  "status": "success",
  "executive_summary": "Corrected recursive safe-log redaction for PAN/CVV aliases without hiding ordinary business numbers.",
  "artifacts": ["src/lib/payments/state-machine.ts", "src/lib/payments/state-machine.test.ts", "openspec/changes/catalog-products/apply-progress.md"],
  "next_recommended": "sdd-apply",
  "risks": ["Fresh gate approval is still required before 6.2C."],
  "skill_resolution": "paths-injected"
}
```

## Work Unit Evidence: 6.2A

### Completed Tasks
- [x] 6.2A.1 Payment test/dependency and environment foundation.
- [x] 6.2A.2 Schema and reservation invariant RED tests.
- [x] 6.2A.3 Durable order, attempt, and reservation Prisma migration/schema.
- [x] 6.2A.4 Capability hash and recursive raw-card rejection RED tests.
- [x] 6.2A.5 Checkout contracts, validation boundary, and atomic reservation repository.

### TDD Cycle Evidence
| Task | RED | GREEN | REFACTOR |
|---|---|---|---|
| 6.2A.2-6.2A.3 | `guest-order-service.test.ts` failed for absent schema/migration invariants. | Schema/migration added; 3 tests pass. | Added explicit reservation indexes and Serializable transaction boundary. |
| 6.2A.4-6.2A.5 | Capability/raw-card test failed because exports and recursive rejection were absent. | Contracts and service validation added; 3 tests pass. | Restored defensive 6.1 input validation and consolidated duplicate lines. |

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused test command and exact result | `.\\node_modules\\.bin\\vitest.cmd run src/lib/checkout/guest-order-service.test.ts` exited `0`: 1 file, 3 tests passed. `pnpm.cmd test:checkout` is now scoped to this foundation test. |
| Static validation | `.\\node_modules\\.bin\\tsc.cmd --noEmit --incremental false` exited `0`; ESLint over all 6.2A TypeScript files exited `0`; `git diff --check` exited `0`. |
| Runtime harness | Elevated Docker access confirmed `ecomerce-futbol-postgres` healthy; `.\\node_modules\\.bin\\prisma.cmd migrate deploy` exited `0` and applied `20260803_checkout_payments`; subsequent `prisma migrate status` exited `0` with `Database schema is up to date.` |
| Rollback boundary | Revert 6.2A-only dependencies, `.env.example` payment placeholders, Vitest setup, payment migration/schema models, checkout contract helpers, reservation repository, and test. Preserve Slice 6.1 route/page/cart edits. |

### Deviations
`test:checkout` currently targets the only implemented Slice 6.2A test. Later slices must extend it with their test files. The migration was applied successfully to the healthy local PostgreSQL container after elevated Docker access was approved.
## Work Unit Evidence: 6.2A Corrective Validation

### Corrected Tasks
- [x] 6.2A.2 RED: executable schema, migration, capability, and reservation tests now cover the previously missing cases.
- [x] 6.2A.3 GREEN/REFACTOR: migration assertions verify executable DDL and constraints, not a comment-only conditional-decrement string.
- [x] 6.2A.4 RED: raw-card validation now includes nested `card.number`, and repository tests exercise reservation outcomes.
- [x] 6.2A.5 GREEN/REFACTOR: the raw-card guard is context-aware; the repository is proven to request Serializable isolation and leave no committed order on a failed conditional decrement.

### Corrective RED/GREEN/REFACTOR Evidence
| Task pair | RED | GREEN | REFACTOR |
|---|---|---|---|
| 6.2A.2-6.2A.3 | `node_modules\\.bin\\vitest.cmd run src/lib/checkout/guest-order-service.test.ts --reporter=verbose` exited `1`: 2 failed, 3 passed. The migration test failed because its prior conditional-decrement proof could be satisfied by a SQL comment. | The same command exited `0`: 1 file, 5 passed. The test now asserts executable `CREATE TABLE`, unique-index, and foreign-key DDL and rejects a commented `UPDATE` predicate. | Removed the non-executable reservation SQL comments; schema semantics remain represented by executable DDL while runtime reservation behavior is tested through the repository. |
| 6.2A.4-6.2A.5 | The same RED command exited `1`: the nested `{ card: { number } }` payload was accepted (`null`), demonstrating a raw-card boundary gap. | The same command exited `0`: 1 file, 5 passed. Nested `card.number` is rejected before catalog access. | `rejectRawCardData` carries the parent key through objects and arrays, avoiding a broad rejection of unrelated `number` fields. |

### Repository and Reservation Evidence
| Evidence | Result |
|---|---|
| Focused executable test | `pnpm.cmd test:checkout` exited `0`: 1 file, 5 tests passed. The repository fake verifies `updateMany` requires `stock >= quantity`, successful decrement persists exactly one order, failed decrement throws `STOCK_RESERVATION_UNAVAILABLE`, and no order persists; both paths use `{ isolationLevel: "Serializable" }`. |
| Runtime/integration harness | `docker compose ps` exited `0`: `ecomerce-futbol-postgres` was healthy. `prisma migrate status` exited `0` with 2 migrations and `Database schema is up to date`; `prisma migrate deploy` exited `0` with `No pending migrations to apply`. A local Prisma transaction created a temporary catalog graph, made an insufficient-stock conditional decrement, threw `STOCK_RESERVATION_UNAVAILABLE`, and reported `{"conditionalDecrement":"failed","transaction":"Serializable","persistedProductsAfterRollback":0}`. |
| Static validation | `pnpm.cmd typecheck`, `pnpm.cmd lint`, and `git diff --check` each exited `0`. |
| Rollback boundary | Revert only `src/lib/checkout/guest-order-service.test.ts`, `src/lib/checkout/contracts.ts`, and the 6.2A migration-comment/evidence deltas. Preserve Slice 6.1 route/page/cart paths and all 6.2B+ payment-provider work. |

### Preservation Proof
- Pre/post SHA-256 hashes for `src/app/api/checkout/orders/route.ts`, `src/app/checkout/page.tsx`, and `src/components/cart/cart-content.tsx` are unchanged; the pre-existing non-6.2A status entries are unchanged.
- No branch, commit, push, PR, reset, overwrite, or reformat operation was performed.

### Corrective Deviations
- The original claim that the migration itself conditionally decremented stock was inaccurate: that behavior belongs to `reserveOrder`'s Serializable Prisma transaction. The migration now proves only executable persistence structure; the repository and local PostgreSQL harness prove reservation semantics.

## Remaining Work
5 of 26 Slice 6.2 tasks are complete: 6.2A.1-6.2A.5. Work Units 6.2B-6.2D remain pending and were not modified.

## Work Unit Evidence: 6.2A Gatekeeper Corrective Rerun

### Fresh RED/GREEN Evidence
| Phase | Command and result | Reproducibility evidence |
|---|---|---|
| RED | `node_modules\\.bin\\vitest.cmd run src/lib/checkout/guest-order-service.test.ts --reporter=verbose` exited `1`: 1 failed, 4 passed. `hashes status capabilities and rejects raw card fields before catalog access` failed at the new deep `{ card: { details: { number } } }` assertion with `expected null to be truthy`. | stdout SHA-256 `75aa7923db8a562b8da474ee61cdb20a6cde538ab0b799d7fa0123a42eb6707a`, stderr SHA-256 `dd067ae81a9e31017f47c05ccb8a144ec4de844f994a19c8b16508f43ba41925`; raw outputs: `%TEMP%\\catalog-products-6-2a-rerun-red.stdout.txt`, `%TEMP%\\catalog-products-6-2a-rerun-red.stderr.txt`. |
| GREEN | Same command exited `0`: 1 file, 5 passed. | stdout SHA-256 `f97cba7a65b1907184262e55dc9d7743b993cae136affe0c37664a1df1311157`, stderr SHA-256 `241c97388cb87c00c85069bf9a179a89bab51de2bbe84fec5182c99634cc1911`; raw outputs: `%TEMP%\\catalog-products-6-2a-rerun-green.stdout.txt`, `%TEMP%\\catalog-products-6-2a-rerun-green.stderr.txt`. |

### Corrective Behavior
- SQL structure assertions now inspect `stripSqlComments(migration)`, which removes both `--` line comments and `/* ... */` block comments before positive DDL assertions. A fixture containing only commented `CREATE TABLE` and `CREATE UNIQUE INDEX` statements is explicitly rejected.
- `rejectRawCardData` now carries card context recursively through arbitrary objects and arrays. It rejects `card.details.number` and array-nested card fields while `{ product: { details: { number: 42 } } }` remains allowed.
- `pnpm.cmd typecheck`, `pnpm.cmd lint`, and `git diff --check` each exited `0`. The first sandboxed `docker compose ps` was denied by Docker-pipe access; elevated `docker compose ps` exited `0` with PostgreSQL healthy. `prisma migrate status` exited `0` with the database up to date. The local Prisma Serializable rollback harness again reported `{"conditionalDecrement":"failed","transaction":"Serializable","persistedProductsAfterRollback":0}`.

### Preservation Proof: Gatekeeper Rerun
- Allowed correction path set: `src/lib/checkout/guest-order-service.test.ts`, `src/lib/checkout/contracts.ts`, `prisma/migrations/20260803_checkout_payments/migration.sql`, `openspec/changes/catalog-products/apply-progress.md`.
- `src/app/api/checkout/orders/route.ts`: pre/post `ecd02ae08776b39db55bea572fc70ec8f0275c33a7628c4bd612a38c1f8f02d2`.
- `src/app/checkout/page.tsx`: pre/post `cd1f93556737e486939bf5f45e4f2f959ace1d584d24307f8c68e1275dd0ba95`.
- `src/components/cart/cart-content.tsx`: pre/post `fd724d4212efcd8a06e71051f98b632bb59574d51b6ddc5a510ebff1934d11b7`.
- All three hashes matched exactly; no `src/lib/payments/*`, payment route, provider, webhook, or other 6.2B path was added.

### Routing
6.2A remains complete. 21 Slice 6.2 tasks remain (6.2B-6.2D), so the next phase is `sdd-apply` for 6.2B, not verification.


## Work Unit Evidence: Bridge Durable Compatibility

### Completed Tasks
- [x] Bridge.1 RED: behavior tests for receipt uniqueness/lease recovery, bounded reconciliation leasing, and safe provider reconciliation.
- [x] Bridge.2 GREEN: durable Prisma evidence/receipt schema and non-pruning migration.
- [x] Bridge.3 GREEN: Serializable repository receipt claim/completion, reservation transitions, and bounded lease selection.
- [x] Bridge.4 RED/GREEN: server-only Mercado Pago `GET /v1/orders/{id}` adapter and pending-safe reconciliation boundary.

### TDD Cycle Evidence
| Task pair | RED | GREEN | REFACTOR |
|---|---|---|---|
| Bridge.1-Bridge.3 | `pnpm.cmd test -- src/lib/checkout/order-repository.test.ts src/lib/payments/webhook.test.ts src/lib/payments/service.test.ts --reporter=verbose` exited `1`: 2 files/6 tests failed because receipt claim, bounded leasing, and reconciliation exports did not exist. | Same focused command exited `0`: 5 files, 20 tests passed. | Kept receipt identity composite and provider lookup separate from the transactional evidence transition. |
| Bridge.4 | The same RED command failed for absent `reconcileProviderOrder`; invalid/missing/mismatched provider evidence was not handled by the durable boundary. | Focused command exited `0`; deterministic fakes prove provider lookup precedes the repository transition and unsafe evidence stays pending. | `getOrder` parses only documented evidence fields and does not introduce cache authority. |

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm.cmd test -- src/lib/checkout/order-repository.test.ts src/lib/payments/webhook.test.ts src/lib/payments/service.test.ts --reporter=verbose` exited `0`: 5 files, 20 tests passed. |
| Full checkout tests | `pnpm.cmd test:checkout` exited `0`: 3 files, 14 tests passed. |
| Static validation | `pnpm.cmd typecheck`, `pnpm.cmd lint`, and `git diff --check` each exited `0`. |
| Runtime/migration harness | `docker compose ps` found healthy PostgreSQL. `node node_modules/prisma/build/index.js migrate deploy` initially failed because PowerShell wrote UTF-8 BOM (`42601` at byte 0); after writing BOM-free SQL and marking the no-op failed migration rolled back, deploy exited `0` and `migrate status` reported the schema up to date. The deterministic fake harness in the focused tests proves duplicate/stale receipt claiming, stable `(nextReconcileAt,id)` leases, and provider GET-before-transition without external provider calls. |
| Rollback boundary | Revert only `prisma/schema.prisma`, `prisma/migrations/20260805_checkout_reconciliation_foundation/`, `src/lib/checkout/order-repository.ts`, `src/lib/payments/{contracts,mercado-pago-orders-gateway,service}.ts`, their Bridge tests, and these SDD artifacts. After any provider dispatch, retain migration, receipts, lookup, and reconciliation until attempts are terminal. |

### Provider Source Evidence
- Mercado Pago MCP documentation tool was unavailable in this executor session. Used official primary documentation: https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/get-order/get . It documents authenticated `GET https://api.mercadopago.com/v1/orders/{id}`, `external_reference`, status fields, payments, and lookup error classes.

### Preservation Proof
- Baseline manifest: `%TEMP%\catalog-products-bridge-preservation-before.tsv`; 120 non-authorized paths; SHA-256 `AEDED8CA1F5E234AF3479591FEE39DBD9332EA6086E1924AD97EA116B9D64B8D`.
- Post-edit manifest had exactly one non-authorized discrepancy: ignored generated `tsconfig.tsbuildinfo` changed during `tsc --noEmit`; its original untracked cache was not recoverable from Git. No source, configuration, planning, or tracked non-authorized path changed. No branch, commit, push, PR, or review transaction occurred.

### Current Remaining Work
- [ ] 6.2C.1-6.2C.4 API/webhook/recovery (PR4, depends on Bridge).
- [ ] 6.2D.1-6.2D.3 CardForm/3DS/UI (after 6.2C).

```json
{
  "schema": "gentle-ai.sdd-apply-result/v1",
  "status": "success",
  "executive_summary": "Implemented the durable checkout compatibility Bridge: receipt dedupe/leases, evidence/reconciliation persistence, transactional reservation transitions, and a server-only Mercado Pago order lookup boundary.",
  "artifacts": ["prisma/schema.prisma", "prisma/migrations/20260805_checkout_reconciliation_foundation/migration.sql", "src/lib/checkout/order-repository.ts", "src/lib/checkout/order-repository.test.ts", "src/lib/payments/contracts.ts", "src/lib/payments/mercado-pago-orders-gateway.ts", "src/lib/payments/service.ts", "src/lib/payments/webhook.test.ts"],
  "next_recommended": "sdd-apply",
  "risks": ["6.2C must wire authenticated webhook verification and HTTP acknowledgement; no provider calls or routes were added in Bridge."],
  "skill_resolution": "paths-injected"
}
```

## Work Unit Evidence: Bridge Corrective Completion

### Completed blockers
- [x] PostgreSQL-faithful concurrent receipt claim and stale-lease recovery.
- [x] Receipt-gated atomic evidence, order, and reservation transition.
- [x] Durable reconciliation policy: seven attempts, exponential backoff capped at one hour, exhausted attempts unscheduled with a durable alert code.
- [x] `GET /v1/orders/{id}` error coverage for 401/403, 429/5xx, 404, malformed evidence, and external-reference mismatch.
- [x] Hybrid completion record synchronized after successful verification.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused PostgreSQL test | Historical wrapper evidence: `pnpm.cmd test -- ...` executed 5 files / 28 tests; the distinct direct Vitest command executed 3 files / 17 tests. Corrective rerun: the wrapper executed 5 files / 32 tests, while `.\\node_modules\\.bin\\vitest.cmd run src/lib/checkout/order-repository.test.ts src/lib/payments/webhook.test.ts src/lib/payments/service.test.ts --reporter=verbose` exited `0`: 3 files, 21 tests passed. The direct suite uses local PostgreSQL and proves eight concurrent claims yield one winner, ACTIVE reservation consume/release, rollback after an injected mid-transition failure, initial/exponential/capped scheduling, and receipt-gated reconciliation. |
| Checkout suite | `pnpm.cmd test:checkout` exited `0`: 3 files, 20 tests passed. |
| Static and migration validation | `tsc --noEmit --incremental false`, `pnpm.cmd lint`, `pnpm.cmd prisma migrate status`, and `git diff --check` each exited `0`; migration status reported the database schema up to date. `node node_modules/prisma/build/index.js validate` exited `0`: Prisma loaded `prisma/schema.prisma` and reported the schema valid. |
| Runtime harness | Local PostgreSQL through Prisma is the runtime boundary; no provider request, route, webhook ingress, CardForm, or 3DS flow was executed. |
| Rollback boundary | Revert the Bridge persistence/repository/gateway/service tests and implementation only. Retain the migration, receipts, lookup, and reconciliation data after any dispatched or pending attempt until every affected attempt is terminal. |

### Corrective completion
All five Bridge blockers are closed. No 6.2C/6.2D routes, webhooks, CardForm/3DS, provider calls, Git operations, or review transaction were added. `tsconfig.tsbuildinfo` remains unmodified.

```json
{
  "schema": "gentle-ai.sdd-apply-result/v1",
  "status": "success",
  "executive_summary": "Completed the Bridge correction with PostgreSQL concurrency proof, receipt-bound atomic reconciliation, durable retry exhaustion policy, and full Order.get error coverage.",
  "artifacts": ["prisma/schema.prisma", "prisma/migrations/20260805_checkout_reconciliation_foundation/migration.sql", "src/lib/checkout/order-repository.ts", "src/lib/checkout/order-repository.test.ts", "src/lib/payments/mercado-pago-orders-gateway.ts", "src/lib/payments/service.ts", "src/lib/payments/service.test.ts", "openspec/changes/catalog-products/apply-progress.md"],
  "next_recommended": "sdd-apply",
  "risks": ["6.2C remains a separate, unimplemented API/webhook/recovery slice; no real provider calls were made."],
  "skill_resolution": "paths-injected"
}
```
