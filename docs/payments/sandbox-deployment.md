# Hosted Mercado Pago sandbox

Host the sandbox demo on the Netlify **Production deploy context** using only Mercado Pago test credentials and a non-production database. "Production" here names Netlify's hosting context; it does **not** mean enabling real-money Mercado Pago credentials. Keep `PAYMENTS_ENABLED=true` only for the hosted test demo, never substitute production payment credentials, and do not treat a local build as hosted-payment proof.

## Configure the hosted demo

Set these site environment variables for Netlify's **Production** deploy context. Netlify applies context-specific values at deploy time; changing the public key requires a new deploy.

| Variable | Production-hosted demo value | Exposure |
| --- | --- | --- |
| `PAYMENTS_ENABLED` | `true` for this test-only hosted demo | Gates new checkout/payment creation; it does not disable payment webhook reconciliation. |
| `PAYMENT_METHOD_IDS` | `visa,master` (or the methods enabled for the test account) | Server-side allowlist. |
| `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` | Mercado Pago **test** public key | Public; compiled into the browser bundle, never a secret. |
| `MERCADO_PAGO_ACCESS_TOKEN` | Mercado Pago **test** access token | Server-only secret. |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Signing secret for the Mercado Pago test-mode webhook URL | Server-only secret. |
| `DATABASE_URL` | A dedicated non-production/demo database | Server-only connection string; never reuse the production database for test orders. |
| `NEXT_PUBLIC_APP_URL` | The canonical HTTPS Netlify site origin | Public build-time value; no PR Preview URL. |
| `APP_ORIGIN` | The same exact canonical HTTPS origin | Server-only exact-origin setting. |

The app also needs its existing Supabase configuration: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; add `SUPABASE_SERVICE_ROLE_KEY` only if catalog images use Supabase Storage. The service-role key is server-only. Scope it to the intended environment. Do not put secrets in `netlify.toml` or the repository; configure them in Netlify's site environment-variable settings.

For Deploy Previews, keep `PAYMENTS_ENABLED=false` unless preview checkout has its own isolated test setup. If enabled, use a separate test-mode callback and matching test credentials/secrets and isolated demo data. Deploy Preview origins are PR-specific, so do not point the stable test webhook at one. Do not enable the scheduler-only `RECONCILIATION_CRON_SECRET` or admin-only `POST_PAYMENT_ADMIN_TOKEN` just to run a buyer checkout demo.

## Configure the webhook once

Register `https://<canonical-netlify-site>/api/webhooks/mercado-pago` as the Mercado Pago application's **test-mode URL** in Webhooks settings. Select the Orders notifications supported by this app and save the corresponding test-mode signing secret in Netlify Production context as `MERCADO_PAGO_WEBHOOK_SECRET`. `APP_ORIGIN` and `NEXT_PUBLIC_APP_URL` must be the exact same canonical HTTPS origin; only the webhook endpoint adds the path `/api/webhooks/mercado-pago`. Do not use a temporary per-PR URL: provider callbacks need a stable HTTPS endpoint, so no ngrok or local tunnel is needed. The route verifies the signature and reconciles provider order evidence before applying payment state.

The test-mode callback reaches the stable site while it is running with its production hosting context. Verify that this context has the matching test access token and signing secret and the non-production `DATABASE_URL`. Use Mercado Pago's notification simulation to confirm delivery; do not assume Netlify creates or configures provider webhooks. `PAYMENTS_ENABLED=false` blocks new checkout but does not prevent reconciliation of already-created payments, so webhook credentials/data must remain consistent for the lifetime of test orders.

## Test with provider test accounts

1. Create or select a Mercado Pago test seller for the application and a separate test buyer in the same country. Do not use a real buyer account.
2. Use the test public key and test access token belonging to the configured seller application.
3. Enter a test card from Mercado Pago's current Checkout API test-card guide and use the test buyer details as required there. Card numbers and test-user credentials can vary by country and provider scenario; do not copy real card data or credentials into this repository.
4. Complete a payment from the canonical HTTPS hosted demo. Confirm the UI reports the resulting state and that the order becomes terminal only after verified provider evidence.
5. Confirm the provider delivered a signed notification to the stable webhook URL, the endpoint accepted it, and the matching non-production order/payment records reflect the authoritative state. A browser redirect alone is not webhook proof.

## Acceptance checklist

- [ ] Netlify Production deploy context has the exact payment environment variable names above, only test credentials, and a non-production database.
- [ ] The canonical site runs in Netlify Production context but Mercado Pago test mode; no production payment credentials are configured.
- [ ] `APP_ORIGIN`, `NEXT_PUBLIC_APP_URL`, and the test-mode webhook URL all use the same canonical HTTPS site origin.
- [ ] Public key is present in the newly built site bundle; server-only secrets are configured in Netlify and not in client code or repository files.
- [ ] Checkout is reachable over HTTPS and clearly identifies the test/demo context.
- [ ] A provider test buyer/card completes the expected payment flow.
- [ ] Signed test-mode webhook delivery is observed at the stable endpoint and the matching non-production order reaches the expected terminal state.
- [ ] Deployment URL, opaque order reference, observed result, and webhook delivery evidence are recorded without recording credentials or card details.

No hosted acceptance item is complete until it is observed. This document does not claim that a Netlify deploy, test purchase, or webhook delivery has already occurred.

## References

- [Netlify deploy previews and context-specific environment variables](https://docs.netlify.com/deploy/deploy-types/deploy-previews/)
- [Netlify environment variable contexts](https://docs.netlify.com/build/environment-variables/overview/)
- [Mercado Pago test accounts](https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/resources/test-accounts)
- [Mercado Pago test cards](https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/resources/test-cards)
- [Mercado Pago Orders API notifications](https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/notifications)
- [Mercado Pago Webhooks and test/production notification URLs](https://www.mercadopago.com.br/developers/en/docs/links-and-debts/additional-content/your-integrations/notifications/webhooks)
- [Next.js CLI: `next build --webpack`](https://nextjs.org/docs/app/api-reference/cli/next)
