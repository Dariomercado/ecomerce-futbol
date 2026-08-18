# Proposal: Complete Protected Post-Payment Operations

## Intent

Complete the started cancellation/refund slice without duplicating its foundation. States, provider operations, an idempotent ledger, stock transitions, webhooks, migration SQL, and tests already exist. The remaining gap is a protected administrative HTTP boundary plus provisional operator documentation.

## Scope

### In Scope
- Specify and expose administrative cancel/refund endpoints protected by a temporary server-only token.
- Enforce cancellation only before `PAID`, refund only after `PAID`, and stock restoration after a successful refund.
- Preserve the existing provider-authoritative implementation and document temporary configuration and limits.
- Apply the Prisma migration and regenerate the client.

### Out of Scope
- Reimplementing existing states, gateway, ledger, stock, idempotency, or webhooks.
- Customer self-service, partial refunds, or admin UI.
- Supabase identity, sessions, roles, or permissions; track these in the separate future change `supabase-admin-auth`.

## Capabilities

### New Capabilities
- `post-payment-operations`: Administrative authorization, lifecycle rules, idempotency, reconciliation, and stock effects.

### Modified Capabilities
- None.

## Approach

Use the direct implementation as the baseline. Add thin routes that authenticate the temporary token before invoking the established service. Specify observable behavior and operator guidance without redesigning provider or persistence internals. Supabase Auth + RBAC later replaces only this authorization boundary.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/internal/` | Modified | Add protected cancel/refund routes. |
| `src/lib/payments/post-payment.ts` | Existing | Reuse operation orchestration. |
| `prisma/schema.prisma`, `prisma/migrations/20260815000000_post_payment_operations/` | Operational | Apply migration and regenerate client. |
| `.env.example`, operator docs | Modified/New | Document token and safe operation. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Temporary token leaks | Medium | Keep it server-only, redact logs, document rotation. |
| Provider succeeds while local update is interrupted | Medium | Reuse ledger idempotency and provider-authoritative reconciliation. |
| Refund restocks twice | Low | Preserve transactional terminal-state/idempotency guards. |
| Old SDD config defers Prisma/payments | Medium | Use current repository evidence as authoritative. |

## Rollback Plan

Disable routes by removing/rotating the token and revert route/documentation changes. Preserve ledger evidence; never reverse a confirmed provider refund automatically. Reconcile in-flight operations first.

## Dependencies

- Apply the existing Prisma migration to the target database.
- Stop Next.js if its Prisma DLL lock blocks `prisma generate`, then regenerate.
- Valid Mercado Pago server credentials and provider connectivity for live operations.

## Success Criteria

- [ ] Unauthorized administrative requests cannot invoke cancellation or refund work.
- [ ] Cancellation is accepted only before `PAID`; refund is accepted only after `PAID`.
- [ ] A successful refund restores stock exactly once and retries remain idempotent.
- [ ] Token setup, rotation, limits, and Supabase replacement are documented.
