## B3d — Product quick view and rollout alignment (2026-10-24)

- One lazily loaded native modal for all storefront product cards (including saved/recent lists); explicit quick-view action and multi-option card button open it without route navigation. Existing one-variant quick add remains. Closing returns focus to its opener, releases scroll lock and aborts outstanding reads; route changes clear selection.
- Reuses compact ProductDetailClient and thumbnail gallery: current price, stock, color/size/quantity and existing cart validation, with a full PDP link. No nested image zoom, duplicate share controls, fake stock/ratings or data writes on opening. Loading/error/retry/unpublished/out-of-stock states are explicit; only one bounded no-store public catalog request per opening/retry.
- Desktop two-column modal, phone bottom-sheet CSS, reduced-motion handling. Native showModal supplies inert background and modal focus behavior; explicit close/Escape/backdrop support. Actual desktop browser and device acceptance are recorded separately; renderer tests do not establish browser focus behavior.
- Shared selector normalizes unspecified size to default, removes the unsafe fallback to another variant for a mismatched selection, resets feedback/quantity on option changes, waits for cart hydration and clears its feedback timer on unmount.
- Owner-applied rollout evidence: screenshots confirm all three tables have RLS enabled, preview rebuilt after configuration, and notification center displays one SENT event with one attempt. Actual channel receipt remains owner verification; scheduled worker is still disabled on preview. SQL source now includes the same RLS activation, with a repeatable-migration protection check. No live SQL, configuration change, order or Telegram message was performed by this batch. The requested admin display-name SQL was provided for owner execution; its result is not independently verified.
- Local validation passed: ESLint, production build/TypeScript, quick-view 2/2, notifications 13/13 (including additive RLS check), discovery 4/4, wishlist 4/4, hero 14/14, search 2/2, brand 28/28 and isolated integration 21/21. CI/preview and browser acceptance are pending this source upload.
- Source remains on PR #3; no merge/production deployment. The local previous UI screenshot remains local and is omitted from this source upload.

## B3c verification checkpoint (2026-10-23)

Remote head `cc71f9af3c6b9d73dbe2a1e9973c3a4839f8bb4c`, local source tree `22e22444a6ec5ff3cf55d046520033010320b661`. GitHub Actions run 40020991898 succeeded, including discovery and PostgreSQL race checks. Netlify deployment 6adbc6278fe03e32f301546b succeeded. Local typecheck/lint/build, discovery 4, wishlist 4, search 2, brand 28 and isolated integration 21 passed.

Desktop preview: opened abiaa, used share (UI reported copied), visited tttttt and observed abiaa only in the recent rail at current price 80. Returned home: tttttt then abiaa at 100/80; reload preserved the order; explicit clear removed the rail. Test history cleaned. No external sharing recipient or real order. Native phone share and screen reader remain unverified. Screenshot ui-recent-2026-10-23.jpg is local QA evidence, not yet uploaded to GitHub; avoid an evidence-only Netlify rebuild.

## B3c — Recently viewed and product sharing (2026-10-23)

- Brand-scoped browser IDs only, most recent first, deduplicated and capped at 12. Successful published PDP visits record views; home/PDP show up to four currently published products, excluding the current PDP. Existing bounded no-store catalog endpoint revalidates prices/availability; hidden products are filtered before the display limit.
- Cross-tab/focus/visibility refresh, request cancellation/stale guards, timeout/retry and explicit clear. Denied/quota storage falls back to temporary document memory. Failed durable clearing is disclosed, rather than claiming old disk records were erased.
- PDP share uses configured public origin when present, otherwise the currently opened page origin, with only the encoded product path (no query/customer/order data). Native cancellation is silent; unsupported/denied share uses clipboard, then a selectable manual URL. Preview-origin fallback is an actual preview link, never claimed as the canonical production URL.
- Four focused tests cover history sanitation/order/cap, actual rail lifecycle/stale replies/exclusion/denied writes, native share/cancel and clipboard/manual fallback. Existing endpoint integration already checks published visibility and current prices.
- No new package, live DB/configuration/Telegram changes, orders or external messages. Same PR/preview only; B1 activation remains deferred. Physical mobile native share/keyboard and screen reader acceptance remain pending.

