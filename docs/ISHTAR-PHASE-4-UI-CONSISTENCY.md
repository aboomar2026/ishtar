# ISHTAR — Phase 4: UI consistency at source level

Date: 2026-10-21. Baseline: `ishtar-implementation-phase3(1).zip` supplied in this conversation. This is a continuation of that archive, not a verified GitHub revision.

**Status: implemented in source; visual and functional acceptance remain pending.** The user requested that app startup, dependency installation, TypeScript, ESLint, production build and functional testing remain in the final phase. None of those commands was run here.

## Delivered changes

- Added `src/app/ishtar.css`, imported after the existing global stylesheet. ISHTAR-only aliases connect legacy decorative colors to the active profile. Added RGB forms of background, section, border, muted, danger and success tokens to the existing CSS-variable generator.
- Wrapped legacy pink/brown decorative values in CSS-variable fallbacks. With the ISHTAR aliases absent, the original values remain exactly the Phase 3 values. Product color swatches and their underlying data were left intact.
- Standardized storefront form/card/summary surfaces, empty states, price emphasis, success colors, placeholder colors, focus rings and invalid-field borders. Admin tables use soft brand headers and a consistent hover surface. Existing success/error labels remain distinct.
- Adjusted cart, checkout and product-detail columns to stay stacked below 920px; tightened narrow cart/checkout rows and allowed long product names to wrap. This is a source-level responsive adjustment, not a visual certification at those sizes.
- Fixed RTL select padding: the reserved arrow space is now at inline-end, matching the arrow position. Included an LTR position override without claiming a complete English interface.
- Connected the existing ISHTAR print-logo variant to both invoice and packing-slip templates. Other brands retain their previous mark. Print artwork is monochrome; headings are neutral; table headers repeat and rows/totals request no page breaks inside them. QR labels are descriptive.
- Gave the two-image ISHTAR full logo one accessible name on its wrapper. That name survives the light/dark image switch in the footer and login page.
- Linked all six checkout validation messages to their fields, added invalid and busy states, autofill hints, and LTR telephone inputs. Hid the decorative empty-state heart from assistive technology. These semantic accessibility improvements also apply to the shared components used by other brands.
- Reworded the ISHTAR delivery trust item to say delivery is confirmed with the customer. The legacy fast-delivery promise was already excluded from ISHTAR by its conditional branch; that exclusion remains.

## Route coverage

All **19 page routes** were inventoried and mapped to their shared UI classes/components. This is a source inventory and styling pass; it is not an exhaustive functional or rendered review of each page.

| Route | Source-level treatment | Final acceptance still required |
|---|---|---|
| `/` | Existing shared decorative colors follow ISHTAR aliases | Hero, banners, cards, category links and real catalog content |
| `/category/[slug]` | Filter/select colors and RTL arrow spacing | Search, sort, filters, empty results and long category names |
| `/product/[slug]` | Price/status colors, controls and intermediate-width layout | Gallery, variants, stock, quantity and add-to-cart |
| `/cart` | Cards, summary and narrow action wrapping | Empty cart, quantities, deletion and persistence |
| `/checkout` | Cards, totals, error associations and mobile list layout | Validation, stock races, rejected requests and order submission |
| `/order-success` | Success palette and shared summary surfaces | Valid/invalid orders and privacy |
| `/track-order` | Neutral colors and shared form/status surfaces | Manual tracking, recent orders, errors and clear confirmation |
| `/admin/login` | Shared form surface/focus; full-logo accessible name | Login/logout and keyboard behavior |
| `/admin` | Shared cards, status colors and tables | Metrics, links and stock/order priorities |
| `/admin/products` | Shared tables, badges and empty surfaces | Desktop table/mobile list, search and pagination |
| `/admin/products/new` | Shared form, select, variant and empty-state styles | Validation, uploads and variant generation |
| `/admin/products/[id]/edit` | Same shared form coverage | Editing, persistence and existing variants |
| `/admin/categories` | Shared form and table styles | Create/edit/delete/reorder and uploads |
| `/admin/banners` | Shared form, select and list styles | Uploads, activation and displayed banner content |
| `/admin/inventory` | Shared forms, stock badges and empty surfaces | Stock updates, thresholds and ledger behavior |
| `/admin/orders` | Tables, mobile cards and semantic badges | Filters, export, pagination and status display |
| `/admin/orders/[id]` | Forms, totals, tables and workflow colors | Status transitions, delivery pricing, notes and inventory history |
| `/admin/orders/[id]/invoice` | Print-logo variant and neutral print rules | Print permissions, totals, QR and multipage preview |
| `/admin/orders/[id]/packing-slip` | Print-logo variant and neutral print rules | Packaging notes, quantities, QR and multipage preview |

