# Delta for Product Detail UI

## ADDED Requirements

### Requirement: Product detail route

The detail UI MUST use `/productos/[slug]` and MUST source visible products through the public catalog contract.

#### Scenario: Existing product opens
- GIVEN a published product slug exists
- WHEN its route is visited
- THEN the detail experience MUST display that product

#### Scenario: Product is unavailable
- GIVEN no visible product exists for the slug
- WHEN the route is visited
- THEN the UI MUST show an unavailable or not-found state

### Requirement: Gallery and product context

The detail UI MUST show product images, brand, category, name, pricing, and sale state. The primary image MUST appear first, multiple images SHOULD be navigable, and selected-variant pricing MUST be reflected.

#### Scenario: Product is on sale
- GIVEN compare-at price exceeds the displayed price
- WHEN pricing renders
- THEN the UI MUST communicate sale and compare-at pricing

#### Scenario: Product has one image
- GIVEN only one image exists
- WHEN the page renders
- THEN it MUST present that image with accessible alt text

### Requirement: Variant selection

The detail UI MUST require a selected active variant before add-to-cart when the product exposes variants. It MUST communicate unavailable stock and MUST allow variantless products to proceed without a synthetic selection.

#### Scenario: Required variant is missing
- GIVEN a product exposes active variants and none is selected
- WHEN add-to-cart intent is shown
- THEN the CTA MUST be disabled and selection guidance MUST be displayed

#### Scenario: Selected variant is out of stock
- GIVEN the selected variant has zero available stock
- WHEN add-to-cart intent is shown
- THEN the CTA MUST be disabled and unavailability MUST be displayed

#### Scenario: Product has no variants
- GIVEN a visible product exposes no variants
- WHEN add-to-cart intent is shown
- THEN the product MUST be eligible for a variantless cart line

### Requirement: Cart handoff

The detail UI MUST submit the visible product and selected variant identity, price, and stock needed by the `cart` capability. It MUST NOT initiate checkout, payment, or durable persistence.

#### Scenario: Eligible selection is added
- GIVEN the product selection satisfies its variant and stock rules
- WHEN the shopper activates `Agregar al carrito`
- THEN the selection MUST be handed to the local cart

#### Scenario: Checkout is requested
- GIVEN the product detail is displayed
- WHEN checkout or payment behavior is requested
- THEN the detail UI MUST NOT provide that behavior
