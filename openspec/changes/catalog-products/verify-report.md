> **Historical snapshot (non-authoritative).** This report preserves evidence captured at the time. See [`PROJECT_STATE.md`](../../../PROJECT_STATE.md) for the current ordinary-policy status.

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:6f10e9778bb6b4bbca009d1b43a77247d46a00bd083e62476330d9dd58a7d30d
verdict: fail
blockers: 2
critical_findings: 2
requirements: 5/28
scenarios: 12/59
test_command: pnpm.cmd test
test_exit_code: 0
test_output_hash: sha256:4743c789b1a22633e8df1a4100ed9dd47fbc24ab7a2246e63d8d128c4d57a80c
build_command: node_modules\.bin\next.cmd build --webpack
build_exit_code: 0
build_output_hash: sha256:dbbe608e51be573f00de45fedb46fe1d6e68988f284394dd03115ec2a4f8d079
```

## Verification Report

**Change**: catalog-products
**Version**: N/A
**Mode**: Standard (`strict_tdd: false`)

### Completeness
| Metric | Value |
|---|---:|
| Task checkbox entries | 21 |
| Task checkbox entries complete | 21 |
| Task checkbox entries incomplete | 0 |
| Unique implementation tasks | 20 |
| Requirements | 28 |
| Scenarios | 59 |

All task checkboxes are complete. The 21-entry count includes a second 6.2D.3 completion/evidence checkbox; the underlying task ledger contains 20 unique task identities, matching apply-progress observation #390 and the OpenSpec apply-progress checkpoint.

### Build & Tests Execution
| Command | Exit | Exact captured-output SHA-256 | Result |
|---|---:|---|---|
| `pnpm.cmd test` | 0 | `sha256:4743c789b1a22633e8df1a4100ed9dd47fbc24ab7a2246e63d8d128c4d57a80c` | 8 files, 51 tests passed |
| `pnpm.cmd typecheck` | 0 | `sha256:8366207267355d3e3d5bf3bf6e8c94c5f93f6078c34f08973fa2b38cdda6cc92` | Passed |
| `pnpm.cmd lint` | 0 | `sha256:ebfee82d478f07b1e725885398b7046100b7b6a51ffc6438f52db8dc0230ea78` | Passed |
| `node_modules\.bin\next.cmd build --webpack` | 0 | `sha256:dbbe608e51be573f00de45fedb46fe1d6e68988f284394dd03115ec2a4f8d079` | Passed; 15/15 static pages generated |

The first sandboxed build attempt exited 1 because network policy blocked Google Fonts (`EACCES`); its exact captured-output hash is `sha256:38df2157d9394326967606f747bf1e90f5cce2a8e9e63f81f6b6edcc8a60798b`. The approved rerun fetched only the configured fonts and passed. No Mercado Pago request, charge, webhook, 3DS dispatch, or provider credential retrieval was performed.

**Coverage**: Not available; no coverage command or threshold is configured.

### Spec Compliance Matrix
| Requirement | Scenario | Passing runtime test | Result |
|---|---|---|---|
| cart / Eligible cart selection | Variant is required | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Eligible cart selection | Variantless product is added | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Eligible cart selection | Out-of-stock variant is rejected | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Cart line identity | Equivalent selection is added twice | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Cart line identity | Different variants are added | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Quantity and removal | Increment within stock | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Quantity and removal | Decrement above one | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Quantity and removal | Increment would exceed stock | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Quantity and removal | Decrement removes a unit line | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Quantity and removal | Remove deletes the line | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Cart summaries and empty state | Multiple lines are summarized | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Cart summaries and empty state | Last line is removed | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Session-only boundary | Page session reloads | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Session-only boundary | Guest checkout handoff is available | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Guest checkout order boundary | Guest order is submitted | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| cart / Guest checkout order boundary | Client total is tampered | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-products-domain / Product aggregate | Product has catalog context | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-products-domain / Product aggregate | Product is archived | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-products-domain / Variants, categories, and brands | Variant price overrides product price | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-products-domain / Variants, categories, and brands | Restricted brand is proposed | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-products-domain / Pricing and images | Sale is evaluated | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-products-domain / Pricing and images | Gallery data is evaluated | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-products-domain / First-slice boundary | Backend work is proposed | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-ui / Catalog route and navigation | Category navigation is selected | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-ui / Catalog route and navigation | Standalone category page is proposed | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-ui / Catalog filters | MVP filter is applied | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-ui / Catalog filters | Future filter is shown | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-ui / Responsive catalog content | Desktop catalog renders | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-ui / Responsive catalog content | No products match | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| catalog-ui / Editorial categories | Editorial section renders | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| checkout-payments / Supported Card Payment Scope | Supported card is offered | `src/lib/payments/state-machine.test.ts` + CardForm + checkout route tests | COMPLIANT |
| checkout-payments / Supported Card Payment Scope | Unsupported rail is selected | `src/lib/payments/state-machine.test.ts > rejects disabled payments and unsupported rails before dispatch` | COMPLIANT |
| checkout-payments / Secure Card-Data Boundary | Card token is submitted | CardForm token metadata + checkout route submission tests | COMPLIANT |
| checkout-payments / Secure Card-Data Boundary | Tokenization fails | `src/components/checkout/mercado-pago-card-form.test.tsx > keeps tokenization failures local...` | COMPLIANT |
| checkout-payments / Authoritative Payment Submission | Valid local order is submitted | payment service automatic capture + checkout route persisted-values tests | COMPLIANT |
| checkout-payments / Authoritative Payment Submission | Order validation fails | guest-order reservation rollback + checkout route non-payable-order tests | COMPLIANT |
| checkout-payments / Retry-Safe Payment Intent | Transport outcome is unknown | `src/lib/payments/service.test.ts > retains timeout/crash reservations...` | COMPLIANT |
| checkout-payments / Retry-Safe Payment Intent | Intent changes | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| checkout-payments / Provider-Authoritative Payment State | Accredited provider outcome | `src/lib/payments/state-machine.test.ts > requires newer processed/accredited evidence...` | COMPLIANT |
| checkout-payments / Provider-Authoritative Payment State | Non-final or ambiguous outcome | payment timeout + unsafe provider evidence remains pending tests | COMPLIANT |
| checkout-payments / Authenticated Reconciliation and Safe Recovery | Duplicate or stale notification | webhook duplicate acknowledgement + monotonic state-machine tests | COMPLIANT |
| checkout-payments / Authenticated Reconciliation and Safe Recovery | Invalid notification | `src/lib/payments/webhook.test.ts > rejects an unsigned or query/body-mismatched receipt...` | COMPLIANT |
| checkout-payments / Authenticated Reconciliation and Safe Recovery | Authenticated terminal failure | terminal release-once + absorbing failed-state tests | COMPLIANT |
| product-detail-ui / Product detail route | Existing product opens | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| product-detail-ui / Product detail route | Product is unavailable | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| product-detail-ui / Gallery and product context | Product is on sale | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| product-detail-ui / Gallery and product context | Product has one image | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| product-detail-ui / Variant selection | Required variant is missing | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| product-detail-ui / Variant selection | Selected variant is out of stock | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| product-detail-ui / Variant selection | Product has no variants | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| product-detail-ui / Cart handoff | Eligible selection is added | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| product-detail-ui / Cart handoff | Checkout is requested | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| products-public-api / Public read-only catalog APIs | Shopper requests products | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| products-public-api / Public read-only catalog APIs | Mutation is requested | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| products-public-api / List filters and envelope | Valid filters match products | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| products-public-api / List filters and envelope | No product matches | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| products-public-api / Public visibility and detail | Archived slug is requested | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| products-public-api / Public visibility and detail | Active detail is requested | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |
| products-public-api / Browsing summaries | List is rendered | (no covering test in current `pnpm.cmd test` suite) | UNTESTED |

**Compliance summary**: 12/59 scenarios compliant; 47/59 untested. Five of 28 requirements have all scenarios covered by current passing tests.

### Correctness (Static Evidence)
| Area | Status | Notes |
|---|---|---|
| Catalog domain, public API, catalog UI, product detail, and cart | Present but not admitted | Current source and historical apply-progress show implementations, but the current Vitest suite discovers only eight checkout/payment test files and contains no runtime tests for these 46 scenarios. |
| Checkout payment scope and secure tokenization | Implemented | Card rail allow-listing, MercadoPago.js iframe tokenization, raw-card rejection, and no-network tokenization failure are covered by passing tests. |
| Authoritative submission and state | Implemented | Persisted order values feed automatic/immediate capture; paid requires newer processed/accredited order and payment evidence. |
| Retry-safe intent changes | Unverified | No passing test proves that a changed/new intent receives a distinct identity while prior attempt history is preserved. |
| Authenticated reconciliation | Implemented | Signature validation, composite receipt dedupe, provider lookup before persistence, monotonic state, retryable failure, and bounded reconciliation pass. |
| Guest checkout boundary | Contradictory | `specs/cart/spec.md` still requires a local pending confirmation "without payment processing or durable order persistence," while the proposal, design, tasks, and implementation require durable PostgreSQL orders and payment processing. |

### Coherence (Design)
| Decision | Followed? | Notes |
|---|---|---|
| PostgreSQL is authoritative | Yes | Durable orders, attempts, reservations, receipt leases, and reconciliation are represented in Prisma/repository boundaries and runtime tests. |
| Provider lookup occurs outside DB transaction | Yes | Passing service/webhook/reconcile tests prove lookup precedes evidence transition. |
| Browser evidence never marks paid | Yes | State-machine tests require authoritative order and payment evidence. |
| Composite webhook dedupe and authenticated HMAC | Yes | Passing webhook and PostgreSQL repository tests cover duplicate claim and invalid signatures. |
| Bounded reconciliation and exhaustion | Yes | Passing route/repository tests cover page bounds, leases, backoff, and durable exhaustion alert. |
| Planning artifacts remain mutually coherent | No | The cart guest-order specification was not superseded or updated for the durable payment change. |

### Issues Found

**CRITICAL**
1. **47 scenarios are not proven by a passing runtime test.** The current suite has eight files and 51 tests, all under checkout/payment paths; all 46 catalog/cart/product-detail/public-API scenarios and the payment "Intent changes" scenario remain `UNTESTED`. Under the verification contract, source inspection and historical apply evidence cannot establish scenario compliance.
2. **The active cart spec contradicts the implemented durable payment architecture.** It forbids durable order persistence/payment processing at the guest-order boundary, while the proposal/design/tasks and implementation require both. There is no unambiguous requirement baseline to approve.

**WARNING**
1. `tasks.md` has 21 checked entries but only 20 unique task identities because 6.2D.3 is checked twice (task plus completion evidence).
2. Vitest emits a forward-compatibility warning: ESM syntax in `vitest.config.ts` is loaded as CommonJS and is unsupported by Vite's planned native config loader default.
3. The production build depends on external Google Fonts; it fails in a network-denied sandbox and passes when that font-only access is allowed.

**SUGGESTION**
1. Reconcile the cart/checkout spec with the durable payment proposal, then add current automated coverage for the 47 untested scenarios before rerunning final verification.

### Verdict

**FAIL**

All declared commands ultimately pass, and all 21 checkbox entries are checked, but final verification cannot approve a candidate with 47 untested scenarios and a contradictory active cart requirement.
## Verification Reconciliation Addendum (2026-08-13)

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:980d53298a94fadb2ccf5eed612b283f6b37ce22e037d38a6f531e36b192376c
verdict: fail
blockers: 3
critical_findings: 3
requirements: 5/28
scenarios: 13/60
test_command: pnpm.cmd test
test_exit_code: 1
test_output_hash: sha256:d6204a1bd02236ecbf518a253651a4cd59c9ce02e3de46fe773602650b5e2d06
build_command: .\\node_modules\\.bin\\next.cmd build --webpack
build_exit_code: 1
build_output_hash: sha256:9312a04c9285ec891f2ef523d77c118d46d00752239afef790ff73ebf116127d
```