# ISHTAR 2.0 — Audit handoff

## B3b — Browser wishlist

Verified final remote head `2f98d72da532fa17a035d22bf1c718d613cb3d95`: Netlify deploy `6adbc0b6407577b706a5dd5a` and Actions run `40017999435` passed. Initial feature deploy plus one visual correction deploy: browser review caught an unstyled action class; it now uses the shared `ghostButton` (47px measured height), and the final build passed. Desktop acceptance sampled real public merchandise: card save synchronized three repeated homepage instances; PDP retained saved state; another tab's wishlist displayed the saved product/current price; removing it there updated the first PDP to unsaved. Test saves were cleaned up. No checkout/order/provider message or live DB mutation occurred. This is ordered two-tab synchronization, not an atomic concurrent-writer guarantee. This post-deploy checkpoint remains local for the next batch; PR description has the same evidence, avoiding a docs-only rebuild.

Adds a product-level wishlist with per-brand `wishlist:v1` ID-only storage, 50-item cap, malformed-input cleanup, deduplication, shared card/PDP state and cross-tab storage event updates. Actions read latest storage before writing to reduce lost updates; localStorage is not an atomic multi-tab database. No write on initial hydration. Read/quota denial falls back to memory and clearly reports that saves are session-only. No account, personal profile, cross-device sync, reservation or new database table.

Card heart is outside product links and separate from cart actions; PDP has a labelled pressed-state button. Header/drawer navigation adds favourites; the fifth mobile shortcut becomes favourites while checkout remains accessible from cart. Global feedback uses polite status text, a close control and no forced focus. `/wishlist` is noindex and revalidates IDs via bounded no-store POST; current published products/active categories only, existing price/stock mapping, stored order preserved. Missing/hidden IDs are retained until explicit cleanup. Page handles loading, empty, provider failure/retry and focus/visibility refresh, aborting stale requests. No live stock mutation, provider message, schema/config change or merge.

Local TypeScript/lint/production build, brand 28/28, wishlist 4/4, search 2/2 and isolated Prisma/HTTP integration 21/21 passed. Remote CI/preview acceptance is recorded after upload. Wishlist tests cover bounds/corrupt input, shared views, storage events, latest-read merging, denied reads/quota errors, memory fallback, cap without eviction, stale catalog replies, provider failure without data loss, explicit missing-item cleanup and listener/request teardown. HTTP integration additionally tests saved-products price/visibility/dedup/request limits and noindex SSR. Physical mobile, screen-reader and simultaneous competing-write acceptance remain pending; source capability is not full launch acceptance.

## B3a — Predictive catalogue search

Remote head `9497c96592f92cda97526dd0fad268ec6f1ca506`, source tree `f603e26ef645ec3c405547c185c18d87c1165225`. Netlify deploy `6adba657adfa31fc0d254d95` and Actions run `40003015055` succeeded. Desktop browser sample: Arabic query produced five suggestions with matching product images/prices; ArrowDown kept focus on the combobox, selected `/product/silver-scent`, and Enter reached its actual PDP. No browser order or external message was submitted. Physical mobile/screen-reader acceptance remains unverified. One source branch update/deploy in this batch. Auto-review initially rejected a JPEG upload because privacy was unverified. The owner subsequently explicitly approved uploading both previous screenshots to GitHub; these are included in the evidence-only follow-up. Code/tests/text documentation were uploaded normally. This result checkpoint is included in the owner-approved evidence-only follow-up; it changes no application behavior.

Adds a first-party no-store suggestions endpoint: 2–120-character normalized queries, six results maximum, current published products/active categories only, escaped parameterized LIKE patterns, deterministic order and minimal public DTO. Price uses lowest active in-stock variant, otherwise lowest active variant/base fallback; no stock quantities or private records returned. One preferred image per result and safe fallback. Uses the existing case-insensitive name/subtitle/description/brand and exact-tag matching semantics; does not claim fuzzy matching, Arabic stemming or typo correction.

