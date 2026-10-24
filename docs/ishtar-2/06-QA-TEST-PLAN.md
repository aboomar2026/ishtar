# ISHTAR 2.0 — QA plan and actual baseline

23 October 2026, local application tree `74bdcb69326961a4ebf48d7bc49cf925f39a623a`, equivalent to PR #3 remote head `2a9bcad`. Audit docs are subsequent local documentation changes only.

## Checks executed in this audit

| Command | Actual outcome / limits |
| --- | --- |
| `npm run typecheck` | PASS, exit 0 |
| `npm run lint` | PASS, zero ESLint warnings/errors |
| `npm run brand:check` | PASS 28/28 static checks |
| `npm run test:commerce` | PASS 10/10 runner tests, including parent grouping |
| `npm run test:checkout-client` | PASS 6/6 runner tests; actual client recovery component, not browser E2E |
| `npm run test:hero` | PASS 14/14; settings/editor/SSR/rotation/view tests |
| `node --import tsx --test tests/cloudinary-image.test.ts tests/site-url.test.ts` | PASS 8/8 (3 image transform + 5 site URL) |
| `npm run build` | PASS, exit 0, production compilation/routes |
| `npm run test:integration` | PASS 14/14 (13 scenarios + parent), isolated real Prisma/HTTP with PGlite and mock Telegram |

Total: 52 automated runner tests including parent groups, plus 28 static identity checks. These are not 52 independent end-to-end customer journeys. Existing dependencies were used; `npm ci` and `db:generate` were not rerun in this audit and are not claimed as fresh passes. No source changes required another test cycle.

Warnings: npm's existing `http-proxy` config warning; React test-renderer deprecation; intentional missing-HeroSettings fallback test emits Prisma table-not-found log before passing. Integration may emit cache-invalidation warnings outside Next request context. Do not hide these or misclassify expected fixture logs as production incidents. Build-generated `next-env.d.ts` was restored to the starting source.

## Isolation

Existing integration harness creates fresh in-memory PGlite schema, sets its own loopback DATABASE_URL, synthetic products/customers/admin signing secret, and captures only `botISHTAR_TEST_ONLY` transport calls. It runs a child production HTTP server against that disposable DB. No production seed, DB push/reset, credentials or live Telegram delivery used.

Do not run `npm run db:seed`, production `db:push`, media/backfill scripts, `telegram:test` or Netlify build's DB command as a casual QA check. Review command bodies before executing them. Keep live environment values out of logs/artifacts.

## Coverage and next acceptance tests

| Area | Current status | Required normal / edge / error assertions |
| --- | --- | --- |
| Catalog/search | PASS existing query/HTTP tests; desktop focus spot check | Predictive search not implemented: later Arrow keys/Enter/Escape, stale cancellation, Arabic hamza/diacritics/numerals, injection, pagination/back, draft/category exclusion, 0/1/large datasets |
| Media | PASS URL tests + home/sample PDP images; all catalogue/media NOT TESTED | Cards/category/PDP/thumbnails/cart/order images, portrait/landscape/crop, simulated 400/404 fallback, content/photo correctness, stable image dimensions |
| Hero | PASS unit/SSR + desktop four-slide/autoplay/manual/product-link smoke | Timed multi-cycle browser test, focus/hover explicit resume, hidden/background, fixed vs rotating, reduced motion and mobile; no idle animation work |
| Cart | PASS availability/quantity/recovery component checks | Browser stale price/stock, add once, max quantity, remove/restore, storage denial/corrupt storage, refresh/offline/network errors |
| Checkout | PASS isolated create/replay/conflict/rollback/tracking checks | Browser form validation/focus, double submit, response loss, Arabic phone, recovery with changed cart, inventory conflict. No real test order without explicit scope |
| Concurrency | NOT TESTED on conventional Postgres | Two independent connections synchronized before purchase: different keys race stock=1, same key same payload, same key altered payload, cancel vs cancel/admin adjustment. Assert one applicable order, no negative stock, exact ledger/snapshot and no duplicate event |
| Auth/admin | PASS signed session/unauthorized SSR; interactive CRUD NOT TESTED | Real login/logout/expired/inactive/tampered tokens; CATALOG_MANAGER capability denial; CSV/upload/print routes and all server actions protected; login abuse handling |
| Admin operations | NOT TESTED interactively | Product/category/banner create/edit/archive, invalid data/upload timeout/size/type, unsaved changes, stock adjustment, order status/cancel/delivery/notes; preserve ledger and partial failure clarity |
| Notifications | Existing mock Telegram called once PASS; outbox absent | Inject 429/5xx/timeout/missing env/crash-after-send/expired lease; order survives; one event/replay; bounded retry; alert/failure/read persistence; external delivery needs authorized sandbox |
| Live/PWA | NOT IMPLEMENTED beyond storefront manifest | New order target 5–15s, two tabs, reconnect/backoff/visibility, denied/expired push, logout/multiple devices, generic lock screen, auth deep link, no PII cache |
| Analytics | DB-backed cards source exists, full reconciliation NOT TESTED | Today/range/DST Asia/Hebron, canceled/replayed orders, gross order vs delivered value labels, no traffic conversion without real event denominator |
| SEO | PASS URL tests + isolated sitemap/robots/noindex HTTP | Actual deployed canonical/product OG/sitemap origin and active URLs; preview indexing policy; product structured data accuracy |
| Accessibility | Zoom/Escape/focus return and search spot check PASS only | Automated axe-type checks plus full keyboard/screen-reader review; combobox/dialog semantics, contrast, focus/invalid state matrix, reduced/forced colors |
| Performance | NOT MEASURED | Mobile lab before/after, LCP/CLS/INP/long tasks/image payload/client JS; field p75 separately; no invented Lighthouse score |
| Print | PASS SSR 50 synthetic rows; PDF/physical NOT TESTED | A4 multipage clipping, correct totals/delivery pending, packing selection, QR safe origin, no private PII in shared screenshot |

## Browser/device matrix

Required: widths 320/375/390/430/768/1024/1440, RTL Arabic long text, portrait/landscape, 200% text. Chromium/Firefox/WebKit where available, physical Android Chrome and iOS Safari acceptance separately. This audit used cloud Chromium 1363×936 only. No viewport emulation/physical-device PASS is claimed. File-URL browser harness is not supported and should not be bypassed; use an approved HTTP test deployment with synthetic data when available.

## Conventional PostgreSQL fixture contract

Future suite must require an explicit disposable local/test target, unique temporary schema/database and two actual independent clients. Refuse production host/DB; no fallthrough to a developer's arbitrary DATABASE_URL. Create synthetic fixture DDL without altering live schemas, stub external transport before actions, verify both connection identities, barrier their race starts, assert invariants, then drop only the isolated namespace. Do not disguise PGlite parallel promises as independent database concurrency.

## Feature expansion contract

For every F row in 02 include success/loading/empty/error/denied states, real current prices/stock, unpublished ID filtering, RTL/touch/keyboard checks and bounded data. Optional features must not degrade existing COD/order recovery. Per-slice relevant tests, then full milestone regression; repeat only after a material change or unresolved failure.
