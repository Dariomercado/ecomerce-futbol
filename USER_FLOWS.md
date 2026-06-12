# User flows

These flows describe the intended customer experience before backend implementation.

## Flow 1 - Browse products

1. User lands on the home page.
2. User sees featured football products and category entry points.
3. User opens the product listing.
4. User scans product cards with image, name, price, category, and stock label.
5. User opens a product detail page.

Success condition: the user understands what is sold and can inspect a product without needing login, database, or checkout.

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

## Flow 4 - Mock checkout

Status: planned after cart prototype.

1. User reviews cart.
2. User opens checkout.
3. User fills mock contact/shipping data.
4. User confirms the mock order.
5. User reaches an order success page.

Success condition: the checkout UX is validated before Mercado Pago is introduced.

## Flow 5 - Admin catalog management

Status: deferred.

This flow requires Auth, roles, persistence, and catalog operations. It should be designed after the storefront and data model are approved.

