# ISHTAR 2.0 — Audit handoff

## B0 — Safety implementation follow-up, 23 October 2026

Application changes on the same PR branch:

- `SUPER_ADMIN` retains all current administration. `CATALOG_MANAGER` retains products/categories/inventory/banners/hero editing and lands on products; dashboard/order data, detail, invoice, packing, export and all six order mutations now require order permission before private data access. Navigation matches server authorization. The active database role overrides stale signed cookie claims; unknown/inactive roles fail closed.
- Admin order list is bounded to 50 rows/page with stable createdAt/id ordering, totals, previous/next links preserving filters, and filter changes resetting pagination. Invalid status/delivery/date/page URL values normalize before Prisma. Existing CSV export remains its separate bounded export path.
- Hero layout autoplay remains paused after content focus leaves and restarts only by explicit play. Hover/background pause behavior is retained.
- Netlify build now only generates Prisma client and builds the app; it no longer executes live hero SQL on every preview/production build. No migration or database setting was changed.
- Added guarded conventional-Postgres race suite with two child processes/independent backend PIDs, explicit lock-wait overlap barrier, and tests for last-item purchase, simultaneous replay, conflicting payload, duplicate cancel and cancel/manual-stock ledger race. Added read-only GitHub Actions workflow using a disposable PostgreSQL 16 container bound to loopback, with a runtime-generated masked password. No runtime dependencies added.

Fresh B0 checks: typecheck/lint/build PASS; brand 28/28; commerce 10/10; checkout-client 6/6; hero 14/14; Cloudinary/site URL 8/8; admin/target safety 4/4; isolated Prisma/HTTP integration 17/17. Total 59 runner tests including parent groups. New HTTP assertions cover catalog-role denial for every private order page/print/export, retained catalog access, stale super-admin cookie claims, and 56-order pagination fixtures. This is server/HTTP validation, not interactive browser/mobile acceptance.

Local `test:concurrency` is **BLOCKED / did not pass**: no conventional PostgreSQL executable/service is available, and package-manager setup failed on OS setuid/setgroups restrictions. The command intentionally fails on missing `ISHTAR_TEST_POSTGRES_URL` instead of accepting ambient `DATABASE_URL` or silently skipping. Target-validation tests pass; actual races require the new CI service or an explicitly provisioned local disposable DB. Do not mark concurrency cleared from typecheck or PGlite results. CI/deploy status must be verified against the resulting remote head before acceptance.

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
