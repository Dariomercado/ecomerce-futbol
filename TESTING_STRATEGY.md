# Testing strategy

Testing starts with the UI and product behavior, then expands as infrastructure is introduced.

## Current phase

The project is documentation-only. There is no app or test runner yet.

## Phase 1 - UI with mock data

Recommended coverage:

- Component tests for product cards, layout, filters, and empty states.
- Interaction tests for product listing and local cart behavior.
- Accessibility checks for navigation, buttons, forms, and product cards.
- Basic visual review for responsive layouts.

## Phase 2 - Cart and checkout prototype

Recommended coverage:

- Add item to cart.
- Update quantity.
- Remove item.
- Empty cart state.
- Mock checkout validation.
- Order success mock flow.

## Phase 3 - Backend integration

Recommended coverage:

- Data mapping from backend records to UI view models.
- Auth-protected route behavior.
- Order creation boundaries.
- Payment provider error states.

## Tooling direction

Future tooling can be selected when Next.js is introduced.

Likely candidates:

- Vitest for unit and component-level tests.
- Testing Library for UI behavior.
- Playwright for end-to-end flows.

Do not add test tooling until the app exists.

