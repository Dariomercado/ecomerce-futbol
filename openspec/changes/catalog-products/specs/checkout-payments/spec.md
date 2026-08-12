# Checkout Payments Specification

## Purpose

Provide in-storefront card checkout with local order and provider evidence authoritative.

## Requirements

### Requirement: Supported Card Payment Scope

The system MUST accept credit cards and only debit cards supported at the Mercado Pago site. It MUST reject other rails and MUST NOT redirect buyers away from the storefront.

#### Scenario: Supported card is offered
- GIVEN a pending local order
- WHEN a supported card rail is selected
- THEN the system SHALL allow its in-storefront payment attempt

#### Scenario: Unsupported rail is selected
- GIVEN the buyer selects Pix, boleto, account balance, or unsupported debit
- WHEN payment is requested
- THEN the system MUST refuse without provider submission

### Requirement: Secure Card-Data Boundary

The system MUST use MercadoPago.js tokenization. PAN and CVV MUST NOT reach, be stored by, or be logged by the application server.

#### Scenario: Card token is submitted
- GIVEN browser tokenization succeeds
- WHEN the buyer confirms payment
- THEN the server SHALL receive a token and non-sensitive data

#### Scenario: Tokenization fails
- GIVEN tokenization fails or yields no usable token
- WHEN the buyer confirms payment
- THEN the pending order MUST remain retryable and MUST NOT submit a Mercado Pago provider payment or order attempt

### Requirement: Authoritative Payment Submission

Before submission, the system MUST revalidate the local order, server totals, available stock, and provider linkage. It MUST request automatic processing with immediate capture, never authorization-only or delayed capture.

#### Scenario: Valid local order is submitted
- GIVEN revalidation succeeds
- WHEN payment is submitted
- THEN the provider request SHALL represent the revalidated order and immediate-capture intent

#### Scenario: Order validation fails
- GIVEN totals, stock, or linkage are invalid
- WHEN payment is submitted
- THEN the system MUST decline submission and present safe next steps

### Requirement: Retry-Safe Payment Intent

The system MUST use a deterministic idempotency identity per checkout intent. A retry MUST return or reconcile the original provider attempt and MUST NOT create a duplicate charge.

#### Scenario: Transport outcome is unknown
- GIVEN submission times out after dispatch
- WHEN the buyer retries the same intent
- THEN the system SHALL reconcile or reuse the original attempt before new submission

#### Scenario: Intent changes
- GIVEN the buyer changes the order or starts a new intent
- WHEN payment is requested
- THEN the system MUST use a distinct identity and preserve prior-attempt history

### Requirement: Provider-Authoritative Payment State

Browser responses MUST NOT mark orders paid. The system SHALL mark paid only on authoritative accredited evidence; terminal failure SHALL mark the attempt non-payable; non-final or ambiguous evidence SHALL remain pending.

#### Scenario: Accredited provider outcome
- GIVEN provider evidence reports processed with accredited detail
- WHEN reconciled
- THEN the local order MUST become paid

#### Scenario: Non-final or ambiguous outcome
- GIVEN a browser result, timeout, or provider state is non-final or ambiguous
- WHEN received
- THEN the order MUST remain pending with safe recovery guidance

### Requirement: Authenticated Reconciliation and Safe Recovery

The system MUST authenticate provider webhooks and obtain provider-authoritative order evidence before state changes. Duplicate or out-of-order notifications MUST be idempotent and transitions MUST be monotonic. Credentials and webhook secrets MUST remain server-only and redacted from logs and customer errors.

#### Scenario: Duplicate or stale notification
- GIVEN a verified notification repeats or arrives after a later state
- WHEN processed
- THEN the system MUST retain the highest valid state without duplicate fulfillment or charge

#### Scenario: Invalid notification
- GIVEN a notification is unauthenticated or fails signature verification
- WHEN received
- THEN the system MUST reject it and MUST NOT change payment state

#### Scenario: Authenticated terminal failure
- GIVEN authenticated provider evidence is terminally unsuccessful
- WHEN reconciled
- THEN the local order MUST remain unpaid, record a terminal failed attempt, and allow safe retry without a duplicate charge