# Catalog design

The catalog should feel realistic enough to stress the UI while staying lightweight enough for a mock-first MVP.

## Catalog categories

| Category | Slug | Purpose |
| --- | --- | --- |
| Football shirts | `football-shirts` | Main emotional category for club and national team identity. |
| Boots | `boots` | Performance-focused products with size and surface attributes. |
| Balls | `balls` | Training and match products. |
| Training gear | `training-gear` | Apparel for practice and conditioning. |
| Accessories | `accessories` | Lower-ticket add-ons for cart expansion. |
| Goalkeeper | `goalkeeper` | Specialized products with stronger functional attributes. |

## Brands and collections

Use fictional brands to avoid licensing issues while still feeling like a real sports catalog.

| Brand | Positioning |
| --- | --- |
| Verde Arena | Premium matchwear and elegant football apparel. |
| Northline FC | Urban training gear with a modern street-sport tone. |
| Campo Pro | Performance boots, balls, and equipment. |
| Golden Eleven | Limited edition and featured products. |
| KeeperLab | Goalkeeper gloves and protection products. |

## Fictional products

| Product | Category | Brand | Price ARS | Featured | Stock |
| --- | --- | --- | ---: | --- | --- |
| Verde Arena Home Jersey | Football shirts | Verde Arena | 74999 | Yes | In stock |
| Verde Arena Away Jersey | Football shirts | Verde Arena | 72999 | No | Low stock |
| Golden Eleven Heritage Kit | Football shirts | Golden Eleven | 89999 | Yes | In stock |
| Northline Training Tee | Training gear | Northline FC | 34999 | No | In stock |
| Northline Performance Hoodie | Training gear | Northline FC | 68999 | Yes | In stock |
| Campo Pro FG Boots | Boots | Campo Pro | 129999 | Yes | In stock |
| Campo Pro Turf Boots | Boots | Campo Pro | 114999 | No | In stock |
| Campo Sprint Kids Boots | Boots | Campo Pro | 82999 | No | Low stock |
| Matchday Elite Ball | Balls | Campo Pro | 45999 | Yes | In stock |
| Training Core Ball | Balls | Campo Pro | 29999 | No | In stock |
| Golden Eleven Limited Ball | Balls | Golden Eleven | 59999 | Yes | Low stock |
| KeeperLab Pro Gloves | Goalkeeper | KeeperLab | 64999 | Yes | In stock |
| KeeperLab Grip Gloves | Goalkeeper | KeeperLab | 48999 | No | In stock |
| Goalkeeper Padded Shorts | Goalkeeper | KeeperLab | 52999 | No | Out of stock |
| Captain Armband Set | Accessories | Verde Arena | 15999 | No | In stock |
| Shin Guard Carbon Lite | Accessories | Campo Pro | 23999 | No | In stock |
| Grip Socks Pro Pack | Accessories | Northline FC | 19999 | Yes | In stock |
| Training Cone Set | Accessories | Campo Pro | 18999 | No | In stock |

## Product attributes

| Attribute | Purpose |
| --- | --- |
| `id` | Stable internal mock identifier. |
| `slug` | Route-safe product URL segment. |
| `name` | Product display name. |
| `description` | Short product story and functional details. |
| `price` | Price in ARS for local market realism. |
| `currency` | Currency display control. |
| `category` | Category relationship for filters and navigation. |
| `brand` | Brand or collection relationship. |
| `images` | Gallery-ready image references. |
| `sizes` | Apparel or footwear option list when relevant. |
| `colors` | Optional color variants. |
| `badge` | Promotional label such as New, Featured, Limited, or Low stock. |
| `stockStatus` | In stock, low stock, or out of stock. |
| `isFeatured` | Controls home and promotional sections. |
| `tags` | Search and merchandising metadata. |

## Featured product strategy

Featured products should not be random. They should cover the main business categories:

- One premium shirt.
- One boot product.
- One ball product.
- One training apparel item.
- One goalkeeper product.
- One cart-friendly accessory.

This gives the home page enough variety to communicate the store's full offer quickly.

## Image strategy

Use a consistent image system before sourcing final assets:

- Prefer product-on-clean-background images for catalog cards.
- Use action-oriented or editorial crops in the home hero.
- Keep product aspect ratios consistent to prevent grid instability.
- Use neutral or brand-tinted backgrounds instead of generic marketplace white-only imagery.
- Avoid real club crests, licensed logos, or copyrighted team kits.
- Plan image slots for card image, gallery image, thumbnail, and hero crop.

## Future administrable catalog structure

The future admin catalog should support:

- Product create, edit, archive, and publish states.
- Category and brand management.
- Featured product selection.
- Image ordering for galleries.
- Variant management for size, color, and stock.
- Inventory status controls.
- Promotional badges.
- SEO fields such as title, description, and slug.

## Future seed data criteria

Seed data should be useful for UI, tests, and demos.

- Include 15 to 20 products minimum.
- Cover every category.
- Include at least 5 featured products.
- Include all stock states.
- Include products with and without variants.
- Include varied price ranges.
- Include enough long names and descriptions to expose layout problems.
- Use deterministic slugs and identifiers.
- Avoid real licensed teams or brands.

