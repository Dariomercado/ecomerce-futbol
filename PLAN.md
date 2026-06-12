# Delivery plan

The project follows a UI-first path. We define the product and frontend experience before adding backend complexity.

## Phase 0 - Project foundation

Status: started.

Deliverables:

- Workspace audit
- Documentation
- Architecture decisions
- Sitemap
- User flows
- Proposed folder structure
- Mock data strategy

## Phase 1 - Storefront UX

Goal: build the first visual ecommerce slice with mock data.

Expected scope:

- Home page
- Product listing
- Product detail
- Category browsing
- Shared layout
- Product cards
- Mock product and category data
- Responsive UI foundation

Out of scope:

- Real database
- Login
- Checkout integration
- Payment processing

## Phase 2 - Cart and checkout prototype

Goal: validate purchase intent flows before real persistence or payment providers.

Expected scope:

- Local cart state
- Cart page
- Mock checkout page
- Order success mock page
- Empty, loading, and error UI states

## Phase 3 - Data modeling

Goal: model the domain after the UI and flows are validated.

Expected scope:

- Product model
- Category model
- Inventory assumptions
- Order model
- Customer/account assumptions

This is the earliest phase where Prisma or Supabase may be considered.

## Phase 4 - Backend integrations

Goal: replace mock data with real infrastructure.

Potential scope:

- Supabase
- Prisma
- Auth
- Persistent cart
- Orders
- Mercado Pago

## Phase 5 - Admin

Goal: manage catalog and operational workflows.

Potential scope:

- Product management
- Category management
- Order management
- Inventory/status controls

## Review checkpoints

- Approve sitemap before implementing routes.
- Approve core user flows before building UI.
- Approve mock data shape before modeling the database.
- Approve checkout assumptions before Mercado Pago integration.

