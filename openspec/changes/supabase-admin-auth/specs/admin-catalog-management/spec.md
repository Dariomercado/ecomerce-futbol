# Admin Catalog Management Specification

## Purpose
Auditable operator catalog operations.

## Requirements

### Requirement: Bounded catalog operations

Active membership MUST authorize catalog operations. The capability MUST support product listing, create, update, and archive under existing category, brand, variant, image, pricing, publication, and stock rules. Hard delete, bulk import, promotions, advanced inventory, and RBAC are excluded.

#### Scenario: Valid creation
- GIVEN an active operator submits valid required catalog fields
- WHEN create is evaluated
- THEN one product MUST be created

#### Scenario: Invalid update
- GIVEN required data is missing or violates an aggregate rule
- WHEN create or update is requested
- THEN it MUST be rejected without partial change

#### Scenario: Archived product
- GIVEN an operator archives a product
- WHEN public listing, detail, or featured results are evaluated
- THEN it MUST be excluded

### Requirement: Catalog audit traceability

Every catalog read, create, update, and archive MUST append an audit containing actor, action, entity, timestamp, outcome, and bounded context. Authorization or audit failure MUST fail closed.

#### Scenario: Mutation audit
- GIVEN an authorized operator updates a product
- WHEN the operation completes
- THEN the audit MUST identify actor, action, product, time, outcome, and changed fields

### Requirement: Public and guest boundary

Admin catalog MUST NOT require authentication for public browsing or guest checkout, and mutations MUST NOT be exposed through public read APIs.

#### Scenario: Guest independence
- GIVEN a shopper has no Supabase session
- WHEN public catalog and guest checkout are used
- THEN both MUST continue to work
