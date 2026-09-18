# Admin Operator Auth Specification

## Purpose
Admin operator sessions.

## Requirements

### Requirement: Verified membership authorization

Sensitive requests MUST require a verified invited Supabase user and active Prisma membership keyed by immutable user ID. Metadata and stale claims MUST NOT authorize.

#### Scenario: Active operator
- GIVEN a verified invited session and active membership
- WHEN `/admin` or a sensitive operation is requested
- THEN access MUST be granted

#### Scenario: Revoked operator
- GIVEN membership was revoked
- WHEN the next sensitive request is made
- THEN forbidden state MUST return

### Requirement: Session lifecycle and denial states

The system MUST support invite sign-in, callback, cookie refresh, verification, and sign-out. Missing sessions MUST return unauthenticated; `/admin` MUST distinguish forbidden and unavailable states.

#### Scenario: Verification outage
- GIVEN identity or membership verification is unavailable
- WHEN an admin request is made
- THEN unavailable state MUST return; public catalog and guest checkout remain available

### Requirement: Mutation request integrity

Cookie-authenticated unsafe requests MUST pass same-origin and CSRF checks before state changes.

#### Scenario: Cross-origin request
- GIVEN an authenticated operator submits an unsafe cross-origin request
- WHEN evaluated
- THEN it MUST be rejected without state change




