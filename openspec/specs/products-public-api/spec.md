# Products Public API Specification

## Purpose

Defines the future public read-only API behavior for catalog browsing, product detail, categories, brands, and featured products. This specification does not authorize implementation in the current slice.

## Requirements

### Requirement: Public read-only product APIs

The system SHOULD expose future public read-only endpoints for `GET /api/products`, `GET /api/products/[slug]`, `GET /api/categories`, `GET /api/brands`, and `GET /api/featured-products`. The public API MUST NOT include admin mutations in MVP.

#### Scenario: Shopper requests product list
- GIVEN public API behavior is available
- WHEN a shopper requests `GET /api/products`
- THEN the response MUST return published product summaries only

#### Scenario: Mutation is requested through public API
- GIVEN a client attempts to create, update, archive, or delete a product through the public API
- WHEN the request is evaluated
- THEN the behavior MUST be rejected or deferred to V2 admin capabilities

### Requirement: Product list filters

`GET /api/products` MUST support query parameters category, brand, minPrice, maxPrice, sort, search, featured, page, and limit. Unsupported or invalid filters SHOULD produce a safe empty result or validation error.

#### Scenario: Valid filtered request
- GIVEN products exist for category `botines` and brand `norte-fc`
- WHEN `GET /api/products?category=botines&brand=norte-fc` is requested
- THEN only matching active/published product summaries MUST be returned

#### Scenario: Price range has no matches
- GIVEN no active products fall within the requested price range
- WHEN minPrice and maxPrice are applied
- THEN the response MUST return an empty result without exposing inactive products

### Requirement: Publication filtering

Public API responses MUST include only active/published products, categories, and brands where applicable. Archived/inactive products MUST be excluded from list, detail, and featured responses.

#### Scenario: Archived product slug is requested
- GIVEN a product exists but is archived
- WHEN `GET /api/products/[slug]` is requested for that slug
- THEN the API MUST behave as not found for public consumers

### Requirement: Product detail response

Product detail MUST return product data with variants, images, category, and brand. Missing active product detail MUST produce a not-found style response.

#### Scenario: Active product detail is requested
- GIVEN an active product exists for the requested slug
- WHEN the detail endpoint is requested
- THEN the response MUST include product, variants, images, category, and brand

#### Scenario: Unknown slug is requested
- GIVEN no active product exists for the requested slug
- WHEN the detail endpoint is requested
- THEN the response MUST indicate the product was not found

### Requirement: Optimized card summaries

Catalog and featured list responses MUST return product card summaries optimized for browsing rather than full detail payloads.

#### Scenario: Catalog list response is rendered
- GIVEN active products match the request
- WHEN product list data is returned
- THEN each item MUST include enough data for a product card without requiring full variant detail
