# ISHTAR 2.0 — Current-state audit

Audit date: 23 October 2026. Application examination was read-only. This documentation is local and has not been pushed, merged or deployed. Read alongside 02 (all 37 proposals), 06 (executed checks) and 07 (release gates).

This is the initial audit snapshot. Subsequent B0 source work and its validation/deployment status are recorded in [08-CHANGELOG-AND-HANDOFF.md](08-CHANGELOG-AND-HANDOFF.md); the findings below are not a claim those later fixes remain absent.

## Source and deployment evidence

| Item | Verified observation |
| --- | --- |
| Repository | https://github.com/aboomar2026/ishtar |
| Active branch | `hotfix/cloudinary-fit-images`; continue the same PR as the owner instructed |
| Remote PR #3 head | `2a9bcad3fd54583b253be8a656d3623917348002` |
| Local tested commit | `2341e19a0186cbbb3c0f43cf2303a8bc30de22a3` |
| Matching source tree | `74bdcb69326961a4ebf48d7bc49cf925f39a623a`; commit IDs differ following the previous API-based upload |
| PR #3 | Open, unmerged, mergeable; https://github.com/aboomar2026/ishtar/pull/3 |
| Preview | https://deploy-preview-3--ishtar-store.netlify.app/ ; GitHub `netlify/ishtar-store/deploy-preview` status SUCCESS for the remote head |
| Preview deploy identity | Netlify collaboration frame exposes deploy `6adb3a05a50ff2b156105b4f` |
| Main / latest merged PR | PR #2 merged at `d61d8714bc93433e9f74d5e4f9c6413d00cdee12`; PR #1 also verified merged |
| Production | https://ishtar-store.netlify.app/ opened separately; older hero, no new template controls observed. Exact deployed production SHA NOT independently verified |
| Issues | GitHub issue search returned none; this does not replace a security audit |
| Working tree | Clean before audit; build-generated `next-env.d.ts` change restored. Only the new audit docs/evidence are intended changes |

The August source archive is historical only. No overwrite from that archive, live migration, seed, external message or real order submission occurred.

## Existing capabilities and overlap

The application already has real catalogue queries, active-category/product filtering, paginated search/filter/sort, variant price/stock selection, product media/zoom, anonymous cart, checkout replay recovery, COD orders, tracking, inventory ledger, order operations, CSV and print routes. Reuse these flows.

PR #3 already includes compatible Cloudinary `fit`/`limit` transforms, three editable hero profiles, fixed/60-second rotating layouts, a genuine campaign carousel with product slides, decorative SVG motion, product links, benefits, visitor motion controls, unified SVG icons and shared field states. These are existing code, not new backlog tickets to rebuild.

`ProductCard.tsx` has quick ADD for a single available variant and navigation for multiple variants. This is not Quick View. `useDialog.ts` and gallery zoom provide reusable dialog behavior. `recent-orders.client.ts` records recent ORDERS, not recently viewed products. `BackInStockRequest` and `AbandonedCart` exist only as schema foundations: no collection/delivery path was found in `src`.

## Fresh browser observations

Browser: cloud Chromium, actual viewport 1363×936, Arabic RTL. No supported viewport-emulation API or physical phone was available in this session.

| Flow | Evidence / result |
| --- | --- |
| Preview home | PASS smoke: rendered catalogue and layered hero; DOM check found no broken completed images, no gift-box fallback URLs and no horizontal document overflow at this viewport |
| Search focus | PASS spot check: focused inner input has 0px border, no box-shadow and no visible inner outline; rounded parent focus treatment visible. This is not all field states |
| Hero layouts | Manual next changed layouts; automatic template change also occurred during observation. Exact 60-second timing is unit tested, not timed end-to-end here |
| Campaign slider | Four actual slides exposed; active counter changed from 1/4 to 2/4 without a slide click; manual next paused autoplay; product CTA reached `/product/camel-boutique-bag` |
| Product page | Loaded actual image/three thumbnails/variant controls; quantity increase disabled when available stock was one; no broken completed images or horizontal overflow in this sample |
| Gallery zoom | Dialog opened; Escape closed it; focus returned to the zoom trigger |
| Production home | Accessible and shows older hero. Its existence does not prove production checkout or Telegram acceptance |
| Mobile / authenticated admin / live delivery | NOT TESTED in this session. Isolated integration covers server rendering/auth, not interactive CRUD or real Telegram delivery |

