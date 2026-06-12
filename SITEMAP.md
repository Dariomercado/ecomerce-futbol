# Sitemap

The first sitemap favors a public storefront. Backend-dependent areas are planned but deferred.

## Public storefront

```text
/
/products
/products/[slug]
/categories/[slug]
```

Purpose:

- Let users discover products.
- Let users browse by category.
- Let users inspect product details before cart/checkout work exists.

## Commerce flow

```text
/cart
/checkout
/order/success
```

Status: planned for a later mock-first slice.

These routes should not require real payments or order persistence during the UI-first phase.

## Account and admin

```text
/account
/admin
```

Status: deferred.

These routes depend on Auth and backend decisions, so they should not be implemented in the first delivery.

## Navigation priority

Primary navigation:

- Home
- Products
- Categories
- Cart

Secondary navigation:

- Account
- Help/FAQ, if needed later

