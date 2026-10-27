# Validation — 2026-10-27

Later validation: [Navigation feedback](NAVIGATION-FEEDBACK.md) now has real headless Chromium desktop/mobile tests. The unavailable-browser notes below describe the original audit, not this subsequent workflow verification; real-user Web Vitals remain unmeasured.

Local Node 24.22.1; production Next 16.2.7 build. Existing CI/Netlify target Node 22. All database fixtures below are disposable local PGlite; no live writes/orders or live Telegram/Cloudinary test. Counts overlap between commands; do not sum them as distinct cases.

| Command/group | Final result |
|---|---|
| npm ci --ignore-scripts; npm run db:generate | Passed (436 packages installed; Prisma 6.19 generated) |
| npm run lint | Passed, zero warnings |
| npm run typecheck | Passed |
| npm run build | Passed; catalog/admin dynamic, cart/checkout/wishlist static shells |
| Core Node tests (exact list below) | 70/70 passed |
| Isolated DB suites (exact list below) | 33/33 passed |
| npm run test:performance | 13/13 passed; responsive transforms/fallback, admin pages/filter ordering, public sales semantics, production HTTP tag invalidation/permissions |
| npm run test:integration | 21/21 passed; authoritative price/stock, retry/idempotency/recovery/rollback, private receipt and mocked notification behavior |
| npm run test:seo-integration | 7/7 passed; canonical/JSON-LD/sitemap/robots/visibility and actual 404s |
| npm run test:collections:qa | 6/6 passed; redirects/paging/diverse recommendations/covers/source SQL preservation |
| git -c core.whitespace=cr-at-eol diff --check | Passed; original CRLF files preserved |
| Conventional independent PostgreSQL concurrency suite | Not run: dedicated PostgreSQL/Docker absent; existing CI provisions its own target |
| Chromium/Playwright, desktop/mobile visual/keyboard/console/network traces | Not run successfully: browser binary absent and downloaded archive invalid/truncated |
| Netlify adapter caches/regions/cold starts; real Cloudinary headers/uploads/replacements/deletion | Not verified |

Core command:

```sh
node --require ./tests/runtime/server-marker.cjs --import tsx --test --test-concurrency=1 \
  tests/cloudinary-image.test.ts tests/catalog-image.test.tsx tests/commerce.test.ts \
  tests/admin-permissions.test.ts tests/postgres-target.test.ts tests/hero-settings.test.ts \
  tests/hero-render.test.tsx tests/hero-rotation.test.tsx tests/hero-editor.test.tsx \
  tests/hero-view-rotation.test.tsx tests/search-submit.test.tsx tests/wishlist.test.tsx \
  tests/wishlist-page.test.tsx tests/recent-products.test.tsx tests/share-product.test.ts \
  tests/quick-view.test.tsx tests/checkout-recovery.test.tsx tests/site-url.test.ts \
  tests/seo.test.ts tests/performance.integration.test.ts
```

Isolated DB command:

```sh
node --require ./tests/runtime/server-marker.cjs --import tsx --test --test-concurrency=1 \
  tests/collections.integration.test.ts tests/collections-auth.test.ts \
  tests/collections-seed.integration.test.ts tests/database-reference.integration.test.ts \
  tests/test-products.integration.test.ts tests/order-reset.integration.test.ts \
  tests/notifications.test.ts tests/order-activity.test.tsx
```

Production HTTP performance tests exercise anonymous access following signed-in requests, role downgrade with an existing signed token, deactivation with that token, rejection of anonymous hero mutation, and immediate public hero update after authorized mutation. No public product/stock/price cache was added. Image tests verify source descriptors and error recovery, not actual browser decode/crop quality. Navigation Link/Form code compiles and renders, but browser no-reload assertions remain unverified.

Failures investigated rather than hidden:

- Original commerce test fake $queryRaw accepted only Prisma.Sql, while collection-readiness uses a tagged template. Two search assertions failed identically when restoring the original catalog source. The test adapter now supports both real Prisma input forms; all ten commerce tests pass.
- Existing dashboard analytics test has two fixture reconciliation assertions failing on this runtime (plus its parent test failure). Reproduced with original catalog source; no dashboard implementation changes. Possible application/PostgreSQL timezone-data mismatch remains to investigate. Thus the entire pre-existing repository suite is **not claimed green**.
- One collections-seed test process failed in the initial large parallel batch, then passed alone and again in the sequential 33-case DB group.
- Candidate loading boundaries introduced soft 404s (HTTP 200 after early streaming). They were removed; the complete production SEO suite subsequently passed. No segment loading files are included in this patch.

Existing CI additionally runs dashboard and real PostgreSQL race suites. New performance tests were added after the production-build step. Remote CI/deploy status must be checked after pushing; local passes do not substitute for Netlify adapter/browser acceptance.