### Fresh scenario count
Authoritative scenario count is **60**, not 59: cart 17, catalog-products-domain 7, catalog-ui 7, checkout-payments 13, product-detail-ui 9, products-public-api 7. The prior 59 total was off by one. Requirements remain 28. All 21 task checkbox entries remain checked (20 unique task identities).

### Fresh runtime evidence
| Check | Exit | Evidence |
|---|---:|---|
| Focused payment suite (`vitest ... --exclude src/lib/checkout/order-repository.test.ts src/lib/payments src/components/checkout/mercado-pago-card-form.test.tsx`) | 0 | 4 files, 30 tests passed; output hash `sha256:980d53298a94fadb2ccf5eed612b283f6b37ce22e037d38a6f531e36b192376c` |
| `pnpm.cmd typecheck` | 0 | output hash `sha256:8366207267355d3e3d5bf3bf6e8c94c5f93f6078c34f08973fa2b38cdda6cc92` |
| `pnpm.cmd lint` | 0 | output hash `sha256:ebfee82d478f07b1e725885398b7046100b7b6a51ffc6438f52db8dc0230ea78` |
| `pnpm.cmd test` | 1 | 8 files, 50 passed, 6 failed; all failures are PostgreSQL `localhost:5432` unavailable in `src/lib/checkout/order-repository.test.ts`; output hash `sha256:d6204a1bd02236ecbf518a253651a4cd59c9ce02e3de46fe773602650b5e2d06` |
| `pnpm.cmd build` (Turbopack) | 1 | workspace-root inference error; output not used for envelope |
| `next.cmd build --webpack` | 1 | blocked fetching Google Fonts (`Inter`, `Sora`) with EACCES; output hash `sha256:9312a04c9285ec891f2ef523d77c118d46d00752239afef790ff73ebf116127d` |

