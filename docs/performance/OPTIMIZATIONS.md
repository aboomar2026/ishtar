# Implementation and validation

Changes are intentionally bounded:

- collections.queries.ts, collection/product pages: share request summary with metadata, load only the requested member page, select only PDP pill fields. No collection ranking/visibility/stock semantics change.
- catalog.queries.ts: postpone display-only sales aggregation until after newest/price pagination. Best-seller ranking continues aggregating real non-canceled orders before limiting.
- product-admin.queries.ts and admin products page/filters: SQL stock filtering/sorting precede 24-row pagination; totals/clamped pages/stable ID ties; preserve query filters, reset page after filtering; guard before reading private rows.
- admin-auth.ts: request-scoped current-DB session reuse; no public identity cache.
- hero.queries.ts/hero.actions.ts/home: only public hero presentation gets 300s tagged caching, immediately invalidated after successful authorized save. Editor remains fresh.
- cloudinary-image.ts, CatalogImage, cards/gallery/collections/home/cart/checkout/track-order/admin thumbnails: bounded delivery variants and reliable srcset fallback; crop and existing CSS/identity preserved.
- category page/ClearableSearchInput: Next Form/Link; empty input committed to the DOM before requestSubmit, keyed query state on navigation. Segment loading boundaries were tested then removed because early streaming converted required 404 responses to 200; no new fallback ships.
- scripts/performance-benchmark.mjs and new performance tests: disposable 100-product production-HTTP benchmark, real tag invalidation/permission checks, filters/ranking/pagination/image regression tests. CI runs test:performance after build.
- tests/commerce.test.ts: repair existing fake $queryRaw to accept both SQL objects and tagged templates. tests/hero-settings.test.ts: assert successful saves invalidate the public tag.

Tradeoffs: finite responsive transforms consume some additional first-use Cloudinary credits; shared image fallback state adds small client code; Next Form increases total build JS modestly and public HTML gains source descriptors. Admin pagination adds a selection/count SQL statement while reducing hydrated rows and response size. No paid service, lockfile/dependency upgrade, destructive migration, production fixture write, order mutation change or hosting migration.

Validation commands/results are recorded in TEST-REPORT.md. Before/after HTTP samples and complete response times are in BENCHMARKS.md. LCP/CLS/INP, real navigation/image visibility and production/provider acceptance remain unavailable; no production-grade performance target is claimed from this local evidence. Conventional checkout concurrency is left to existing dedicated-PostgreSQL CI.
