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
Strategy: ask-on-risk; the user selected feature-branch-chain on 2026-10-08. Integrate the full v1 before any main merge. Existing integration foundation: `feat/buy-now-sandbox-demo` at `a64d45ee3002bcfdb60eacb20dc0e666e2a91cb7`. First new child: `fix/admin-save-feedback`, targeting that integration branch. Later children target their immediate predecessor. Keep a future integration tracker PR draft/no-merge until the chain and release checks complete; do not rewrite existing history or retarget existing PRs without authorization. No new push or PR creation is authorized by strategy selection.
Forecast: V1-1b 269 source/test lines plus tracking, V1-2 50–140, V1-3 audit first (conditional interaction 60–160), V1-4 evidence-backed scope unknown, V1-5 checks/tracking. Keep each coherent child within the review budget where possible; never compress code to fit it. Prior committed count: 161 authored lines (102 source/test), pending V1-1b: 269 source/test plus tracking. Native review boundary remains `3fe51c073eb33474abb165de028f4050f039bae6`; native candidates are committed work units/slices, never TODO checkboxes or the whole feature history.

Chain plan (not yet published):
`main <- feat/buy-now-sandbox-demo [integration, no merge] <- fix/admin-save-feedback [current child] <- future checkout/gallery children`
Current child starts at `a64d45ee3002bcfdb60eacb20dc0e666e2a91cb7`, ends with truthful admin mutation reconciliation, includes its component/tests/task proof, and excludes auth baseline edits, checkout, gallery, temporary lint cleanup and hosted configuration. Existing published image-validation checkpoint remains a foundation; PR identities, approved issue linkage and tracker state must be verified under separately authorized GitHub operations before actual PR creation.

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
Commit: `a64d45ee3002bcfdb60eacb20dc0e666e2a91cb7` (`fix(admin): allow seeded image paths when saving products`). Verification: local behavior proven, whole-repository lint and hosted acceptance remain pending. Native committed-range assessment: medium, review_due=false, under_budget (161 lines), pending slice; no review granted or approval claimed. Review boundary stays `3fe51c073eb33474abb165de028f4050f039bae6`.

Observed proof (2026-10-08): RED 7 failed / 15 passed before the component change; GREEN 22 passed, final refactor 25 passed. Adjacent contract/service/upload route tests 11 passed. Typecheck exit 0. Full lint exit 1 (11,005 errors / 67,369 warnings), including generated `.tmp/build-comparison-20261005/baseline/.next` output; independent verification confirms nested generated file is not ignored and predates this task, but does not establish every full-lint finding is pre-existing. Focused ESLint exit 0 with four existing warnings; diff check exit 0. Independent verifier reran 25 tests and typecheck successfully; parent spot check reran 25 tests successfully. Source change 97 additions / 5 deletions (102 authored lines).

Implementation: required text control with native custom validity accepts normalized `/catalog/` paths and credential-free HTTPS, rejects malformed/unsafe values, and refreshes validity after edits. Actual save-button tests cover preserved relative images, PC upload metadata and failure/retry. No server, Storage, renderer, schema or dependency changes. Generic HTTPS validity is not renderer host-allowlisting proof.

## Remaining routes and checks
V1-2: delegated if implementation selected; candidate surfaces `src/app/checkout/page.tsx` and its existing test. Inspect real status-only request and polling; focused Vitest plus no-duplicate-charge assertions. Do not confuse payment status with shipment tracking.
V1-3/V1-4: read-only explorer first; exact write surfaces follow confirmed findings. Reuse existing gallery/image/navigation tests and visually verify before calling complete.
V1-5: delegated verification; `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` (includes Prisma generation). Never automatically run `e2e:post-payment` because it performs operational cancel/refund actions. Production smoke must not purchase or activate real credentials.

## Progress and next step
V1-1 local correction and isolated tests are implemented and independently verified. Keep its checkbox open until outstanding applicable acceptance is resolved. Preserve the seven baseline files. Do not claim full lint success or hosted persistence. Isolated checkpoint is committed and assessed; continue V1-2.

