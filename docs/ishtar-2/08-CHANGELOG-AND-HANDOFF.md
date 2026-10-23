# ISHTAR 2.0 — Audit handoff

## B2a — Dashboard periods and stock visibility

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
