# Delta for Catalog Products Domain

## ADDED Requirements

### Requirement: Product aggregate
The system MUST model a product as a publishable catalog item with variants, category, brand, pricing, images, and active/archive state. It MUST NOT treat a product as a flat SKU-only item.

#### Scenario: Product has catalog context
- GIVEN a product is available to shoppers
- WHEN its catalog data is evaluated
- THEN it MUST include category, brand, price, publication state, and an image

#### Scenario: Product is archived
- GIVEN a product is archived or inactive
- WHEN public catalog behavior is evaluated
- THEN it MUST be excluded from shopper-facing results

### Requirement: Variants, categories, and brands
The system MUST support variants with size, color, stock, optional price, SKU, and image. It MUST support flat MVP categories `Botines`, `Camisetas`, `Entrenamiento`, and `Accesorios`; categories MAY include `parentId`. MVP brands MUST be fictional/proprietary.

#### Scenario: Variant price overrides product price
- GIVEN a selected variant has a price
- WHEN display pricing is evaluated
- THEN that price MUST be used for the selection

#### Scenario: Restricted brand is proposed
- GIVEN a third-party sports brand is proposed for MVP data
- WHEN the data is validated
- THEN it MUST NOT be accepted

### Requirement: Pricing and images
The system MUST use ARS `price` and nullable `compareAtPrice`; a sale exists only when compare-at price exceeds price. Images MUST have alt text, position ordering, optional variant association, and exactly one primary image per product.

#### Scenario: Sale is evaluated
- GIVEN compare-at price is null or not greater than price
- WHEN sale status is evaluated
- THEN the product MUST NOT be marked on sale

#### Scenario: Gallery data is evaluated
- GIVEN a product has multiple images
- WHEN images are presented
- THEN they MUST be ordered and identify the primary image

### Requirement: First-slice boundary
The first slice MUST use local typed mock data and MUST NOT add Prisma, persistence, API routes, cart, checkout, payments, or admin management.

#### Scenario: Backend work is proposed
- GIVEN a first-slice task proposes persistence or APIs
- WHEN scope is evaluated
- THEN it MUST be deferred