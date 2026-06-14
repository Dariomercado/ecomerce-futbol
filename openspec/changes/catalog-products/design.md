# Design: Catalog Products First UI Slice

## Technical Approach

Build the first slice as a Next.js App Router, UI-first catalog backed only by local typed mock data under `src/lib/catalog`. The runtime UI will use `/catalogo` for browsing and `/productos/[slug]` for detail, matching the specs while preserving the current storefront style: server-rendered route components, `@/*` imports, Tailwind v4 tokens, shadcn-style `Button`, and feature components under `src/components`.

## Architecture Decisions

| Decision | Choice | Tradeoff / Rationale |
|---|---|---|
| Data source | Local typed mock catalog in `src/lib/catalog/*` | Fastest way to validate UX and domain rules without Prisma/API overbuild. Later migration can replace query helpers with API calls. |
| Routing | Real routes are `/catalogo` and `/productos/[slug]` only | Aligns with specs; no `/botines` etc. SEO category pages remain deferred. |
| Component split | Route pages compose catalog/detail components; reusable cards and filters live in `src/components/catalog` | Keeps App Router pages thin and follows current `src/components/home` organization. |
| Interactivity | Keep first slice mostly server-rendered; use a small client component only if variant/gallery state requires it | Minimizes hydration cost, but allows detail interactions that cannot be represented statically. |
| Boundaries | No Prisma, Route Handlers, Server Actions, cart state, checkout, payments, or admin CRUD | Prevents coupling UI validation to backend decisions that specs explicitly defer. |

## Proposed Folder Structure

| Planned path | Action | Purpose |
|---|---|---|
| `src/lib/catalog/types.ts` | Create later | Catalog domain UI types. |
| `src/lib/catalog/mock-data.ts` | Create later | Proprietary categories, brands, products, variants, images. |
| `src/lib/catalog/queries.ts` | Create later | Pure helpers: list/filter/find/featured. |
| `src/app/catalogo/page.tsx` | Create later | Catalog route reading `searchParams`. |
| `src/app/productos/[slug]/page.tsx` | Create later | Product detail route and not-found handling. |
| `src/components/catalog/*` | Create later | Product card, filters, grid, empty state, gallery, variant selector, mock cart CTA. |
| `src/components/layout/header.tsx`, `src/components/home/home-data.ts` | Modify later | Replace existing `/products`, `/categories`, `/featured` links with `/catalogo` query links. |

## Data Flow

```text
/catalogo?category=botines&brand=norte-fc
  -> catalog page parses searchParams
  -> listCatalogProducts(filters)
  -> CatalogFilters + CatalogGrid + ProductCard
  -> ProductCard links to /productos/{slug}

/productos/[slug]
  -> findProductBySlug(slug)
  -> notFound/unavailable state if absent or inactive
  -> ProductGallery + ProductInfo + VariantSelector + disabled MockCartCTA
```

## Interfaces / Contracts

Minimal shape only; implementation details stay in future tasks.

```ts
type CatalogProduct = {
  id: string; slug: string; name: string; description: string;
  categorySlug: string; brandSlug: string;
  price: number; compareAtPrice: number | null;
  featured: boolean; isActive: boolean;
  images: ProductImage[]; variants: ProductVariant[];
};
```

Mock data MUST use ARS numeric pricing, exactly one primary image per product, required alt text, fictional/proprietary brands only, flat MVP categories (`botines`, `camisetas`, `entrenamiento`, `accesorios`), and inactive products excluded by query helpers.

## Main Components

- `CatalogFilters`: category, brand, featured controls; desktop sidebar and compact mobile panel/accordion.
- `CatalogTopBar`: result context and disabled/planned sort affordance.
- `ProductGrid` / `ProductCard`: responsive cards optimized for summaries.
- `CatalogEmptyState`: explains no matches and links back to `/catalogo`.
- `ProductGallery`: ordered images with primary image first.
- `VariantSelector`: size/color/stock/price override presentation.
- `MockCartCTA`: disabled or mock feedback only; no cart state.

## Testing Strategy

No test runner exists. For the first slice, use `pnpm lint`, `pnpm exec tsc --noEmit`, and manual review against the four specs. When tests are added, cover pure query helpers as unit tests, route rendering/filter behavior as integration tests, and catalog-to-detail navigation as E2E.

## Migration / Rollout

1. Ship typed local mock data and UI routes.
2. Add Prisma/domain schema and seed using the same type vocabulary.
3. Add read-only public APIs: products, product detail, categories, brands, featured products.
4. Replace local query helpers with API-backed data access while preserving component contracts.
5. Add cart/checkout only after product/variant/stock behavior is validated.

## Open Questions

None blocking.
