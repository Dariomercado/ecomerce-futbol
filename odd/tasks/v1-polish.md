# Finish v1 functional and visual polish

## Objective
Complete the remaining admin, TEST checkout, storefront and release checks without activating real payments or merging prematurely.

## Problem and authorization
The user authorized continuing local development on 2026-10-08 and deferred repairing Codex. Admin seeded root-relative images conflict with the native URL form constraint, blocking submission and pending PC uploads. Fix verified defects; audit remaining UX before widening implementation. No push, remote operation, merge, real purchase or environment/security changes are authorized.

## Constraints
- Branch: `feat/buy-now-sandbox-demo`; preserve existing uncommitted changes in `.atl/skill-registry.md`, `.gitignore`, `PLAN.md`, `PROJECT_STATE.md`, `README.md`, `src/app/admin/layout.tsx`, `src/lib/auth/supabase-server.ts`.
- English technical artifacts; no new dependency or redesign without evidence.
- Default sandbox still fails before process creation. Any exceptional command must be narrowly scoped and approved through runtime review; diagnostic approvals are not blanket development authorization.
- Read-only RDD status currently reports on by default, unlike the older saved off state. Do not toggle it; candidate consent remains user-owned.
- Test first when a deterministic regression is runnable. No claimed RED/GREEN without observed commands.

## Delivery
Strategy: ask-on-risk. No PR or chain selected. Forecast: V1-1 35–90 authored lines, V1-2 50–140, V1-3 audit only initially (0; conditional interaction 60–160), V1-4 audit/fixes unknown, V1-5 checks plus tracking. Total uncertain; resolve scope before crossing ~400 authored lines, not by code-golf. Running work-unit count: 0. Initial review boundary: `3fe51c073eb33474abb165de028f4050f039bae6`. Native review candidates are work-unit commits/slices, never checkboxes or the whole branch.

## Tasks
- [ ] V1-1: Correct seeded image form validation and prove pending PC upload can submit alongside an existing root-relative image.
- [ ] V1-2: Inspect and improve payment-status refresh presentation for loading, errors, pending and terminal states without creating a second charge.
- [ ] V1-3: Review gallery responsiveness and accessibility; implement only evidence-backed polish, not an assumed carousel redesign.
- [ ] V1-4: Review navigation, catalog/detail/cart/admin/checkout on mobile and desktop; record concrete loading/error/empty/focus/contrast defects before fixes.
- [ ] V1-5: Verify feature/main differences, preserved dirty files and payment safety; run local checks and obtain separately authorized hosted acceptance before release decisions.

## V1-1 implementation contract
Route: delegated direct. Trigger: two non-trivial component/test files and reading that prepares a write.
Allowed source surfaces:
- `src/components/admin/admin-catalog-crud.tsx`
- `src/components/admin/admin-catalog-crud.test.tsx`
Parent tracking: `odd/tasks/v1-polish.md`.
Confirmed evidence: component copies persisted paths unchanged, but existing image address uses required `type="url"`; seed stores `/catalog/products/control-fg-verde-1.png`; API schema accepts nonempty strings. Existing upload regression only uses an absolute HTTPS fixture.
Acceptance:
- Existing supported root-relative paths and public HTTPS addresses pass form validation and are preserved in aggregate saves.
- Empty, malformed or unsafe image references remain rejected proportionately; inspect current renderer policy before changing controls, do not globally disable validation.
- Actual save-button path works with root-relative persisted image and a pending local file; upload and metadata update are observed in mocked tests.
- Existing upload-failure/retry and CRUD tests remain passing; no server/storage/schema expansion without evidence.
- Hosted image persistence after reload remains a separate manual acceptance check; do not claim mocked tests prove Storage configuration.
Checks:
- `pnpm exec vitest run src/components/admin/admin-catalog-crud.test.tsx` (observed RED, then GREEN).
- `pnpm exec vitest run src/lib/catalog/admin-contracts.test.ts src/lib/catalog/admin-product-service.test.ts "src/app/api/internal/catalog/products/[productId]/images/route.test.ts"`.
- `pnpm typecheck`; `pnpm lint`; `git diff --check`.
- Parent reruns one reported focused command before delivery; native assessment/consent applies to final work unit.
Runtime scenario: edit product with seeded relative image, add PC file, save, reopen/reload and confirm both images; pending hosted authorization, not run.
Rollback: the two listed source/test files contain the isolated form-validation correction.
Commit: pending isolated implementation checkpoint. Verification: local behavior proven, whole-repository lint and hosted acceptance remain pending. Review outcome: pending committed-range assessment.

Observed proof (2026-10-08): RED 7 failed / 15 passed before the component change; GREEN 22 passed, final refactor 25 passed. Adjacent contract/service/upload route tests 11 passed. Typecheck exit 0. Full lint exit 1 (11,005 errors / 67,369 warnings), including generated `.tmp/build-comparison-20261005/baseline/.next` output; independent verification confirms nested generated file is not ignored and predates this task, but does not establish every full-lint finding is pre-existing. Focused ESLint exit 0 with four existing warnings; diff check exit 0. Independent verifier reran 25 tests and typecheck successfully; parent spot check reran 25 tests successfully. Source change 97 additions / 5 deletions (102 authored lines).

Implementation: required text control with native custom validity accepts normalized `/catalog/` paths and credential-free HTTPS, rejects malformed/unsafe values, and refreshes validity after edits. Actual save-button tests cover preserved relative images, PC upload metadata and failure/retry. No server, Storage, renderer, schema or dependency changes. Generic HTTPS validity is not renderer host-allowlisting proof.

## Remaining routes and checks
V1-2: delegated if implementation selected; candidate surfaces `src/app/checkout/page.tsx` and its existing test. Inspect real status-only request and polling; focused Vitest plus no-duplicate-charge assertions. Do not confuse payment status with shipment tracking.
V1-3/V1-4: read-only explorer first; exact write surfaces follow confirmed findings. Reuse existing gallery/image/navigation tests and visually verify before calling complete.
V1-5: delegated verification; `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` (includes Prisma generation). Never automatically run `e2e:post-payment` because it performs operational cancel/refund actions. Production smoke must not purchase or activate real credentials.

## Progress and next step
V1-1 local correction and isolated tests are implemented and independently verified. Keep its checkbox open until outstanding applicable acceptance is resolved. Preserve the seven baseline files. Do not claim full lint success or hosted persistence. Prepare isolated checkpoint and assess its committed range; then continue V1-2.

