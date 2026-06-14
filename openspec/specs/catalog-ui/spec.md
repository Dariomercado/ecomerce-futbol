# Catalog UI Specification

## Purpose

Defines `/catalogo` catalog browsing UX for the MVP and prepared V2 filter expansion without creating category-specific pages.

## Requirements

### Requirement: Catalog route and navigation

The MVP catalog UI MUST use `/catalogo` as the only real catalog route. Navigation MAY link to `/catalogo`, `/catalogo?category=botines`, `/catalogo?category=camisetas`, and `/catalogo?featured=true`. The MVP MUST NOT create `/botines`, `/camisetas`, `/entrenamiento`, or `/accesorios` pages.

#### Scenario: Category navigation is selected
- GIVEN a shopper chooses Botines navigation
- WHEN the destination is generated
- THEN it MUST point to `/catalogo?category=botines`

#### Scenario: SEO category page is requested for MVP
- GIVEN MVP scope is being planned
- WHEN `/botines` or similar standalone category routes are proposed
- THEN those routes MUST be deferred out of MVP

### Requirement: Catalog filters

The MVP catalog UI MUST support Category, Brand, and Featured filters. It SHOULD prepare future filters for min/max price, sort, size, color, surface, and availability without requiring them in MVP.

#### Scenario: MVP filter is applied
- GIVEN products and categories are available
- WHEN a shopper selects Category or Brand
- THEN the visible product grid MUST reflect that filter

#### Scenario: Future filter is unavailable
- GIVEN a V2-only filter is shown as planned or disabled
- WHEN the shopper views MVP catalog
- THEN the UI MUST NOT imply the unavailable filter is functional

### Requirement: Responsive filter layout

Desktop catalog filters MUST be visible in a sidebar. Mobile catalog filters MUST be collapsible through a panel, accordion, or equivalent compact interaction.

#### Scenario: Desktop shopper opens catalog
- GIVEN a desktop viewport
- WHEN `/catalogo` is displayed
- THEN filters MUST be visible beside the product grid

#### Scenario: Mobile shopper opens catalog
- GIVEN a mobile viewport
- WHEN `/catalogo` is displayed
- THEN filters MUST be accessible without permanently occupying the main product grid space

### Requirement: Catalog content layout

The catalog UI MUST include a top bar with result context and future sorting affordance, a responsive product grid, conceptual pagination, and an empty state.

#### Scenario: Products match filters
- GIVEN products match the selected filters
- WHEN the catalog renders
- THEN product cards MUST be displayed in a responsive grid with result context

#### Scenario: No products match filters
- GIVEN no products match selected filters
- WHEN the catalog renders
- THEN an empty state MUST explain that no products were found and SHOULD allow recovery

### Requirement: Editorial category grid

The catalog experience SHOULD include an editorial category grid with variable card sizes and support for future category images.

#### Scenario: Category editorial section is displayed
- GIVEN MVP categories exist
- WHEN the catalog page renders editorial category content
- THEN categories SHOULD be shown as visually distinct cards that can later include images
