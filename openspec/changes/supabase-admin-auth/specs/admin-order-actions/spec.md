# Admin Order Actions Specification

## Purpose
Human cancel/refund actions.

## Requirements

### Requirement: Authorized cancel and refund

Cancel/refund MUST require an active operator session and membership. Existing commerce behavior MUST remain; the temporary human bearer token MUST be rejected.

#### Scenario: Valid action
- GIVEN an active operator requests a domain-valid cancellation or refund
- WHEN evaluated
- THEN existing domain rules MUST execute

#### Scenario: Denied action
- GIVEN session or membership is missing, revoked, or unavailable
- WHEN cancel/refund is requested
- THEN it MUST be denied without order or payment changes

### Requirement: Auditable order action

Every cancel/refund reaching domain evaluation MUST append an audit with actor, action, entity, timestamp, outcome, and bounded context. Audit failure MUST NOT report success.

#### Scenario: Traceable refund
- GIVEN an authorized refund completes
- WHEN its result is returned
- THEN its audit MUST identify actor, refund, order, time, outcome, and context

### Requirement: Independent scheduler credential

`RECONCILIATION_CRON_SECRET` MUST remain machine-to-machine and independent of human sessions.

#### Scenario: Scheduler invocation
- GIVEN reconciliation presents the scheduler credential
- WHEN reconciliation runs
- THEN it MUST authenticate without an operator session
