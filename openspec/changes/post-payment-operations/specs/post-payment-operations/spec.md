# Post-Payment Operations Specification

## Purpose

Protect administrative cancellation and refund operations while preserving provider authority, durable idempotency, and stock transitions.

## Requirements

### Requirement: Protected Administrative Operations

The system MUST expose server-side administrative POST operations for cancellation and refund. Each MUST authenticate a configured temporary server-only token before loading an order, contacting Mercado Pago, or changing stock. The token MUST NOT reach browsers, client configuration, responses, or logs.

#### Scenario: Authorized administrator invokes an operation
- GIVEN the temporary token is configured and supplied by an administrative caller
- WHEN cancellation or refund is requested for an order
- THEN the system MAY invoke the established post-payment operation service

#### Scenario: Authorization is absent or invalid
- GIVEN an administrative request lacks the token
- WHEN the route is invoked
- THEN it returns `401` without payment, persistence, or stock work
- AND a mismatched token returns `403` with the same no-side-effect guarantee

### Requirement: Lifecycle Eligibility and HTTP Errors

The system MUST accept cancellation only before `PAID` and refund only when `PAID`. It MUST return `404` for an unknown order, `422` for an ineligible lifecycle state or missing provider order identity, and `409` when that order/operation is already completed.

#### Scenario: Eligible cancellation
- GIVEN an authorized order that is not `PAID`, `CANCELLED`, or `REFUNDED`
- WHEN cancellation succeeds at the provider
- THEN the order becomes `CANCELLED`

#### Scenario: Eligible refund
- GIVEN an authorized order in `PAID`
- WHEN refund succeeds at the provider
- THEN the order becomes `REFUNDED`

#### Scenario: Ineligible operation
- GIVEN an authorized order outside the operation's permitted lifecycle
- WHEN cancellation or refund is requested
- THEN the route returns `422` and does not call the provider

### Requirement: Durable Operation Idempotency and Stock Effects

The system MUST persist one ledger entry per order and operation type and MUST reuse its durable idempotency key for retries. It MUST send that key as `X-Idempotency-Key`. A confirmed cancellation or refund MUST release or replenish stock exactly once; retries, duplicates, and later webhooks MUST NOT change stock again.

#### Scenario: Retried in-progress operation
- GIVEN a running ledger entry for the same order and operation
- WHEN the operation is retried
- THEN Mercado Pago receives the persisted `X-Idempotency-Key`
- AND no second ledger entry or stock transition is created

#### Scenario: Confirmed terminal operation
- GIVEN the provider confirms cancellation or refund
- WHEN the local terminal transition commits
- THEN only still-unreleased reservation quantities are returned once

### Requirement: Provider-Authoritative Reconciliation

The system MUST treat validated provider action results and signed webhook evidence as authoritative. It MUST durably record verified receipts and preserve `CANCELLED` and `REFUNDED` as terminal states; a later webhook is informational and MUST NOT reverse a terminal state or repeat stock work. Provider failures or invalid action responses MUST return `502` and MUST NOT fabricate completion.

#### Scenario: Duplicate or late webhook after a terminal operation
- GIVEN an order is `CANCELLED` or `REFUNDED`
- WHEN a validated provider webhook is processed
- THEN the receipt is acknowledged without another stock or order transition

#### Scenario: Provider action fails
- GIVEN an authorized eligible operation
- WHEN Mercado Pago fails or returns an invalid action result
- THEN the route returns `502` and leaves the operation uncompleted for safe retry or reconciliation

### Requirement: Temporary Token Operations and Preconditions

The temporary token MUST exist only in server environment configuration, be documented for setup and rotation, and be removable/rotatable to disable administrative access. Applying `20260815000000_post_payment_operations` and regenerating the Prisma client are operational preconditions. Supabase Auth, sessions, roles, and RBAC are out of scope and MUST be handled only by future `supabase-admin-auth`.

#### Scenario: Deployment readiness
- GIVEN an environment is prepared for post-payment operations
- WHEN operators enable the administrative boundary
- THEN the migration is applied, Prisma is regenerated, and the token is absent from public configuration