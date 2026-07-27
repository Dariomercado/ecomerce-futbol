# Project vision

This project is a portfolio-grade football ecommerce concept. It demonstrates
product thinking, UI craft, incremental architecture, and interview-ready
decision making from a mock-first storefront toward real commerce boundaries.

## Goals

| Goal | Definition |
| --- | --- |
| Portfolio goal | Present a polished sports commerce experience that feels like a real brand, not a generic marketplace clone. |
| Technical interview goal | Demonstrate architectural judgment: scoped MVP, documented tradeoffs, mock-first delivery, accessibility, testing strategy, and future backend boundaries. |

## Product positioning

The store sells football products with a modern, athletic, premium identity. The experience should prioritize discovery, confidence, and a clear path to purchase.

The project should communicate:

- Strong visual direction.
- Clear product categorization.
- Professional ecommerce UX.
- Maintainable frontend boundaries.
- Backend readiness without premature infrastructure.

## Original storefront MVP scope

The first MVP was a mock-driven storefront focused on validating the public
shopping experience. That slice is complete; persistence and the public catalog
API were added in later slices.

Required MVP scope:

- Home page.
- Product catalog.
- Category browsing.
- Product detail page.
- Featured products.
- Product cards with realistic prices, badges, and stock states.
- Responsive layout.
- Light and dark visual foundations.
- Local mock catalog data.
- Accessibility-conscious navigation, buttons, forms, and product cards.

Explicitly out of scope for MVP:

- Real database.
- Authentication.
- Persistent cart.
- Real checkout.
- Mercado Pago.
- Admin backend.
- Prisma, Supabase, migrations, or provider secrets.

## V2 scope

V2 validates commerce behavior after the storefront experience is approved.

Planned V2 scope:

- Local cart state.
- Cart page.
- Mock checkout.
- Order success page.
- Checkout form validation.
- Empty states, loading states, and error states.
- Product option selection for size, color, or variant.
- Initial account and admin route placeholders if needed for navigation planning.

## Delivery stack

| Area | Expected direction |
| --- | --- |
| Package manager | `pnpm` |
| Frontend | Next.js |
| Styling | Tailwind CSS |
| UI primitives | shadcn/ui, customized with project tokens |
| Data source first slice | Local mock data; migration to the public API is Slice 4 |
| Testing | Vitest, Testing Library, Playwright when the app exists |
| Commercial data | Prisma + PostgreSQL for catalog, cart, orders, and related records |
| Authentication | Supabase Auth in a future slice |
| Customer account | Optional; checkout remains available to guests |
| Admin access | Supabase-authenticated identity plus application authorization |
| Payments later | Mercado Pago after checkout assumptions are validated |

## Mandatory functionality

- Users can understand what the brand sells from the home page.
- Users can browse products from the catalog.
- Users can filter or navigate by category.
- Users can search for products once catalog UI exists.
- Users can inspect product details.
- Users can see price, category, availability, and primary product imagery.
- Featured products are clearly promoted.
- The UI works responsively across mobile, tablet, and desktop.
- The visual identity uses the official palette and avoids marketplace/dashboard defaults.

## Optional functionality

- Wishlist or favorites.
- Product comparison.
- Recently viewed products.
- Newsletter capture.
- Discount code mock UI.
- Size guide.
- Product reviews.
- Club/team collections.
- Admin catalog dashboard.

## Success criteria

| Area | Success criteria |
| --- | --- |
| Product | The project reads as a focused football ecommerce brand with clear MVP boundaries. |
| UX | A reviewer can follow discovery -> product detail -> cart/checkout planning without guessing missing flows. |
| UI | The interface feels modern, athletic, professional, and elegant. |
| Architecture | Documentation explains the boundary between Supabase identity, application authorization, and Prisma/PostgreSQL commercial data. |
| Portfolio | The project can be discussed in interviews as a deliberate architecture and product case study. |
| Maintainability | Future code can follow feature-oriented structure without mixing catalog, cart, checkout, and admin concerns. |