Header combobox debounces 300ms, aborts stale/unmounted/closed requests, bounds request time and rejects invalid replies. Old terms are not rendered after query changes. Arrow keys manage active option, Escape dismisses, Enter opens selected product or full results; submit button always opens full results. Input retains DOM focus during listbox selection, selected options scroll into view, blur outside closes, clear refocuses. Loading/empty/error messages and full-results fallback remain available. Search still blurs before actual navigation; physical keyboard dismissal needs device acceptance. Dropdown has RTL styling, bounded scroll height and 44px+ actions; no motion or new dependency/schema/service.

Local typecheck/lint/build, client search 2/2 and isolated Prisma/HTTP 20/20 passed, including cap, published/category visibility, active available-variant pricing, literal wildcards/injection-shaped input, stale replies, error/empty states and cleanup. Existing storefront/admin/checkout/print flows remain in HTTP suite. WAI-ARIA reference: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ (reviewed 23 October 2026). Not a screen-reader or mobile-device acceptance claim. B1 activation remains deferred; same PR #3, no merge/live data/config/Telegram change.

## Storefront UI corrections — hero, merchandise, brand strip and search

Verified final remote head `ff025b728aa71c78bcd27b5b89caac958816be64`: Netlify preview `6adb8f026ba1a7dfdd039e62` and Actions run `39989337950` succeeded (all configured steps). An initial consolidated deployment followed by one visual correction deployment was used: desktop review found residual brand-strip imbalance; the correction distributes text and gives both hero actions a 24px line height. Final desktop DOM measured both action heights at 50px, zero horizontal document overflow and zero broken completed homepage images; five sampled photos match intrinsic aspect ratios and frame bounds. Arabic Enter search navigated to `/category/all?q=...` with input unfocused. This is not a physical mobile keyboard test. Owner-approved screenshots: [hero](evidence/ui-hero-2026-10-23.jpg) (initial UI follow-up) and [balanced strip](evidence/ui-band-2026-10-23.jpg) (final UI correction). These show the earlier UI review, not the subsequent predictive-search dropdown. Local search 1/1, hero 14/14, Cloudinary/site URL 8/8, HTTP integration 19/19, brand 28/28, typecheck/lint/build passed; final CSS correction build passed. The owner-approved evidence-only follow-up publishes these captures; PR contains the corresponding test results.

Owner-reported mobile screenshots and current desktop preview inspected. Hero secondary CTA now shares the primary button's dimensions/radius/type treatment with an outlined style, including readable inverse colors in the signature layout; mobile actions stack. Product photos use natural source proportions instead of fixed-height letterboxes, retain the existing noncropping Cloudinary fit transform, and no longer zoom on hover. Phones use two vertical cards per row so media no longer stretch beside a tall text column. A fallback aspect ratio reserves image space before loading; final dimensions follow intrinsic media, so mixed-ratio rows can vary and image-load layout movement needs device acceptance. No original image content is reconstructed or edited.

The boutique strip replaces the 27px symbol inside a large circular medallion with the existing clear wordmark and tighter responsive spacing. Search uses native search semantics/keyboard hint and explicitly blurs the field before nonempty navigation; clear refocuses the input and blank submission leaves editing available. Physical mobile keyboard dismissal still needs device confirmation.

No catalog deduplication, live content/database/Telegram change, merge or production deployment. Same PR #3, one consolidated preview update after checks. Search lifecycle test added to CI; existing hero, Cloudinary and isolated HTTP regressions run locally. Visual/deployment evidence is recorded after upload, not inferred from CSS.

## B2a — Dashboard periods and stock visibility

