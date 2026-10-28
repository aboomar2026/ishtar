# ISHTAR 2.0 — Implementation roadmap

23 October 2026. Proposed slices only; no implementation ticket below is claimed completed by the audit. Keep the existing branch/PR #3, no merge, and consolidate preview pushes to limit build usage as the owner instructed. This explicit instruction overrides the brief's generic suggestion to open a new PR per slice. Preserve scoped local commits and a reviewable combined PR.

## Dependency and rollout decisions

Finish Sprint 0 before expanding customer features. Prioritize durable order alerting immediately after baseline safety, ahead of cosmetic breadth: the owner previously experienced missing order/Telegram visibility. This changes the brief's default discovery-before-admin order based on operational impact. Missing wishlist/reviews do not equal broken checkout.

| Batch | Scope / priority | Specific modules likely to change | Schema / tests / rollout |
| --- | --- | --- | --- |
| B0 Safety gates | Conventional Postgres race harness; role/capability guards; bounded admin list; keyboard-persistent hero pause; build/migration separation | `tests/checkout.integration.test.ts` plus separate concurrency suite; `features/admin/auth/*`, admin order/upload routes/actions, order queries, `HeroView.tsx`, rotation tests, `netlify.toml` | Default no commerce schema change. Separate DB target test, role denial, last-stock/replay/cancel contention, hero focus and existing regression suite. Review build mapping before any push |
| B1 Durable order events | F24, then F22 and F21; pending/failure status visible; minimal admin feed | `order.actions.ts`, `order-notifications.ts`, `lib/telegram.ts`, new notifications feature/dispatcher, `AdminShell.tsx`, dashboard/orders | Additive outbox/delivery/recipient tables; conventional DB lease/crash/failure/replay tests; visible-tab latency/backoff/two tabs; feature flags and worker rollback |
| B2 Stock and admin insight | F25, targeted F26 and later F28 | Shared stock transitions, inventory/order cancellation actions, dashboard queries/components | Threshold dedup/rearm and actor records if enabled; raw order fixture reconciliation and Asia/Hebron boundaries; no made-up conversion analytics |
| B3 Product discovery | F01, F02, F03, F05; F34 small independent slice | SearchBar, catalog query/normalization/suggestion handler, ProductCard, shared variant selection/dialog, brand storage, new favorites/recent/share modules | Local storage features need no new table. Keyboard/stale query/hidden item/storage denial/cart validation tests and mobile browser flows; no second search backend |
| B4 Real merchandising | F04/F06/F07, F10/F13/F14 conditional on genuine content | Product admin/media/gallery; curated associations/looks; home/catalog; current hero editor | Add nullable variant media association and curated relations only if necessary; owner mapping/photos; validate stock/price, total and no implicit discount |
| B5 Admin devices | F23 PWA/push after in-app reliability works | Admin manifest/worker/subscription endpoint, notification adapter/settings | Add device subscriptions, explicit opt-in, expiry/logout; background/device/deep-link tests; no private response cache |
| B6 Retention, optional | F09/F11/F12/F27/F29/F30; F33 when number supplied; F35/F36/F37 only with approved provider/consent | Existing catalog/cart/customer/admin modules, approved provider adapters | Business inputs and purpose/retention model first; customer sends disabled by default until explicitly approved |
| B7 Launch acceptance | Full staging E2E, performance/a11y, genuine content/inventory and release runbook | Tests/docs/config only as required by findings | Isolated target DB/channel/origin release rehearsal, schema/app compatibility, rollback and human acceptance. No automatic production deploy |

F08 reviews, F15 Q&A, F16 comparison, F31 personal cart recovery and F32 scheduled digests remain deferred unless a real need and operating capacity justify them. F20 evolves existing motion, not a new framework migration.

Effort ranges per feature are in 02. Do not sum them as a delivery promise: shared components reduce some effort, external approvals/device/provider access add elapsed time.

## Sprint 0 checklist

- [x] Verify repo, PR #3 head, open/unmerged state, recent merges, preview status; distinguish production.
- [x] Preserve clean starting source; use latest source rather than archive.
- [x] Run all existing tests, TypeScript, lint, static identity checks and production build against local tree matching remote.
- [x] Read-only desktop preview: search focus, actual carousel/autoplay, product link, image loading, zoom/Escape/focus return; production home opened separately.
- [ ] Build independent-connection conventional PostgreSQL harness with synthetic fixtures and a hard guard rejecting external DB targets; current machine has no `psql`, `postgres` or `docker` on PATH.
- [ ] Prove last-item contention, same-key concurrency, response loss, stock adjustment/cancel races and ledger invariants using independent clients.
- [ ] Enforce/test role capabilities on all private routes/actions; define CATALOG_MANAGER order access policy explicitly.
- [ ] Inspect preview/production build DB environment mapping without disclosing secrets; remove implicit future live schema execution from routine builds through reviewed configuration.
- [ ] Complete mobile widths, 200% text, reduced motion, full keyboard flow and cross-browser smoke in a supported test environment.
- [ ] Isolated interactive admin CRUD/upload/cancel and A4 print acceptance; no customer messages.
- [ ] Establish repeatable browser E2E smoke fixtures/CI rather than treating HTTP rendering as browser interaction.
- [ ] Capture performance/automated accessibility baseline and unresolved blocker ledger; update 07.

## Required owner facts, when relevant

Approved contact/support/policy/service details; real catalog photos/stock/prices and curations; staff role expectations; sandbox/provider decisions for optional outbound channels. These are content/operations dependencies, not permission requests for ordinary implementation. Existing database/Telegram stay unchanged. No need to purchase a service or add Three.js to start B0–B3.

## Local implementation and preview gate

Each slice: reproduce → modify minimal module → relevant tests → full milestone regression → document evidence. Push only a useful consolidated batch after local checks; a preview build may execute configured SQL today, so resolve the target/runbook first. Never confuse preview availability with launch approval. Production/merge/live migration/external messages remain separate explicitly approved actions.
