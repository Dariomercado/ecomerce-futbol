# Product Detail UI Specification

## Purpose

Defines the MVP product detail route and shopper-facing presentation for gallery, context, pricing, variants, and disabled/mock cart behavior.

## Requirements

### Requirement: Product detail route

The MVP product detail UI MUST use `/productos/[slug]` as the real detail route for product pages.

#### Scenario: Shopper opens product detail
- GIVEN a product slug exists in MVP catalog data
- WHEN `/productos/[slug]` is visited
- THEN the product detail experience MUST display that product

#### Scenario: Product slug is unavailable
- GIVEN no product exists for the requested slug
- WHEN the detail route is visited
- THEN the UI MUST show an appropriate unavailable or not-found state

### Requirement: Product gallery

The detail UI MUST show a gallery using product images. If multiple images exist, the UI SHOULD provide simple gallery navigation or thumbnail selection.

#### Scenario: Product has multiple images
- GIVEN a product has ordered images
- WHEN the detail page renders
- THEN the primary image MUST be shown first and additional images SHOULD be accessible

#### Scenario: Product has one image
- GIVEN a product has only one image
- WHEN the detail page renders
- THEN the UI MUST still present the image with required accessible alt text

### Requirement: Product context and pricing

The detail UI MUST show brand, category, product name, pricing, sale state when applicable, and relevant variant pricing when a variant is selected.

#### Scenario: Product is on sale
- GIVEN compareAtPrice is greater than price
- WHEN pricing is displayed
- THEN both sale and compare-at pricing MUST communicate the sale state

#### Scenario: Variant has price override
- GIVEN a selected variant has a variant price
- WHEN the variant is selected
- THEN the UI MUST display the selected variant price context

### Requirement: Variant selection

The detail UI SHOULD show variant options when applicable, including size, color, stock context, and variant image context when available. It MUST provide helper copy when selection is required or unavailable.

#### Scenario: Variant selection is required
- GIVEN a product has variants
- WHEN no variant is selected
- THEN the UI SHOULD guide the shopper to choose available options before cart intent

#### Scenario: Variant is out of stock
- GIVEN a variant has no stock
- WHEN options are displayed
- THEN the UI SHOULD communicate that the variant is unavailable

### Requirement: Mock cart CTA boundary

The detail UI MUST include a mock or disabled `Agregar al carrito` CTA for MVP. It MUST NOT create cart state, API calls, Server Actions, persistence, checkout, or payment behavior.

#### Scenario: Shopper clicks mock cart CTA
- GIVEN the MVP detail page displays the cart CTA
- WHEN the shopper attempts to add the item
- THEN the UI MUST communicate that cart functionality is not available yet

#### Scenario: Checkout behavior is proposed
- GIVEN MVP detail scope is being planned
- WHEN real cart, checkout, or Mercado Pago behavior is requested
- THEN that behavior MUST be deferred to a later slice