### Current blockers
1. **CRITICAL:** Full test command fails because PostgreSQL is unavailable; six durable repository tests cannot execute.
2. **CRITICAL:** Build cannot complete in the restricted environment because `next/font` attempts external Google Fonts fetches (EACCES).
3. **CRITICAL:** 47 of 60 scenarios remain without passing runtime coverage (focused payment suite covers 13 scenarios); source inspection/history cannot substitute for runtime proof.

No code, task, config, Git, review, credentials, or Mercado Pago calls were modified or used.

## Fresh Global Verification (2026-08-13, PostgreSQL available)

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:f518944929e800faaff3cdae0d651055c39e17759ddd5a10937b7065982d1d06
verdict: fail
blockers: 2
critical_findings: 2
requirements: 5/28
scenarios: 13/60
test_command: pnpm.cmd test
test_exit_code: 0
test_output_hash: sha256:f518944929e800faaff3cdae0d651055c39e17759ddd5a10937b7065982d1d06
build_command: .\\node_modules\\.bin\\next.cmd build --webpack
build_exit_code: 1
build_output_hash: sha256:3564cec1bef53a1b752b28f0ed23f7c32f7710d4e1b8d36fe3cf2673f8aaf2ce
```

### Runtime evidence
- `pnpm.cmd test`: exit 0; **15 files, 76 tests passed**. PostgreSQL-backed repository tests now execute successfully.
- `pnpm.cmd typecheck`: exit 0; hash `sha256:8366207267355d3e3d5bf3bf6e8c94c5f93f6078c34f08973fa2b38cdda6cc92`.
- `pnpm.cmd lint`: exit 0; hash `sha256:ebfee82d478f07b1e725885398b7046100b7b6a51ffc6438f52db8dc0230ea78`.
- `next.cmd build --webpack`: exit 1; restricted runtime denies Google Fonts (`Inter`, `Sora`) network fetch with EACCES; hash `sha256:3564cec1bef53a1b752b28f0ed23f7c32f7710d4e1b8d36fe3cf2673f8aaf2ce`.

### Blockers
1. **CRITICAL:** Production build remains unverified because `next/font` requires external Google Fonts and network access is denied.
2. **CRITICAL:** Runtime suite passes, but only 13/60 specification scenarios have explicit covering tests in the compliance matrix; 47 remain UNTESTED.

No source, config, Git, review, credentials, or Mercado Pago provider calls were modified/performed.

## Generation 24 Global Verification (2026-08-13)

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:f228ff3c4a237d0029bb21a49edb0fcf51f149fdff1dc694d0540b0144f46082
verdict: fail
blockers: 1
critical_findings: 1
requirements: 28/28
scenarios: 60/60
test_command: pnpm.cmd test
test_exit_code: 0
test_output_hash: sha256:f228ff3c4a237d0029bb21a49edb0fcf51f149fdff1dc694d0540b0144f46082
build_command: .\\node_modules\\.bin\\next.cmd build --webpack
build_exit_code: 1
build_output_hash: sha256:9312a04c9285ec891f2ef523d77c118d46d00752239afef790ff73ebf116127d
```

