# Preview card contrast and admin magic link

## Objective
Make the Mercado Pago test checkout readable in Netlify Deploy Preview and ensure Supabase admin magic links return to the same Preview origin, without enabling real payments or changing production behavior.

## Problem and motivation
- Protected Mercado Pago iframe fields render dark text/placeholders against the dark checkout field background.
- Admin magic-link initiation on Deploy Preview can resolve `APP_ORIGIN` to the production host, separating the callback from the Preview PKCE cookie and returning the user to sign-in.

## Scope and constraints
- Keep payment processing in TEST mode and do not introduce production credentials or remote service changes.
- Preserve all pre-existing local changes, especially `src/app/admin/layout.tsx` and `src/lib/auth/supabase-server.ts`.
- Use provider-supported iframe styling; parent CSS cannot style cross-origin iframe contents.
- Preserve production auth origin behavior; for Netlify Deploy Preview, resolve the current deploy origin ahead of generic `APP_ORIGIN`.
- Supabase dashboard redirect allow-list/template and Netlify environment values are outside this local change; report any required external configuration separately.
- No push or PR without separate user authorization.

## Delivery strategy
`ask-on-risk` (default). Forecast: approximately 150 authored changed lines, excluding generated files.

## Tasks

### PREVIEW-AUTH-1 — Restore contrast in protected card fields
- **Route:** delegated direct; task crosses component, test, and style/config surfaces.
- **Authorized scope:** `src/components/checkout/mercado-pago-card-form.tsx`, `src/components/checkout/mercado-pago-card-form.test.tsx`.
- **Acceptance:** Card number, expiration, and CVV iframe fields receive provider-supported readable foreground and placeholder styles; tokenization and test-only safety behavior remain unchanged.
- **Checks:** focused Vitest component suite; inspect source/test diff and confirm the style is passed in the SDK cardForm field map.
- **Progress:** implemented and independently checked. The three Mercado Pago iframe fields receive the SDK `style` colors `#f5f5f5` and `#cfd186`; their wrappers use a stable `#181818` background. Writer observed RED (1 failure, 6 passing), then GREEN (7 passing) with the local Vitest runner. Parent rerun: 7 passing. Independent static review confirmed contrast ratios 16.29:1 and 11.09:1 and no payment/tokenization changes. Hosted iframe rendering still needs visual confirmation. Work-unit commit: `683f3ef` (`fix(checkout): improve card iframe contrast`).

### PREVIEW-AUTH-2 — Keep admin magic-link callback on the Deploy Preview origin
- **Route:** delegated direct; behavior and tests require auth flow analysis.
- **Authorized scope:** `src/lib/auth/request-integrity.ts`, `src/lib/auth/request-integrity.test.ts`, `docs/operations/admin-auth.md`.
- **Acceptance:** when Netlify reports `CONTEXT=deploy-preview` and a valid `DEPLOY_PRIME_URL`, auth redirect origin uses that exact deploy origin even if a generic `APP_ORIGIN` is present; a missing/invalid Preview URL fails closed instead of redirecting to production. Production/other contexts retain existing `APP_ORIGIN` precedence. Never weaken callback validation or admin membership checks.
- **Checks:** focused request-integrity, auth route, and Supabase server tests; review docs for Preview/production distinction.
- **Progress:** implemented and independently verified. Exact `CONTEXT=deploy-preview` now uses only a valid `DEPLOY_PRIME_URL`; missing/invalid Preview URLs fail closed. Other contexts retain existing origin precedence. Writer observed RED (13 failed, 37 passed), then GREEN (50 passed across 5 files); parent rerun also passed all 50. Scoped diff check and independent security/documentation review passed. Deployed Preview and Supabase redirect allow-list remain unverified because remote configuration is outside scope. Work-unit commit: `cda9ecd` (`fix(auth): keep preview magic links in context`).

## Progress and next step
- Follow-up authorized on October 7: session-aware sign-in UX and callback investigation. Previous changes are published through `9c23d03`; new work remains local until separately authorized.
- PREVIEW-AUTH-3 (verified): delegated direct because session-aware rendering, callback diagnostics, and tests require coordinated auth analysis. Allowed surfaces: `src/app/auth/sign-in/page.tsx`, `src/app/auth/sign-in/page.test.tsx`, `src/app/auth/confirm/route.ts`, `src/app/auth/auth-routes.test.ts`, `docs/operations/admin-auth.md`.
- Acceptance: active authorized operators do not see a redundant sign-in form; clean visits redirect to admin, failed-link visits truthfully distinguish the existing session from the rejected link and offer continuation. Membership checks remain unchanged. Callback failures retain their failure redirect and gain server-only allowlisted diagnostic categories with no secrets or raw errors. Hosted root cause remains unconfirmed without deployed diagnostics.
- Checks: deterministic RED/GREEN UX and callback tests; authorization/membership/Supabase regression suites; scoped lint and typecheck; independent verification and parent focused rerun. RDD remains off. Additional forecast: approximately 200 authored lines; cumulative forecast approximately 368, delivery strategy unchanged.
- Verification: writer observed RED (16 failed, 21 passed), then GREEN (39 passed); an additional conflicting-query regression also failed before correction. Parent and independent verifier each observed 39 passing tests. Writer and verifier typecheck and scoped ESLint passed. Independent review found no blockers; installed SDK diagnostic codes were verified. Existing seven dirty files remain unchanged. Native assessment unavailable (Access denied); RDD off, independent verification used. Full suite/build and hosted callback/visual checks skipped. Actual scoped source/test/runbook change: 200 authored lines. Local work-unit commit pending recording below.
- Read-only repo exploration confirmed the iframe styling boundary and the `APP_ORIGIN`-before-`DEPLOY_PRIME_URL` precedence. A source fix is locally authorized; deployed environment and Supabase redirect settings are not accessible in this scope.
- Local follow-up is verified; no new push. Next: separately authorize publishing, then inspect the safe callback category and repeat a fresh link on stable Preview #33. Existing session access does not prove the newest link succeeded. Hosted contrast also remains pending.

## Relevant files
- `src/components/checkout/mercado-pago-card-form.tsx` — Mercado Pago card form integration.
- `src/lib/auth/request-integrity.ts` — auth origin and request-integrity helpers.
- `docs/operations/admin-auth.md` — admin authentication deployment runbook.
