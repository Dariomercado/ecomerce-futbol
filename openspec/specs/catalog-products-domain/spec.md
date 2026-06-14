# Catalog Products Domain Specification

## Purpose

Defines the catalog product concepts, publication rules, pricing rules, media rules, and MVP/V2 boundaries for the football ecommerce storefront.

## Requirements

### Requirement: Product aggregate

The system MUST model a product as a publishable catalog item with variants, category, brand, pricing, images, and active/archive state. A product MUST NOT be treated as a single flat SKU-only item.

#### Scenario: Product has required catalog context
- GIVEN a catalog product is represented
- WHEN it is made available to shoppers
- THEN it MUST include category, brand, price, publication state, and at least one image

#### Scenario: Product is archived
- GIVEN a product is archived or inactive
- WHEN public catalog behavior is evaluated
- THEN it MUST be excluded from public shopper-facing results

### Requirement: Product variants

The system MUST support conceptual ProductVariant records from the start. A variant MUST support size, color, stock, optional variant price, optional SKU, and optional variant image.

#### Scenario: Variant overrides product price
- GIVEN a product has a variant with a variant price
- WHEN that variant is selected
- THEN the selected variant price MUST be considered the display price for that variant

#### Scenario: MVP keeps variant behavior simple
- GIVEN MVP catalog data includes variants
- WHEN stock or combinations are evaluated
- THEN the system MUST NOT require complex inventory reservation or stock-combination logic

### Requirement: Categories and brands

The system MUST support flat MVP categories `Botines`, `Camisetas`, `Entrenamiento`, and `Accesorios`; categories MAY include `parentId` for future hierarchy. Brands MUST be fictional/proprietary and include id, name, slug, description, optional logoUrl, isActive, createdAt, and updatedAt.

#### Scenario: MVP category filter uses flat category
- GIVEN a shopper filters by an MVP category
- WHEN matching products are requested
- THEN products in that category MUST be eligible for results

#### Scenario: Restricted real-world brand appears
- GIVEN a brand such as Nike, Adidas, Puma, or another third-party sports brand is proposed for MVP data
- WHEN brand data is validated
- THEN the brand MUST NOT be accepted as MVP catalog seed or mock brand data

### Requirement: Product pricing

The system MUST support ARS MVP pricing with `price` and nullable `compareAtPrice`. A product is on sale only when `compareAtPrice` is greater than `price`. The system MUST NOT require coupons, automatic discounts, or a promotion engine for MVP.

#### Scenario: Sale price is detected
- GIVEN a product has `price` 80000 and `compareAtPrice` 100000
- WHEN pricing is displayed
- THEN the product MUST be considered on sale

#### Scenario: Compare-at price is absent or invalid for sale
- GIVEN `compareAtPrice` is null or not greater than `price`
- WHEN pricing is evaluated
- THEN the product MUST NOT be marked as on sale

### Requirement: Product images

The system MUST support multiple ProductImage records with required alt text, isPrimary, position ordering, and optional variantId. Each product MUST have at least one image and exactly one primary image.

#### Scenario: Product image gallery is ordered
- GIVEN a product has multiple images
- WHEN images are presented
- THEN images MUST be ordered by position and identify the single primary image

#### Scenario: Missing image accessibility text
- GIVEN a product image has no alt text
- WHEN image data is validated
- THEN the image MUST be rejected or treated as incomplete catalog data

### Requirement: First-slice boundaries

The first implementation slice MUST use local typed mock data for UI validation and MUST exclude Prisma, database persistence, API routes, Route Handlers, Server Actions, Supabase, Mercado Pago, real cart, checkout, and admin product management.

#### Scenario: First slice requests persistence
- GIVEN a first-slice catalog task proposes database or API implementation
- WHEN the task is evaluated
- THEN it MUST be deferred to a later slice
