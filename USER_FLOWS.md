# User flows

These flows describe the intended customer experience across the current
storefront and planned commerce slices.

## Flow 1 - Browse products

1. User lands on the home page.
2. User sees featured football products and category entry points.
3. User opens the product listing.
4. User scans product cards with image, name, price, category, and stock label.
5. User opens a product detail page.

Success condition: the user understands what is sold and can inspect a product
without needing login.

## Flow 2 - Browse by category

1. User selects a category, such as shirts, boots, accessories, or balls.
2. User sees a filtered product grid.
3. User opens a product detail page from that category.
4. User can return to the category or product listing.

Success condition: category navigation feels clear and predictable.

## Flow 3 - Add to cart prototype

Status: planned after storefront UI.

1. User selects product options if needed.
2. User adds the product to a local cart.
3. User sees cart quantity feedback.
4. User opens the cart page.
5. User updates quantity or removes the item.

Success condition: cart behavior is validated with local state before persistence.

## Flow 4 - Guest checkout

Status: planned after the cart slice.

1. User reviews cart.
2. User opens checkout.
3. User may continue as a guest; sign-in or account creation is optional.
4. User provides contact and shipping data.
5. User confirms payment through the approved Mercado Pago boundary.
6. User reaches an order success page.

Success condition: a guest can place an order without authentication. When a
customer is authenticated, the order may reference that Supabase user without
moving order data out of Prisma + PostgreSQL.

## Flow 5 - Admin catalog management

Status: deferred until after the authentication slice.

1. An administrator authenticates through Supabase Auth.
2. The application verifies the authenticated identity is authorized for admin
   operations.
3. The administrator manages catalog data through admin-only APIs.

Success condition: unauthenticated users and authenticated users without admin
authorization cannot access catalog mutations. Authentication establishes
identity; it does not grant authorization by itself.
