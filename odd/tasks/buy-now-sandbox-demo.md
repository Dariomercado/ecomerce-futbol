# Buy Now sandbox demo

## Objective
Provide a browser-accessible portfolio checkout using Mercado Pago test credentials, with a direct Buy Now action that does not alter an existing cart.

## Problem and rationale
Product detail currently offers only Add to Cart. The hosted card form is disabled until payment configuration is enabled, and webhook delivery depends on external Mercado Pago configuration. A persistent Netlify HTTPS deployment can replace a local tunnel for the hosted demo.

## Authorized scope and constraints
- Implement Buy Now and proportionate tests on `feat/buy-now-sandbox-demo`, based on `origin/main`; keep PR 29 separate.
- Configure only the `ecomerce-futbol` Netlify site and Mercado Pago application using fresh interactive OAuth authorization, test credentials, and the test webhook URL; never enable real payments or expose private tokens.
- Preserve pre-existing edits to `.atl/skill-registry.md`, `PLAN.md`, `PROJECT_STATE.md`, and `README.md`.
- GitHub publishing needs a separately identified authorized session before any remote Git operation.
- RDD remains disabled by user preference; no native review starts.

## Delivery strategy
- User chose two chained PRs on 2026-10-05. Use stacked PRs to `main` because Buy Now can land first and the sandbox guard can land after it; no tracker PR is needed. No PR or merge is implied by a checkbox.
- PR 1: `feat/buy-now-checkout` at T1 commit `4be8f38`, initially targeting `main`; 249 authored changed lines. Delivers direct checkout while preserving cart behavior.
- PR 2: `feat/buy-now-sandbox-demo` containing T2 and T2B commits, initially targeting PR 1's branch so the review diff contains only the dependent guard/build work. Retarget to `main` after PR 1 merges. Current T2 delta is approximately 150 authored lines; confirm final budget before publishing.
- Keep each PR at or below about 400 authored changed lines; never shrink code or tests cosmetically to fit the budget.

## Tasks
- [x] T1 — Add Buy Now from product detail with a selected variant, preserve the existing cart, and test direct checkout and ordinary cart checkout. Route: delegated direct (multiple non-trivial UI files and reading needed before writing). Acceptance: direct checkout submits only the selected product; successful direct checkout does not clear unrelated cart items. Checks: focused Vitest tests, TypeScript, lint, and a browser smoke test when available.
- [x] T2 — Prepare the public sandbox demo state and verify payment-disabled behavior does not create unusable guest orders. Route: delegated direct (checkout UI and tests). Acceptance: users are told when checkout is demo-only or unavailable before any order is reserved; configured sandbox flow remains usable. Checks: focused Vitest tests, TypeScript, lint, browser smoke test when available.
- [ ] T2B — Resolve the existing production build blockers before deployment. Route: delegated direct (build/auth boundary and Next configuration). Acceptance: production build and TypeScript complete without changing payment or admin authorization semantics. Checks: Webpack and default Next builds, focused tests, TypeScript; record any environmental limitation.
- [ ] T3 — Configure Netlify sandbox variables by deploy context and Mercado Pago test webhook to the stable Netlify HTTPS endpoint, deploy, and observe a test payment end to end. Route: delegated verification/operations (external tooling). Acceptance: the hosted demo visibly identifies test payments; a test order reaches a terminal state and the webhook is verified. Checks: deployment status, test payment, webhook delivery and order state; record any unavailable proof.
- [ ] T4 — Publish the feature branch to GitHub after explicit session authorization. Route: direct state operation. Acceptance: remote branch matches the verified local work-unit commit. Checks: remote identity and commit comparison; no PR or merge without separate instruction.

## Progress
- Branch created from local `origin/main`; PR 29 branch `feat/admin-role-permissions` preserved.
- T1 outcome: direct checkout uses only the selected product/variant and does not mutate or clear unrelated cart state. Tests: 5 files / 26 passed; corrected focused UI tests: 8 passed; parent spot check: checkout test 2 passed; ESLint: 0 errors, one existing hook warning; TypeScript: passed after moving stale generated Next dev validators to `.next/dev/types-backup-buy-now-t1`. Initial RED was unavailable because `pnpm exec vitest` failed to resolve the runner; correction price tests observed RED before GREEN.
- T1 pending check: production build compiles and typechecks with Webpack, then fails prerendering `/_not-found` with `Invariant: Expected workStore to be initialized`. Turbopack fails to resolve `next/package.json` from its inferred workspace root. Browser smoke test remains pending. Independent verifier found and the writer corrected a missing Suspense boundary around `useSearchParams`.
- T1 work-unit commit: `4be8f38` (`feat(checkout): add direct Buy Now flow`), 239 insertions / 10 deletions across the feature, tests, and this task document. No account, deployment, or GitHub changes completed yet.
- T2 outcome: client checks readiness on load and again before order POST; server rejects disabled/incomplete payment configuration before reserving stock. Sandbox copy instructs use of test cards and does not claim that credentials are cryptographically proven safe. Tests: 4 files / 42 passed independently and by writer; parent spot check: config test 4 passed; TypeScript passed; ESLint 0 errors, one pre-existing hook warning. Browser smoke remains pending.
- T2 work-unit commit identity pending. Next: commit T2 and address T2B before any hosted deployment.
