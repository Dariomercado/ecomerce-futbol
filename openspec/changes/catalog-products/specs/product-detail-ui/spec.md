# Delta for Product Detail UI

## ADDED Requirements

### Requirement: Product detail route
The MVP detail UI MUST use `/productos/[slug]` as the product route.

#### Scenario: Existing product opens
- GIVEN a product slug exists in MVP data
- WHEN its route is visited
- THEN the detail experience MUST display it

#### Scenario: Product is unavailable
- GIVEN no product exists for the slug
- WHEN the route is visited
- THEN the UI MUST show an unavailable or not-found state

### Requirement: Gallery and product context
The detail UI MUST show product images, brand, category, name, pricing, and sale state. The primary image MUST appear first; multiple images SHOULD be navigable. A selected variant price MUST be reflected when present.

#### Scenario: Product is on sale
- GIVEN compare-at price exceeds price
- WHEN pricing renders
- THEN sale and compare-at pricing MUST communicate the sale

#### Scenario: Product has one image
- GIVEN only one image exists
- WHEN the page renders
- THEN it MUST present its accessible alt text

### Requirement: Variant selection
The detail UI SHOULD show size, color, stock, and image context where applicable. It MUST provide helper copy when selection is required or unavailable.

#### Scenario: Variant selection is needed
- GIVEN a product has variants and none is selected
- WHEN cart intent is shown
- THEN the UI SHOULD guide the shopper to select options

#### Scenario: Variant is unavailable
- GIVEN a variant has no stock
- WHEN options render
- THEN the UI SHOULD communicate its unavailability

### Requirement: Mock cart boundary
The detail UI MUST provide a mock or disabled `Agregar al carrito` CTA. It MUST NOT create cart state, API calls, Server Actions, persistence, checkout, or payment behavior.

#### Scenario: Shopper uses mock CTA
- GIVEN the CTA is displayed
- WHEN the shopper attempts to use it
- THEN the UI MUST communicate that cart functionality is unavailable

#### Scenario: Checkout is proposed
- GIVEN MVP detail scope is planned
- WHEN real checkout behavior is requested
- THEN it MUST be deferred