Storefront `loading.tsx` and `not-found.tsx` remain on their shared skeleton/empty-state styles. Loading animation behavior still requires final browser review.

## Checks actually performed

- Existing dependency-free brand check: **28/28 PASS** (`node scripts/check-ishtar-brand.mjs`). This checks source strings/assets, not behavior or compilation.
- Fallback preservation check: removing only the newly introduced `var(--ishtar-…, original)` wrappers reproduces the Phase 3 `globals.css` text exactly. This establishes preservation of legacy fallback declarations, not a browser regression test.
- Byte comparison: the four other brand-profile files, all `src/features` files and all Prisma files are unchanged from the uploaded Phase 3 archive.
- All 12 ISHTAR CSS aliases used in the stylesheets have definitions. Checkout error/hint reference names match their declared IDs.
- Source-palette contrast arithmetic for selected opaque pairs:

| Foreground / background | Ratio |
|---|---:|
| Primary `#522B3A` / white | 11.90:1 |
| Muted `#695760` / cream `#FBF5ED` | 6.19:1 |
| Danger `#9F3B42` / white | 6.61:1 |
| Success `#286647` / white | 6.81:1 |
| Light `#FBF5ED` / primary footer | 10.98:1 |

These selected calculations do not certify all rendered text, transparency, overlays, images, disabled states or accessibility compliance. CSS/TSX compiler validation remains pending.

## Files changed from Phase 3

Existing: `src/app/globals.css`, `src/app/layout.tsx`, `src/config/brands/index.ts`, `src/lib/brand.ts`, `src/components/BrandLogo.tsx`, `src/components/CheckoutForm.tsx`, `src/components/EmptyState.tsx`, `src/components/Footer.tsx`, `src/components/admin/PrintableInvoice.tsx`, `src/components/admin/PrintablePackingSlip.tsx`.

New: `src/app/ishtar.css` and this report. No new package dependencies.

## Next phase, before runtime acceptance

1. Review content and SEO against the real ISHTAR catalog: categories, products, images, ratings/sales counters, alternative text and banner copy. Existing database data is not evidence that those are real ISHTAR records.
2. Confirm business contact channels, delivery coverage and returns/privacy policies. Several service links are still explicitly marked as coming soon. Do not invent approved policies or contact information.
3. Review typography and font licensing/delivery. This phase retains the existing Tajawal and El Messiri setup; it does not claim font approval.
4. Decide the production domain before adding canonical/Open Graph URLs or structured business data. The current UI is Arabic/RTL with some English copy, not a fully localized English storefront.
5. Keep `NEXT_PUBLIC_STORE_BRAND=ishtar` in the target environment; the resolver still defaults to `saad` when it is absent.

Then perform the deferred installation, type/lint/build checks and browser testing against a test database: 320/375/768/1024/1440px, keyboard operation, dialogs, touch targets, real content, loading/error/empty states, checkout/admin flows and multipage printing. Repeat visual checks for all four alternative brand profiles.

No push, merge, deployment, database operation or production access was performed. The archive is not production-approved.