Screenshot: [actual preview product page](evidence/preview-pdp-2026-10-23.jpg). It is a desktop sample, not a mobile signoff or proof that all media are correct.

## Risk-ranked findings

### Confirmed source gaps

| ID | Priority | Finding and reproducible evidence | Consequence / next action |
| --- | --- | --- | --- |
| R01 | P0 before operational launch | `order.actions.ts` commits, then awaits `notifyAdminAboutNewOrder`; `telegram.ts` returns failure/skipped results, but the caller does not persist them. Replayed checkout skips sending | Provider outage or process termination can permanently lose an alert. Implement transactional outbox, retry and operator visibility; preserve successful order |
| R02 | P0 for the requested live-admin scope | No polling/subscription in dashboard/order list; only action-triggered refresh/cache invalidation | An already-open staff screen does not reliably show new orders. Add bounded authenticated polling with visibility/backoff first |
| R03 | P1 security hardening; launch gate if staff roles are used | `requireAdmin()` confirms authentication/active account but no role capability. Order actions/export accept any authenticated role, including `CATALOG_MANAGER` | Role enum currently does not provide least-privilege separation. Define and enforce capability policy server-side; test catalog manager denial for order PII/operations |
| R04 | P1 deployment governance | `netlify.toml` build runs `prisma db execute` for hero settings | A build can mutate whichever DB URL is configured. Inspect environment mapping; prepare an explicit migration runbook before new schema work. Do not run that command against live DB during QA |
| R05 | P1 scalability | `getAdminOrders()` uses unbounded `findMany` | Add pagination/capped incremental feed before live refresh; do not poll the full private order list |
| R06 | P1 accessibility, source finding | Layout rotation resumes after content blur; WAI carousel guidance recommends explicit restart after keyboard interaction. Campaign carousel already uses persistent stop on focus | Align layout-switch behavior in a small follow-up and add a regression test. Not a reproduced P0 purchasing defect |

### Unverified release gates, not confirmed defects

- Independent conventional PostgreSQL last-item concurrency, duplicate request contention and cancel/restock races. PGlite serializes a backend and cannot prove these.
- Full mobile purchasing, 200% text zoom, sticky CTA/toolbars and cross-browser behavior.
- Authenticated interactive CRUD/uploads/cancellation/printing and external delivery credentials/environment compatibility.
- Real catalogue image-to-product/color correctness, real inventory, policies, contact/support details and permission model.
- Performance baseline, field Core Web Vitals, automated accessibility plus screen-reader review.

No currently reproducible P0 UI purchasing failure was found in the narrow browser sample. This is not a claim that none exists.

## Source coverage

Inspected README, package/lock dependency declarations, Prisma schema, Netlify configuration, all four brief-named implementation/release/runtime/UI reports, storefront home, search, product/card/gallery/cart/checkout modules, catalog query/filter/mapper/utilities, order actions/stock/notifications, Telegram transport, session/auth/actions, dashboard and order queries/export/actions, inventory actions, upload helper, hero settings/actions/query/components/hooks, icons, tokens, controls, robots/sitemap and test harnesses. Baseline ran all discovered test suites. Repository reports describe historical checks and do not supersede fresh results.

## Owner inputs

Before business launch: approved support number, policies/service areas, genuine stock/photos/prices and which legacy/demo catalogue items remain; actual curated combinations/looks; desired role permissions; provider/consent decisions for later outbound customer messaging. Keep current DB and Telegram while on preview as already instructed. Plan isolated launch infrastructure separately; do not change it now.
