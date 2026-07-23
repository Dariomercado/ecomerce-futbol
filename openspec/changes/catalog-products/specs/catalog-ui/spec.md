# Delta for Catalog UI

## ADDED Requirements

### Requirement: Catalog route and navigation
The MVP catalog UI MUST use `/catalogo` as its only catalog route. Navigation MAY use `/catalogo`, category query URLs, and `featured=true`; it MUST NOT create standalone category pages.

#### Scenario: Category navigation is selected
- GIVEN a shopper chooses Botines
- WHEN a destination is generated
- THEN it MUST use `/catalogo?category=botines`

#### Scenario: Standalone category page is proposed
- GIVEN MVP scope is planned
- WHEN `/botines` is proposed
- THEN it MUST be deferred

### Requirement: Catalog filters
The UI MUST support Category, Brand, and Featured filters. It SHOULD prepare price, sort, size, color, surface, and availability for V2 without implying they work in MVP.

#### Scenario: MVP filter is applied
- GIVEN catalog products are available
- WHEN Category or Brand is selected
- THEN the visible grid MUST reflect it

#### Scenario: Future filter is shown
- GIVEN a V2 filter is visible
- WHEN a shopper views the MVP catalog
- THEN it MUST NOT appear functional

### Requirement: Responsive catalog content
Desktop filters MUST use a visible sidebar; mobile filters MUST be collapsible. The catalog MUST include result context, a responsive grid, a future sorting affordance, conceptual pagination, and a recoverable empty state.

#### Scenario: Desktop catalog renders
- GIVEN a desktop viewport
- WHEN `/catalogo` renders
- THEN filters MUST be visible beside the grid

#### Scenario: No products match
- GIVEN no products match selected filters
- WHEN the catalog renders
- THEN an empty state MUST explain the result and SHOULD allow recovery

### Requirement: Editorial categories
The catalog SHOULD provide visually distinct category cards with future image support.

#### Scenario: Editorial section renders
- GIVEN MVP categories exist
- WHEN editorial content renders
- THEN categories SHOULD appear as distinct cards