Published checkpoint: the user explicitly authorized pushing `a64d45ee3002bcfdb60eacb20dc0e666e2a91cb7` to `origin/feat/buy-now-sandbox-demo` using the configured GitHub connection. Push succeeded and `git ls-remote` confirmed that exact branch hash. No main merge or pending worktree changes were included. Preview33 deployment completion/revision and actual image persistence remain unverified; test only after its deployment includes this commit.

## V1-1b: Reconcile admin mutations and truthful feedback
Authorization: user requested reviewing the whole admin and fixing silent creation/admin-only appearance after a PC-image upload. Current code audit confirms independent defects; the live product's publication state remains unknown. Local fixes only; previous push consent applied to a64d45e only.
Route: delegated direct (multi-step mutation state across two non-trivial component/test files). Allowed source surfaces remain `src/components/admin/admin-catalog-crud.tsx` and `src/components/admin/admin-catalog-crud.test.tsx`; parent tracking stays this document. No API/Storage/schema/auth baseline changes without new evidence.
- [x] Preserve create/edit/archive/restore feedback during background refresh; keep editor identity on successful save followed by refresh failure.
- [x] Reconcile newly persisted identity/row immediately and retry by update, never duplicate create.
- [x] Stage PC-image-only creation as Draft until actual image metadata attaches; honor intended publication only after upload completes; explain partial state.
- [x] Lock editing/context-switch controls while mutation is busy and communicate stage-specific failures.
- [x] Explain Draft/Published/Featured visibility without silently publishing products.
Acceptance: deterministic save-button RED/GREEN coverage for successful messages, new-create upload failure/update retry, initial Draft/final Published with PC file, refresh-after-save failure, delayed operations and context locking, archive/restore notices and relevant upload errors. A final attachment failure should retain uploaded metadata for retry rather than reuploading/creating avoidable orphan objects where feasible within this scope.
Checks: `pnpm exec vitest run src/components/admin/admin-catalog-crud.test.tsx`; `pnpm exec vitest run src/app/admin/actions.test.ts src/lib/catalog/admin-product-service.test.ts src/app/api/catalog/public-api.test.ts`; `pnpm typecheck`; focused ESLint on two files; `git diff --check`. Full lint is already known failing on generated temporary artifacts; no repeated flood or unapproved cleanup. Independent review and parent spot check apply.
Forecast: approximately 180–320 additional source/test lines, plus tracking. Combined delivery may exceed ~400 authored lines; ask-on-risk chain strategy must be resolved before the next commit if the measured/forecast total crosses that heuristic. Do not omit tests or readability to fit it.
Runtime: actual Preview save, refresh, publish and public list appearance remains pending separately authorized hosted evidence. No new push/merge/configuration permission inferred. Native committed-range boundary remains3fe51c073eb33474abb165de028f4050f039bae6.
Status: local implementation and focused checks complete; feature-branch-chain selected. Isolated child checkpoint and applicable native review pending. Prioritize V1-1b before checkout polish; preserve all baseline dirty files. No new push performed.
Observed verification: initial RED 9 failed / 25 passed; GREEN 34 passed; archive/restore supplemental RED 2 failed / 34 passed; final GREEN 36 passed. Adjacent admin-action/service/public-API tests 11 passed. Typecheck exit 0 after correcting the callback signature; focused ESLint exit 0 with four existing warnings. Independent verifier reran 36 tests and typecheck successfully and found no concrete blocker. Source-only diff check exit 0; parent-owned trailing task-document blank line normalized before candidate freeze.
Parent spot check: 36 component tests passed again; whole-worktree `git diff --check` now exits 0 after normalizing the task document. Seven baseline dirty files remain untouched.
Size: pending source/test correction is 244 additions / 25 deletions (269 authored lines). Combined with prior 161-line committed checkpoint, the feature exceeds 400 lines before tracking changes. The selected feature-branch-chain resolves delivery strategy before the next commit; keep this coherent fix/tests together as the new child. Live product flags, deployment revision, actual image persistence, full lint and full build remain unverified/pending.

