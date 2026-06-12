# Design system

The visual system should make the store feel like an original sports brand: modern, athletic, professional, and elegant.

It must not look like Amazon, Mercado Libre, or a generic SaaS dashboard.

## Philosophy

The interface should feel curated and branded before it feels utilitarian. Ecommerce clarity still matters, but the first impression should be sport, movement, confidence, and premium restraint.

Design principles:

- Athletic, not loud.
- Premium, not luxury-for-luxury's-sake.
- Clear, not generic.
- Branded, not shadcn-default.
- Modern, not dashboard-like.

## Official palette

| Role | Name | Hex |
| --- | --- | --- |
| Primary | Sea Green | `#5B8C5A` |
| Secondary | Ebony | `#596157` |
| Accent | Golden Sand | `#CFD186` |
| Premium accent | Mauve Shadow | `#52414C` |
| Surface light | Lavender Mist | `#F7F0F5` |

## Light theme

| Token | Value | Usage |
| --- | --- | --- |
| Background | `#FFFFFF` | Main page background. |
| Text | `#111111` | Primary readable text. |
| Primary | `#5B8C5A` | Main CTA, active navigation, highlights. |
| Secondary | `#596157` | Secondary UI, muted brand structure. |
| Accent | `#CFD186` | Badges, soft highlights, product emphasis. |
| Premium accent | `#52414C` | Editorial moments, premium cards, deep contrast. |
| Surface light | `#F7F0F5` | Section backgrounds and elevated soft surfaces. |

Light theme hierarchy:

1. Sea Green for primary commerce actions.
2. Ebony for grounding and secondary navigation.
3. Golden Sand for promotional accents.
4. Mauve Shadow for premium/editorial emphasis.

## Dark theme

| Token | Value | Usage |
| --- | --- | --- |
| Background | `#181818` | Main page background. |
| Surface | `#262626` | Cards, panels, navigation surfaces. |
| Text | `#F5F5F5` | Primary readable text. |
| Primary | `#52414C` | Main branded surface and premium CTA moments. |
| Secondary | `#5B8C5A` | Action support, active states, sport energy. |
| Accent | `#CFD186` | Highlights and key badges. |
| Neutral | `#596157` | Borders, subdued metadata, secondary structure. |

Dark theme hierarchy:

1. Mauve Shadow becomes the premium primary identity.
2. Sea Green becomes the secondary action and sport signal.
3. Golden Sand remains the accent for focused highlights.
4. Ebony becomes neutral structure instead of primary brand.

This is intentionally not a simple inversion of the light theme.

## Visual rules

- Do not use default shadcn/ui colors as the visible brand identity.
- Use shadcn/ui for accessible primitives, then override tokens with this system.
- Avoid pure marketplace patterns: dense grids, noisy price blocks, and generic blue CTAs.
- Use whitespace, strong typography, and editorial product imagery to create a sports-brand feel.
- Prefer purposeful contrast over excessive shadows.
- Use Golden Sand sparingly so promotions feel intentional.

## Suggested design tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | `#FFFFFF` | `#181818` |
| `--foreground` | `#111111` | `#F5F5F5` |
| `--surface` | `#F7F0F5` | `#262626` |
| `--primary` | `#5B8C5A` | `#52414C` |
| `--primary-foreground` | `#FFFFFF` | `#F5F5F5` |
| `--secondary` | `#596157` | `#5B8C5A` |
| `--secondary-foreground` | `#FFFFFF` | `#F5F5F5` |
| `--accent` | `#CFD186` | `#CFD186` |
| `--accent-foreground` | `#111111` | `#181818` |
| `--premium` | `#52414C` | `#52414C` |
| `--muted` | `#F7F0F5` | `#262626` |
| `--muted-foreground` | `#596157` | `#CFD186` |
| `--border` | `#D9DED7` | `#596157` |
| `--ring` | `#5B8C5A` | `#CFD186` |

## Component token direction

| Component | Token guidance |
| --- | --- |
| Button primary | Sea Green in light, Mauve Shadow in dark. |
| Button secondary | Ebony outline or muted fill in light, Sea Green outline in dark. |
| Product card | Light surface or white card in light, `#262626` card in dark. |
| Badge | Golden Sand with dark readable text. |
| Header | White or Lavender Mist in light, deep dark surface in dark. |
| Footer | Mauve Shadow or Ebony in light, near-black with Sea Green accents in dark. |
| Form fields | High contrast borders, clear focus ring, no default blue identity. |

## Typography direction

- Use a confident sans-serif system that supports ecommerce readability.
- Headings should feel editorial and athletic.
- Product names should be readable before decorative.
- Prices need strong hierarchy but should not overpower product imagery.

Suggested hierarchy:

| Role | Direction |
| --- | --- |
| Display | Large, tight, brand-forward hero text. |
| Heading | Strong section titles with clear scan rhythm. |
| Body | Comfortable reading size and line height. |
| Metadata | Compact labels for category, stock, and badges. |

## Spacing and layout

- Use generous section spacing on home and detail pages.
- Keep product grids consistent and calm.
- Avoid overly dense marketplace layouts.
- Use asymmetry in hero/editorial areas, but keep catalog interactions predictable.

Suggested rhythm:

- Small spacing for metadata groups.
- Medium spacing for cards and form controls.
- Large spacing for sections.
- Extra-large spacing for hero and editorial breaks.

## Shape and elevation

- Use medium radius for cards and controls.
- Use subtle elevation only where it improves separation.
- Prefer borders and background contrast over heavy shadows.
- Keep product imagery clean and stable.

## Accessibility rules

- Maintain sufficient text contrast in both themes.
- Ensure focus states are visible and branded.
- Do not communicate stock or promotion only through color.
- Keep CTA labels action-oriented and unambiguous.
- Support keyboard navigation for filters, menus, and cart controls.

## Future shadcn/ui implementation notes

When shadcn/ui is introduced:

- Map these tokens into CSS variables before building many components.
- Customize button, badge, card, input, select, sheet, dialog, and navigation styles early.
- Treat shadcn/ui as the accessibility and composition base, not the brand.
- Avoid accepting default theme colors as final UI.