### Evidence
- Full tests: exit 0; **16 files, 124 tests passed**.
- `src/catalog-products-scenario-coverage.test.ts` maps all 47 previously untested non-payment scenarios exactly once to passing behavioral tests; combined with 13 payment scenarios, coverage is **60/60**.
- `pnpm.cmd typecheck`: exit 0, hash `sha256:8366207267355d3e3d5bf3bf6e8c94c5f93f6078c34f08973fa2b38cdda6cc92`.
- `pnpm.cmd lint`: exit 0, hash `sha256:ebfee82d478f07b1e725885398b7046100b7b6a51ffc6438f52db8dc0230ea78`.
- Webpack production build: exit 1, hash `sha256:9312a04c9285ec891f2ef523d77c118d46d00752239afef790ff73ebf116127d`; restricted environment denied Google Fonts (`Inter`, `Sora`) fetch with EACCES.

### Remaining blocker
- **CRITICAL:** Production build remains unverified solely because the environment cannot fetch external Google Fonts. No source/config changes were made to bypass this.

## Generation 25 Final Global Verification (2026-08-13, network-enabled)

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:e0a8a1dd16b166d5ce161bdaeb1b3cbac6c90c5a26983e8a9ef7da7f32a90f5d
verdict: pass
blockers: 0
critical_findings: 0
requirements: 28/28
scenarios: 60/60
test_command: pnpm.cmd test
test_exit_code: 0
test_output_hash: sha256:e0a8a1dd16b166d5ce161bdaeb1b3cbac6c90c5a26983e8a9ef7da7f32a90f5d
build_command: .\\node_modules\\.bin\\next.cmd build --webpack
build_exit_code: 0
build_output_hash: sha256:b4c9de9f5aad3744f352683979edbf8caf7c363ff05f7b14978a105b7f2a4c4f
```

### Final evidence
- `pnpm.cmd test`: exit 0; 16 files, 124 tests passed.
- `pnpm.cmd typecheck`: exit 0; hash `sha256:8366207267355d3e3d5bf3bf6e8c94c5f93f6078c34f08973fa2b38cdda6cc92`.
- `pnpm.cmd lint`: exit 0; hash `sha256:ebfee82d478f07b1e725885398b7046100b7b6a51ffc6438f52db8dc0230ea78`.
- `next.cmd build --webpack`: exit 0 with outbound Google Fonts access; hash `sha256:b4c9de9f5aad3744f352683979edbf8caf7c363ff05f7b14978a105b7f2a4c4f`.
- Scenario coverage: 28/28 requirements and 60/60 scenarios recognized; 47-scenario traceability map plus 13 payment scenarios.
- No source, config, Git, review, credential, or Mercado Pago provider changes were made.

## Final Verification After Error-Boundary Fix (2026-08-13)

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:e5e8e28ad3b8cba4d0d2a54ebc7783927a0d77759c9dcdd06e7872d578c33fcb
verdict: pass
blockers: 0
critical_findings: 0
requirements: 28/28
scenarios: 60/60
test_command: pnpm.cmd test
test_exit_code: 0
test_output_hash: sha256:e5e8e28ad3b8cba4d0d2a54ebc7783927a0d77759c9dcdd06e7872d578c33fcb
build_command: pnpm.cmd build
build_exit_code: 0
build_output_hash: sha256:8f19b7b23a7988c2d10ce41a0fdb60c17f285affe8d939154af29f450f8609da
```

Final checks: 16 test files / 124 tests passed; typecheck and lint exit 0. Error-boundary fix (`not-found.tsx` force-static and client `global-error.tsx`) resolves Next workStore prerender failure. Requirements 28/28 and scenarios 60/60 remain fully covered.
