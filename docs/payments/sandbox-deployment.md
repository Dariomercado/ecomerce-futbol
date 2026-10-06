# Deploy Preview Mercado Pago sandbox

Enable sandbox checkout only in an isolated Netlify **Deploy Preview**, using user-confirmed Mercado Pago TEST credentials and the existing fictitious portfolio data. Set `PAYMENTS_ENABLED=true` only for that preview; **Production stays `PAYMENTS_ENABLED=false`**. This replaces the earlier Production-hosted sandbox policy. Never substitute real-money credentials or treat a local build as hosted-payment proof.

## Configure the hosted demo

Set these site environment variables for the intended Netlify **Deploy Preview** context. Netlify applies context-specific values at deploy time; changing the public key requires a new deploy. Other previews must remain payment-disabled unless separately isolated.

| Variable | Isolated Deploy Preview value | Exposure |
| --- | --- | --- |
| `PAYMENTS_ENABLED` | `true` only for the isolated test preview; `false` in Production | Gates new checkout/payment creation; it does not disable payment webhook reconciliation. |
| `PAYMENT_METHOD_IDS` | `visa,master` (or the methods enabled for the test account) | Server-side allowlist. |
| `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` | Mercado Pago **test** public key | Public; compiled into the browser bundle, never a secret. |
| `MERCADO_PAGO_ACCESS_TOKEN` | Mercado Pago **test** access token | Server-only secret. |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Signing secret for the Mercado Pago test-mode webhook URL | Server-only secret. |
| `DATABASE_URL` | The existing hosted portfolio database containing only fictitious data | Server-only connection string; this demo does not require a new database. Never use real client data. |
| `NEXT_PUBLIC_APP_URL` | The intended PR-specific HTTPS Deploy Preview origin | Public build-time value; do not use the Production origin. |
| `APP_ORIGIN` | The same exact preview HTTPS origin | Server-only exact-origin setting. |

The app also needs its existing Supabase configuration: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; add `SUPABASE_SERVICE_ROLE_KEY` only if catalog images use Supabase Storage. The service-role key is server-only. Scope it to the intended environment. Do not put secrets in `netlify.toml` or the repository; configure them in Netlify's site environment-variable settings.

Obtain the public key and access token from verified test settings for the intended seller application; an `APP_USR` prefix alone does not establish credential mode. Match the preview's test-mode callback, signing secret, and fictitious portfolio data. Do not enable the scheduler-only `RECONCILIATION_CRON_SECRET` or admin-only `POST_PAYMENT_ADMIN_TOKEN` just to run a buyer checkout demo.

## Preview #33 staging status

The owner confirms that all relevant local and existing Netlify Mercado Pago values are TEST and the portfolio has no real clients or real data. Stage only branch `feat/buy-now-sandbox-demo`; preserve Production and other contexts. Keep `PAYMENTS_ENABLED=false` until the preview is rebuilt and the provider TEST callback matches the preview. The provider callback currently still targets ngrok; Netlify staging does not move it. No hosted payment or signed webhook proof is claimed. The corrected public-key create was rejected; authoritative readback still shows the key absent. Branch TEST credentials/database/origin staging and rebuild remain pending; branch and Production checkout stay disabled.

Reuse the existing hosted `DATABASE_URL` by inheritance or a branch-specific override; never upload a localhost connection string. `TEST_DATABASE_URL` is separate and applies only to dedicated PostgreSQL integration tests, not to this hosted portfolio deployment.

## Configure and retain the preview webhook

Register `https://<intended-pr-deploy-preview>/api/webhooks/mercado-pago` as the Mercado Pago application's **test-mode URL** in Webhooks settings. Select the Orders notifications supported by this app and save the corresponding test-mode signing secret in the isolated Deploy Preview context as `MERCADO_PAGO_WEBHOOK_SECRET`. `APP_ORIGIN` and `NEXT_PUBLIC_APP_URL` must use that exact preview HTTPS origin; only the webhook endpoint adds `/api/webhooks/mercado-pago`. The route verifies the signature and reconciles provider order evidence before applying payment state.

Deploy Preview URLs are PR-specific, not permanent production endpoints. Keep the chosen callback reachable with matching test credentials, signing secret, and data for the lifetime of pending orders; do not retire the preview or repoint the callback while they still need reconciliation. A different preview requires its own matching configuration. Use Mercado Pago's notification simulation to confirm delivery; do not assume Netlify configures provider webhooks. `PAYMENTS_ENABLED=false` blocks new checkout but does not prevent reconciliation of already-created payments.

## Test with provider test accounts

1. Create or select a Mercado Pago test seller for the application and a separate test buyer in the same country. Do not use a real buyer account.
2. Verify the configured seller application's test settings and use its test public key and test access token, not a mode inferred from a credential prefix.
3. Enter a test card from Mercado Pago's current Checkout API test-card guide and use the test buyer details as required there. Card numbers and test-user credentials can vary by country and provider scenario; do not copy real card data or credentials into this repository.
4. Complete a payment from the intended HTTPS Deploy Preview. Confirm the UI reports the resulting state and that the order becomes terminal only after verified provider evidence.
5. Confirm the provider delivered a signed notification to the matching preview webhook URL, the endpoint accepted it, and the demo test order/payment records reflect the authoritative state. A browser redirect alone is not webhook proof.

## Acceptance checklist

- [ ] The isolated Deploy Preview has the exact environment variable names above, verified test credentials, and fictitious portfolio data in the existing database.
- [ ] `PAYMENTS_ENABLED=true` applies only to the intended isolated preview; Production remains `PAYMENTS_ENABLED=false` and no real-money credentials are used for the demo.
- [ ] `APP_ORIGIN`, `NEXT_PUBLIC_APP_URL`, and the test-mode webhook URL use the same intended PR-specific HTTPS preview origin.
- [ ] Public key is present in the newly built site bundle; server-only secrets are configured in Netlify and not in client code or repository files.
- [ ] Checkout is reachable over HTTPS and clearly identifies the test/demo context.
- [ ] A provider test buyer/card completes the expected payment flow.
- [ ] Signed test-mode webhook delivery is observed at the matching preview endpoint and the demo test order reaches the expected terminal state.
- [ ] The preview callback remains reachable with matching credentials/data for all pending test orders before the preview or callback is retired.
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
