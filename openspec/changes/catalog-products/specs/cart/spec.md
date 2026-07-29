# Cart Specification

## Purpose

Define the local, session-only cart delivered before checkout, payment, authentication, or durable persistence.

## Requirements

### Requirement: Eligible cart selection

The cart MUST accept a visible product with its effective unit price. When a product exposes active variants, it MUST require one selected variant and MUST reject a zero-stock selection. A product without variants MUST be accepted without a synthetic variant.

#### Scenario: Variant is required
- GIVEN a product exposes active variants and none is selected
- WHEN the shopper attempts to add it
- THEN the cart MUST NOT add a line

#### Scenario: Variantless product is added
- GIVEN a product exposes no variants
- WHEN the shopper adds it
- THEN the cart MUST create a variantless line with quantity one

#### Scenario: Out-of-stock variant is rejected
- GIVEN a selected variant has zero available stock
- WHEN the shopper attempts to add it
- THEN the cart MUST NOT add or increment a line

### Requirement: Cart line identity

The cart MUST identify a line by product plus selected variant. Equivalent selections MUST consolidate into one line; selections with different variants MUST remain distinct.

#### Scenario: Equivalent selection is added twice
- GIVEN a line exists for a product and variant
- WHEN the same product and variant are added again
- THEN the existing line quantity MUST increase by one

#### Scenario: Different variants are added
- GIVEN a line exists for one product variant
- WHEN another variant of that product is added
- THEN the cart MUST create a separate line

### Requirement: Quantity and removal

The cart MUST change quantity in whole-unit steps and MUST NOT exceed the selected variant's available stock. Decrementing quantity one MUST remove that line. Activating `Remove` MUST delete the complete line regardless of quantity.

#### Scenario: Increment within stock
- GIVEN a line quantity is below its selected variant stock
- WHEN the shopper increments it
- THEN quantity MUST increase by exactly one

#### Scenario: Decrement above one
- GIVEN a line quantity is greater than one
- WHEN the shopper decrements it
- THEN quantity MUST decrease by exactly one

#### Scenario: Increment would exceed stock
- GIVEN a line quantity equals its selected variant stock
- WHEN the shopper attempts to increment it
- THEN the quantity MUST remain unchanged

#### Scenario: Decrement removes a unit line
- GIVEN a line quantity equals one
- WHEN the shopper decrements it
- THEN the complete line MUST be absent

#### Scenario: Remove deletes the line
- GIVEN a cart line has any positive quantity
- WHEN the shopper activates `Remove`
- THEN the complete line MUST be absent

### Requirement: Cart summaries and empty state

The cart MUST derive header count from the sum of all line quantities and total from each effective unit price multiplied by quantity. With no lines, `/carrito` MUST show an empty state and a path to `/catalogo`.

#### Scenario: Multiple lines are summarized
- GIVEN the cart contains lines with known prices and quantities
- WHEN header and cart summary render
- THEN count and total MUST equal their derived sums

#### Scenario: Last line is removed
- GIVEN the cart contains one line
- WHEN that line is removed
- THEN `/carrito` MUST show the empty state and catalog path

### Requirement: Session-only boundary

Cart state MUST remain client-local for the current page session. It MUST NOT be persisted to browser storage, cookies, a server, or a database, and MUST NOT provide checkout or payment behavior.

#### Scenario: Page session reloads
- GIVEN the cart contains lines
- WHEN a fresh page session is created
- THEN the cart MUST start empty

#### Scenario: Checkout is unavailable
- GIVEN the cart contains lines
- WHEN the cart summary renders
- THEN checkout and payment actions MUST NOT be available
