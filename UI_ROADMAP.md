# UI roadmap

This roadmap defines the planned screens before Next.js exists. It keeps UI decisions independent from backend, auth, payment, and admin infrastructure.

## Home

### Objective

Introduce the football store as a modern sports brand and guide users toward categories and featured products.

### Components

- Hero.
- Featured categories.
- Featured products.
- Benefits section.
- Newsletter section.
- Footer.

### Required data

- Hero title, subtitle, CTA labels, and hero visual.
- Category names, slugs, descriptions, and images.
- Featured product list.
- Benefit copy.
- Newsletter placeholder copy.
- Footer navigation links.

### Future backend integration

- Fetch featured products and categories from the catalog API.
- Manage hero content from admin or CMS-like settings.
- Store newsletter submissions through a marketing or backend service.

## Home sections

| Section | Purpose | Notes |
| --- | --- | --- |
| Hero | Establish brand and primary CTA. | Should feel editorial and athletic, not marketplace-generic. |
| Featured categories | Help users choose a shopping path quickly. | Use strong visual cards. |
| Featured products | Promote curated products across categories. | Pull from `isFeatured` catalog flag later. |
| Benefits | Build trust before checkout exists. | Shipping, quality, secure purchase, easy exchanges. |
| Newsletter | Capture interest without requiring account/auth. | Mock-only in MVP. |
| Footer | Provide secondary navigation and brand closure. | Include routes planned in sitemap. |

## Catalog

### Objective

Let users browse, search, filter, and compare products efficiently.

### Components

- Page heading.
- Search input.
- Category filters.
- Brand filters.
- Price range filter.
- Stock filter.
- Sort control.
- Product grid.
- Pagination.
- Empty state.

### Required data

- Product list.
- Categories.
- Brands.
- Price range.
- Stock statuses.
- Sort options.
- Pagination metadata.

### Future backend integration

- Convert local filters into query parameters.
- Fetch paginated products from an API.
- Support server-side search and sorting.
- Preserve filter state in the URL.

## Product detail

### Objective

Give users enough confidence to choose a product and add it to a cart.

### Components

- Product gallery.
- Product title and brand.
- Price.
- Badge or promotional label.
- Description.
- Size or variant selector.
- Stock indicator.
- Quantity selector.
- Primary purchase CTA.
- Secondary actions such as wishlist later.
- Related products.

### Required data

- Product detail record.
- Gallery images.
- Category and brand.
- Price and currency.
- Description.
- Available variants.
- Stock status.
- Related products.

### Future backend integration

- Fetch product by slug.
- Validate variant availability.
- Track inventory state.
- Add selected item to persistent or session cart.

## Cart

### Objective

Let users review intended purchases before checkout.

### Components

- Cart item list.
- Quantity controls.
- Remove item action.
- Order summary.
- Empty cart state.
- Continue shopping link.
- Checkout CTA.

### Required data

- Cart items.
- Product references.
- Selected variants.
- Quantities.
- Prices.
- Subtotal and estimated total.

### Future backend integration

- Persist cart by session or user account.
- Revalidate prices and stock.
- Sync local cart with backend cart state.

## Checkout

### Objective

Prototype the purchase form and order review before real payments.

### Components

- Contact form.
- Shipping form.
- Delivery option selector.
- Payment placeholder.
- Order summary.
- Validation messages.
- Confirm order CTA.

### Required data

- Cart summary.
- Customer contact fields.
- Shipping address fields.
- Delivery options.
- Mock payment state.

### Future backend integration

- Create checkout session.
- Validate stock and pricing.
- Create order draft.
- Integrate Mercado Pago only after the UX is validated.

## User account

### Objective

Plan future account capabilities without implementing auth in the MVP.

### Components

- Sign-in placeholder.
- Profile summary.
- Order history.
- Saved addresses.
- Wishlist or favorites.

### Required data

- User profile.
- Orders.
- Addresses.
- Saved products.

### Future backend integration

- Add authentication.
- Protect account routes.
- Fetch user-specific orders and profile data.
- Manage saved addresses and favorites.

## Admin panel

### Objective

Plan future catalog operations after storefront and data model validation.

### Components

- Admin dashboard overview.
- Product table.
- Product create/edit form.
- Category management.
- Brand management.
- Inventory/status controls.
- Featured product controls.
- Order management later.

### Required data

- Products.
- Categories.
- Brands.
- Stock statuses.
- Featured flags.
- Orders when checkout exists.

### Future backend integration

- Add role-based access.
- Persist catalog changes.
- Upload and order product images.
- Manage product publication state.
- Review orders and inventory.