Verified remote head `1fc2ed5529aab762c0b898d278fcfd863862cf92`, shared source tree `5eed4297652324b71ca4d7177d838c077c4bc4cd`. Netlify preview `6adb88614199cc0d387526f4` succeeded. [Actions run 39985423418](https://github.com/aboomar2026/ishtar/actions/runs/39985423418), job `120523211753`, passed admin safety, notifications, dashboard and conventional PostgreSQL concurrency steps. Same PR remains open/unmerged. This post-deploy evidence checkpoint is kept locally until the next batch to avoid a docs-only rebuild; PR description has the same evidence. No new authenticated browser/mobile acceptance claimed.

Adds today/7-day/30-day order summaries and a zero-filled daily table with proportional decorative bars, keyboard scroll access, Arabic labels and responsive period navigation. Calendar windows use Asia/Hebron dates including 23/25-hour DST days; SQL groups UTC-stored timestamps in that same timezone. All counts use current order status for the creation-date cohort. Noncanceled value excludes canceled orders; delivered value is explicitly not proof of cash collection. Pending delivery-fee counts and explanatory labels disclose incomplete totals. No visitor tracking or invented conversion metrics.

Fixes the dashboard stock query that previously fetched only 100 lowest-quantity variants before applying each variant's threshold. Filtering now happens in SQL before taking six alerts, with full aggregate counts and consistent active variant/product/category scope. Counts no longer fetch all variant rows. Splits confirmed and processing cards so each links to its correct status. Recent orders get a stable ID tiebreaker, and today's queries use an exclusive next-day end.

No schema/config/database/Telegram change or new package. F25 persistent crossing/rearm events and F28 actor audit remain pending; this is a read-only B2 slice, not completion of the entire batch. B1 activation was explicitly approved by the owner but then deferred by the owner until laptop access to Netlify/Supabase; authentication was declined and no live activation occurred. Preserve that deferral.

Validation: dashboard 6/6 (real isolated Prisma/SQL, fixture reconciliation, empty/canceled-only, DST/midnight, and the old 100-row failure); HTTP integration 19/19 includes private dashboard period SSR and role guards; admin safety 4/4; brand 28/28; TypeScript/lint/production build pass. These are server/isolated checks; signed-in interactive/mobile acceptance and production-volume performance remain unverified. Remote CI/deploy results are reported in PR #3 after upload.

## B1 — Notification reliability and live admin activity

Implemented on the same branch: transactional order event, leased Telegram attempts/retries and safe ambiguous-outcome handling; per-admin read/read-all center; protected compact activity feed and visibility/offline/backoff polling; manual due-attempt processing and optional secret-protected scheduled worker. Files and activation/rollback instructions: [09-NOTIFICATION-ROLLOUT.md](09-NOTIFICATION-ROLLOUT.md).

Application/schema code is prepared, but no live SQL, environment flag, worker secret, existing DB/Telegram setting, historical event backfill, real order or external message was applied. Default OFF preserves the current order notification path. Live counts/refresh use existing order tables independently. Durable-center activation requires explicit reviewed additive SQL and flag approval; preview cron does not run automatically.

Local validation: Prisma client generation, typecheck, lint, brand 28/28, commerce 10/10, checkout-client 6/6, hero 14/14, Cloudinary/site URL 8/8, admin safety 4/4, notification/polling 13/13 and real Prisma/HTTP integration 18/18. Total 73 runner tests including parent groups. Negative tests intentionally emit synthetic DB enqueue/receipt-failure logs; no live channel is contacted. SQL repeatability/old-table compatibility, after-commit failures, retry/read isolation, worker auth, enabled-center SSR/private-feed revision, polling cleanup and print-toolbar exclusion are covered. Independent dispatcher/replay races are prepared for actual PostgreSQL CI; inspect its resulting run before claiming PASS.

No mobile/signed-in interactive browser, real scheduled worker, real Telegram delivery or live-schema acceptance is claimed. New data tables are additive and require review before activation; disabling flags/worker preserves existing tables/events for reconciliation.

## B0 — Safety implementation follow-up, 23 October 2026

Application changes on the same PR branch:

- `SUPER_ADMIN` retains all current administration. `CATALOG_MANAGER` retains products/categories/inventory/banners/hero editing and lands on products; dashboard/order data, detail, invoice, packing, export and all six order mutations now require order permission before private data access. Navigation matches server authorization. The active database role overrides stale signed cookie claims; unknown/inactive roles fail closed.
- Admin order list is bounded to 50 rows/page with stable createdAt/id ordering, totals, previous/next links preserving filters, and filter changes resetting pagination. Invalid status/delivery/date/page URL values normalize before Prisma. Existing CSV export remains its separate bounded export path.
- Hero layout autoplay remains paused after content focus leaves and restarts only by explicit play. Hover/background pause behavior is retained.
- Netlify build now only generates Prisma client and builds the app; it no longer executes live hero SQL on every preview/production build. No migration or database setting was changed.
- Added guarded conventional-Postgres race suite with two child processes/independent backend PIDs, explicit lock-wait overlap barrier, and tests for last-item purchase, simultaneous replay, conflicting payload, duplicate cancel and cancel/manual-stock ledger race. Added read-only GitHub Actions workflow using a disposable PostgreSQL 16 container bound to loopback, with a runtime-generated masked password. No runtime dependencies added.

Fresh B0 checks: typecheck/lint/build PASS; brand 28/28; commerce 10/10; checkout-client 6/6; hero 14/14; Cloudinary/site URL 8/8; admin/target safety 4/4; isolated Prisma/HTTP integration 17/17. Total 59 runner tests including parent groups. New HTTP assertions cover catalog-role denial for every private order page/print/export, retained catalog access, stale super-admin cookie claims, and 56-order pagination fixtures. This is server/HTTP validation, not interactive browser/mobile acceptance.

Local `test:concurrency` is **BLOCKED / did not pass**: no conventional PostgreSQL executable/service is available, and package-manager setup failed on OS setuid/setgroups restrictions. The command intentionally fails on missing `ISHTAR_TEST_POSTGRES_URL` instead of accepting ambient `DATABASE_URL` or silently skipping. Target-validation tests pass; actual races require the new CI service or an explicitly provisioned local disposable DB. Do not mark concurrency cleared from typecheck or PGlite results. CI/deploy status must be verified against the resulting remote head before acceptance.

### Verified remote follow-up

Remote head `1db6459fcea24dc64405a95922cc4f2bbdaf45e6` contains application/documentation tree `3a1268e5a1d2b3cb68dd833579feb71be2c119b8`, verified identical to the locally tested source tree. PR #3 remains open/unmerged. One consolidated branch update triggered one preview build.

GitHub [run 39954772424](https://github.com/aboomar2026/ishtar/actions/runs/39954772424), job `postgres-races`, **PASS**: PostgreSQL setup, clean npm install, Prisma generation, admin safety 4/4 and conventional concurrency 6/6 runner tests (five scenarios + parent), cleanup all successful. This clears the five tested conventional concurrency cases; it does not prove arbitrary load/multi-SKU deadlock handling or production database compatibility. Local conventional PostgreSQL remains unavailable; remote CI supplied the independent server.

Netlify deploy `6adb551d88b5ed364cb47ead` **SUCCESS** for that head. Fresh desktop Chromium preview smoke verified persistent keyboard-content pause after blur, explicit play/resume and subsequent pause, zero broken completed homepage images and no horizontal document overflow at the sampled viewport. No signed-in live admin changes, real orders or Telegram sends were made. Device/mobile and other release gates remain.

Desktop visual sample: [B0 preview](evidence/preview-b0-2026-10-23.jpg). Keyboard pause/resume was verified from the live controls/DOM; a static photo alone does not prove timing.

PR title/description updated with actual CI and deployment evidence. This small post-deploy documentation checkpoint is kept locally for the next batch to avoid a documentation-only Netlify rebuild; the PR description contains the same current verification results.

### Running the race suite safely

Use a conventional local PostgreSQL server with a dedicated database named `ishtar_qa_concurrency`, accessed through `127.0.0.1`. Provide a test-only account via `ISHTAR_TEST_POSTGRES_URL`, then run `npm run test:concurrency`. The suite rejects other hosts/database names, creates a random `qa_<uuid>` schema, verifies distinct backend connections, blocks both action transactions before releasing contention, and drops only that run's schema in cleanup. No production credentials or target are required. The workflow provides this disposable service automatically when run on GitHub.

### Database/build compatibility and rollback

Current DB/Telegram stay unchanged. Existing preview already has hero settings from the prior deployment; an older DB without that table continues serving the default hero through the existing fallback. A genuinely new target must receive reviewed `prisma/additive/hero-settings.sql` explicitly before admin hero saves are expected to work; do not reintroduce it into routine builds. No Order/customer/catalog schema changes were introduced in B0.

Rollback the B0 application/config commit if needed; no data restore, destructive schema rollback or external-message replay is part of rollback. Restoring the old Netlify build command would restore implicit SQL execution, so prefer retaining the safer build command. Outbox/live feed/notification center are subsequent B1 work, not shipped in B0.

The initial nine-report audit below remains a historical snapshot. This follow-up supersedes its role, pagination, keyboard-resume and build-SQL findings for the changed local source; actual remote/preview state is separately reported at handoff.

## Audit batch — 23 October 2026

- Branch: `hotfix/cloudinary-fit-images`, existing PR https://github.com/aboomar2026/ishtar/pull/3.
- Audited remote head: `2a9bcad3fd54583b253be8a656d3623917348002`; equivalent tested local commit `2341e19a0186cbbb3c0f43cf2303a8bc30de22a3`; shared application tree `74bdcb69326961a4ebf48d7bc49cf925f39a623a`.
- Scope: read-only application/GitHub/preview examination, research and F01–F37 planning. Nine Markdown reports and one actual desktop screenshot added locally under `docs/ishtar-2/`.
- Application behavior changes: none. New dependencies/API/schema changes: none. Live database/config/content changes: none. No new commit, push, merge, migration, worker, production deploy or external message performed by this audit.
- Checked preview: https://deploy-preview-3--ishtar-store.netlify.app/ ; successful GitHub Netlify status for audited head. Separate production home opened at https://ishtar-store.netlify.app/ ; exact production deployment SHA not independently verified.

## What was already present

PR #1 merged shopping UI/price hierarchy/cart improvements; PR #2 merged checkout recovery hotfix. PR #3 remains unmerged with Cloudinary transform compatibility, independent admin hero profiles, fixed/minute layout rotation, real product carousel/slides, clickable merchandise, decorative motion, SVG icons and unified field states. This audit did not ship those changes again. Historical docs have older test counts; see fresh checks below.

## Fresh validation

TypeScript, ESLint, production build PASS. Static identity 28/28. Runner tests: commerce 10/10, checkout client 6/6, hero 14/14, Cloudinary/site URL 8/8, isolated integration 14/14 (52 total including parent grouping). Details, warnings, exact commands and test-isolation limits in 06. No dependency reinstall/client-generation claim made.

Browser smoke: Chromium 1363×936, RTL; home images/search focus, manual templates, four-slide campaign with observed autoplay, manual next/pause, product CTA→PDP, zoom/Escape/focus restore. No broken completed images or horizontal document overflow in sampled home/PDP checks. This is not comprehensive catalogue, mobile, authenticated admin or full checkout E2E.

Screenshot: [preview product sample](evidence/preview-pdp-2026-10-23.jpg). No customer/admin PII included. No before/after screenshot claim because no UI implementation changed in this batch.

## Findings and next action

Priority: independent Postgres race gate; durable outbox; authenticated bounded admin live feed/notification center; role capability guards; migration/build target governance; mobile/accessibility/performance and business-content acceptance. Do not infer launch readiness from passing build or preview status. No measured overall launch percentage assigned.

Next implementation batch B0 is concrete in 05. It can begin using existing code and isolated tests; conventional DB/device capabilities need a supported environment. Provider purchases, live messaging, production migration, merge and production deployment remain separately approved actions. Routine source implementation does not require a new design approval. Preserve same PR and batch preview pushes as instructed.

## Report index

1. [Current state and findings](00-CURRENT-STATE-AUDIT.md)
2. [Twelve reference patterns and rights](01-COMPETITOR-RESEARCH.md)
3. [All 37 feature rows](02-FEATURE-MATRIX.md)
4. [Design system and component states](03-DESIGN-SYSTEM-AUDIT.md)
5. [Architecture, data and durable delivery](04-ARCHITECTURE-AND-DATA.md)
6. [Batches and Sprint 0 checklist](05-IMPLEMENTATION-ROADMAP.md)
7. [Executed baseline and QA matrix](06-QA-TEST-PLAN.md)
8. [Weighted evidence and release gates](07-RELEASE-READINESS.md)
9. [This handoff](08-CHANGELOG-AND-HANDOFF.md)

No notifications, Slack messages, emails, customer outreach or GitHub issue creation are authorized by the act of documenting these recommendations.
