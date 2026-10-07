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
- **Progress:** implemented and independently checked. The three Mercado Pago iframe fields receive the SDK `style` colors `#f5f5f5` and `#cfd186`; their wrappers use a stable `#181818` background. Writer observed RED (1 failure, 6 passing), then GREEN (7 passing) with the local Vitest runner. Parent rerun: 7 passing. Independent static review confirmed contrast ratios 16.29:1 and 11.09:1 and no payment/tokenization changes. Hosted iframe rendering still needs visual confirmation. Commit identity to be recorded after the work-unit commit.

### PREVIEW-AUTH-2 — Keep admin magic-link callback on the Deploy Preview origin
- **Route:** delegated direct; behavior and tests require auth flow analysis.
- **Authorized scope:** `src/lib/auth/request-integrity.ts`, `src/lib/auth/request-integrity.test.ts`, `docs/operations/admin-auth.md`.
- **Acceptance:** when Netlify reports `CONTEXT=deploy-preview` and a valid `DEPLOY_PRIME_URL`, auth redirect origin uses that exact deploy origin even if a generic `APP_ORIGIN` is present; production/other contexts retain existing `APP_ORIGIN` precedence. Never weaken callback validation or admin membership checks.
- **Checks:** focused request-integrity, auth route, and Supabase server tests; review docs for Preview/production distinction.
- **Progress:** pending; deployed Preview and Supabase allow-list remain unverified because remote configuration is outside scope.

## Progress and next step
- Read-only repo exploration confirmed the iframe styling boundary and the `APP_ORIGIN`-before-`DEPLOY_PRIME_URL` precedence. A source fix is locally authorized; deployed environment and Supabase redirect settings are not accessible in this scope.
- Next: implement each task separately, verify, and record work-unit commits and applicable native review assessment before closing.

## Relevant files
- `src/components/checkout/mercado-pago-card-form.tsx` — Mercado Pago card form integration.
- `src/lib/auth/request-integrity.ts` — auth origin and request-integrity helpers.
- `docs/operations/admin-auth.md` — admin authentication deployment runbook.
