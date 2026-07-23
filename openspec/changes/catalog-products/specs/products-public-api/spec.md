# Delta for Products Public API

## ADDED Requirements

### Requirement: Public read-only catalog APIs
The system SHOULD expose future read-only endpoints at `GET /api/catalog/products`, `GET /api/catalog/products/[slug]`, `GET /api/catalog/categories`, `GET /api/catalog/brands`, and `GET /api/catalog/featured-products`. It MUST NOT include admin mutations.

#### Scenario: Shopper requests products
- GIVEN public API behavior is available
- WHEN a shopper requests the products endpoint
- THEN it MUST return published product summaries only

#### Scenario: Mutation is requested
- GIVEN a client attempts to mutate a product through the public API
- WHEN the request is evaluated
- THEN it MUST be rejected or deferred to V2 admin capabilities

### Requirement: List filters and envelope
The products endpoint MUST support category, brand, minPrice, maxPrice, sort, search, featured, page, and limit. It MUST compose valid filters and return `{ data, pagination }`; invalid query input MUST return a stable validation error, while no matches MUST return `200` with empty data.

#### Scenario: Valid filters match products
- GIVEN active products match category and brand filters
- WHEN the list endpoint is requested
- THEN only matching published summaries MUST be returned

#### Scenario: No product matches
- GIVEN no active products match valid filters
- WHEN the list endpoint is requested
- THEN it MUST return `200` and `data: []`

### Requirement: Public visibility and detail
Public responses MUST exclude archived/inactive products, categories, and brands. Detail MUST include variants, ordered images, category, and brand; an unknown or inactive slug MUST behave as not found.

#### Scenario: Archived slug is requested
- GIVEN a product is archived
- WHEN its detail endpoint is requested
- THEN it MUST behave as not found

#### Scenario: Active detail is requested
- GIVEN an active product exists
- WHEN its detail endpoint is requested
- THEN it MUST include product context, variants, and images

### Requirement: Browsing summaries
List and featured responses MUST return card-oriented summaries without full variant detail.

#### Scenario: List is rendered
- GIVEN products match a public request
- WHEN list data is returned
- THEN each item MUST support a product card