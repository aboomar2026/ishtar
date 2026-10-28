# ISHTAR 2.0 — Release readiness and blocker ledger

23 October 2026. Initial audit snapshot; see 08 for subsequent B0 fixes and passing conventional PostgreSQL CI evidence. Outbox, live feed, mobile and business acceptance still remain. **GO for continued local/preview development; NO-GO for certifying a new production launch.** No production release/merge was requested or performed. Existing production operation is not being changed by this report.

The historical 76% estimate is not evidence. The table below uses explicit weighted dimensions and checklist numerators; no overall readiness percentage is assigned while critical gates are unverified. A missing competitive enhancement and a critical correctness failure are not equivalent.

## Weighted evidence assessment

Each dimension has five stated gates. Numerator counts only fully passed gates at the stated scope; partial/blocked/not-tested gates earn no PASS. Weights are planning importance, not a measured probability of success. Gates overlap intentionally across operational concerns; do not add them to claim independent statistical confidence.

| Dimension / weight | Verified gates / denominator | Gate disposition, in order | Evidence and confidence |
| --- | --- | --- | --- |
| Core purchasing — 20 | 4/5 | PASS current DB variant pricing; PASS transaction/stock rollback; PASS replay/conflict recovery; PASS phone ownership tracking; NOT TESTED independent concurrency | 10 commerce, 6 client, 14 integration runner tests; medium confidence in isolated sequential behavior, low in contention |
| Customer experience — 15 | 2/5 | PASS desktop home/product navigation sample; PASS desktop image zoom/Escape/focus spot check; NOT TESTED full mobile checkout; FAIL competitive discovery scope incomplete; NOT TESTED cross-browser | Browser Chromium 1363×936; narrow spot checks, low confidence in broad acceptance |
| Admin workflow — 15 | 1/5 | PASS isolated session/SSR; NOT TESTED interactive CRUD/print; FAIL role capability separation absent; FAIL live-order feed absent; FAIL durable notification center absent | Source guards/queries and isolated SSR; medium confidence in identified gaps |
| Reliability/security — 20 | 2/5 | PASS notification error does not roll back committed order by source separation; PASS request uniqueness/rollback in disposable DB; FAIL durable delivery/retry absent; NOT TESTED live schema compatibility; NOT TESTED full abuse/authorization/concurrency review | Source plus isolated tests; fail gates are verified source gaps, not an exploit report |
| Performance/SEO/accessibility — 15 | 2/5 | PASS isolated private-flow noindex; PASS URL/sitemap/robots fixtures; NOT TESTED deployed performance; NOT TESTED automated a11y/full assistive review; NOT TESTED mobile/zoom/forced-color coverage | URL 5 + HTTP tests; source standards do not establish runtime compliance |
| Business/content/operations — 15 | 0/5 | NOT VERIFIED real inventory/photos; BLOCKED approved support details; BLOCKED approved policies; NOT VERIFIED service/content approval; NOT TESTED launch infrastructure/recovery acceptance | Owner input and release rehearsal needed; low confidence until signed off |

The checklist has 11 passed gate observations out of 30 defined gates, with different scopes and weights. This is evidence coverage, **not “36.7% launch ready.”** Technical release, customer polish, and business readiness remain separate: technical release blocked by safety/operational verification; customer experience partially demonstrated on desktop; business readiness not established.

## Blocker ledger

| ID | Type / priority | Owner | Evidence or reproduction | Exit criterion |
| --- | --- | --- | --- | --- |
| G01 | P0 correctness verification | Engineering/QA | Conventional Postgres absent on current PATH; PGlite one backend cannot exercise independent transaction contention | Two-client stock=1/same-key/cancel-restock race suite passes with ledger invariants |
| G02 | P0 operational gap | Engineering | Inject Telegram failure after commit: current code has no persisted retry/event; source R01 | Outbox atomically enqueued, retry/terminal failure visible, replay/crash behavior tested; ambiguous external delivery documented |
| G03 | P0 requested admin scope | Engineering | Open dashboard/order list does not subscribe/poll; revalidation is not a live feed | New synthetic order appears in 5–15s target under normal conditions; bounded feed, visibility/backoff, auth/two-tab tests |
| G04 | P0 responsive acceptance | QA/owner device acceptance | Only desktop sample observed in this audit | Supported mobile emulation plus physical Android/iOS acceptance recorded separately; full purchase path/200% text/sticky controls |
| G05 | P0 release compatibility | Engineering + account owner | Current build applies hero SQL; live schema/env mapping not independently inspected | Approved target mapping/read-only schema check, isolated migration/rehearsal and rollback, no accidental cross-target writes |
| G06 | P0 business launch prerequisite | Owner/catalog operations | Contact number unset; actual inventory/photos/policies unapproved in evidence | Genuine catalogue and required support/policies/service details supplied and reviewed |
| G07 | P1 security hardening; gating for multi-role staff | Engineering + owner policy | `CATALOG_MANAGER` passes general admin guard for order operations/CSV | Explicit capability policy and denial tests for PII/edit/export/print; active DB role used |
| G08 | P1 UX/accessibility | Engineering/QA | Layout rotation resumes on content blur by source; full state/a11y matrix incomplete | Persistent pause after keyboard interaction, explicit restart; focus/state/assistive checks |
| G09 | P1 performance/scale | Engineering/QA | Full admin list unbounded; mobile Web Vitals unmeasured | Capped list/feed and repeatable mobile performance baseline; no material regression |
| G10 | Acceptance gaps, severity depends on finding | QA/operations | Live upload/channel/interactive CRUD and A4 print not exercised | Authorized synthetic staging walkthrough and PDF/physical acceptance with redacted evidence |

No new reproducible P0 visual purchasing defect was demonstrated in the sampled preview pages. Do not turn NOT TESTED into either PASS or a confirmed bug. Source-confirmed operational gaps do not prove a particular historical order was lost.

## Safe release and rollback runbook

1. Review PR diff, migration compatibility and resolved ledger. Keep PR #3 unmerged until separately authorized.
2. Confirm intended application/database/media/channel/origin mapping without printing secrets. Preserve current preview infrastructure; prepare new launch infrastructure only through its own approved process.
3. Back up/rehearse in isolated DB, apply only reviewed additive changes with explicit live approval where needed. Do not seed/reset existing data.
4. Verify preview build corresponds to reviewed source; test synthetic staging journeys, privacy/roles, notification worker and performance. An old green status is not proof of new changes.
5. Obtain business acceptance and explicit merge/production release approval. No automatic customer messages, provider purchases or channel changes.
6. If regression: disable new feature/worker scheduling, restore last known-good app deployment, retain additive schema/events. Reconcile in-flight orders/outbox before resuming. Never “rollback” by deleting orders/tables or resending every pending event blindly.

Human acceptance: owner validates actual products/photos/prices/stock and support policies; staff validate their permitted tasks/live visibility; QA validates phone/tablet/desktop and assistive flows; engineering validates schema/app/worker rollback and safe observability. Record actual date/build/device rather than an unqualified “QA complete.”
