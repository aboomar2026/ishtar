# Navigation feedback follow-up — 2026-10-27

User report: tapping "عرض المنتج" gave no indication while the route fetched, and the quick-view modal displayed mostly blank space. This follow-up adds branded feedback without putting public catalog pages inside new streaming loading boundaries.

QA captures with synthetic fixture images: [mobile navigation indicator](evidence/navigation-mobile.png), [quick-view skeleton](evidence/quick-view-skeleton.png).

## Behavior

- Root NavigationProvider covers storefront and admin. Eligible internal NavigationLink clicks and explicit push/replace calls use a shared React transition; the indicator starts while the route is pending and ends on commit, including query-only filter/pagination navigation and redirects.
- A fixed burgundy/gold progress strip and cream status pill say "جارٍ فتح الصفحة…". The current page remains visible and usable. No percentage, artificial completion delay, dimming overlay or pointer lock is added.
- After 12 seconds, the status honestly reports a slower-than-usual transition with a retry button. It does not call the link broken or hide an outstanding request. Retry is an explicit GET navigation to the intended destination, never an automatic form/order resubmission.
- Native same-tab internal anchors and browser back/forward are observed separately. Same-path/query clicks, hash-only changes, new tabs, modified clicks, external links and downloads are excluded. Newer navigation supersedes old work without leaving a stuck indicator. Background router.refresh/polling keeps its existing local feedback and is not wrapped.
- Search, category GET filters, checkout success navigation, admin product/order/inventory filters and product editor cancellation use tracked navigation. All existing next/link consumers now import the shared thin wrapper; Next prefetch, ref, click prevention, target and download semantics are retained.
- The logout Server Action shows its own inline spinner/pending text until its redirect completes, matching the existing login/save/checkout action feedback.
- Quick-view has immediate feedback while its lazy JavaScript chunk loads, then a product-shaped skeleton/spinner while fetching current catalog data. Close/Escape, focus restoration and the full-product link keep working even when the modal unmounts during navigation.
- Status announcements use role=status/live polite; decorative progress/spinners are hidden from assistive technology. Reduced-motion preferences disable shimmer, spinner rotation and moving progress. No production dependency was added for animation.
- Missing product/category/collection requests still return HTTP 404. The existing not-found and error pages distinguish unavailable links/errors from a pending transition. No page loading.tsx was introduced: the earlier experiment's soft-404 regression remains avoided.

## Implementation

New: NavigationProvider.tsx, NavigationLink.tsx, NavigationForm.tsx, ProductLoadingSkeleton.tsx and navigation-target.ts. Root layout mounts the provider; existing link imports and six programmatic navigation consumers use it. QuickView/QuickViewProvider and controls.css provide the branded pending UI. No catalog/order/inventory SQL, provider configuration or checkout mutation was changed.

playwright-core 1.64.1 is a dev dependency only. It does not download a browser in Netlify's npm install. CI explicitly installs Chromium for navigation tests after building. No new runtime service, paid dependency or hosting change.

## Validation

Production Next build/start, fresh local 100-product PGlite fixture, local synthetic admin, desktop 1440×1000 and touch/mobile 390×844. Local Chromium 153 was supplied outside the repo; CI uses Playwright's Chromium. Browser RSC/API requests were deliberately held to inspect pending state. External image/CDN requests were replaced with synthetic SVGs; no live orders, accounts, uploads or Telegram traffic occurred.

`npm run test:navigation`: 11/11 passed (including parent/helper counts). Browser cases cover:

- Home/product title and exact "عرض المنتج" CTA; collection/detail/member and related-product links.
- Category query-only filters/pagination, header search Enter and browser back.
- Quick-view skeleton, closing during fetch/focus restoration, full-product navigation after modal unmount.
- Cart → Checkout with zero orders created, and admin Products/Collections/Orders transitions.
- Logout action pending text/disabled state and redirect to login.
- Slow response messaging, reduced motion, newer navigation superseding a held old response, and clearing indicators on completion.
- Same-page/new-tab/download exclusions, unchanged document identity for client navigation, no unexpected page exceptions, and real HTTP 404s.

Lint, TypeScript and production build passed. Production HTTP SEO 7/7, checkout/integrity 21/21, collection QA 6/6 and performance/caching regressions 13/13 passed again. The core React/catalog/security regression group plus navigation-target test passed 71/71. Full CI status is checked after push.

Reproduce on a normal development/CI machine:

```sh
npm ci
npm run db:generate
npm run build
node node_modules/playwright-core/cli.js install --with-deps chromium
npm run test:navigation
```

The test always provisions a new local database and cannot target a supplied production DATABASE_URL. An explicitly supplied ISHTAR_TEST_BROWSER_EXECUTABLE/ISHTAR_TEST_BROWSER_ARGS can select a local browser without changing app dependencies. Optional ISHTAR_NAV_SCREENSHOTS writes temporary QA captures. These tests establish pending lifecycle and navigation correctness, not real-user Web Vitals, live CDN image quality, physical-phone acceptance or a Netlify latency benchmark. Earlier baseline/benchmark documents remain historical evidence from before this follow-up.
