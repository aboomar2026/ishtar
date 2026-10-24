# B1 — Durable notifications and live admin activity

23 October 2026. Same PR #3; preview only, no merge. This batch adds F21/F22/F24 foundations without applying SQL or changing the existing DB/Telegram configuration. Activation remains explicit.

## Implemented behavior

- With `ORDER_OUTBOX_ENABLED=true`, checkout writes one `OrderNotification` in the same transaction as the order/inventory ledger. Unique `orderId` plus existing request-key locking prevent duplicate events on replay. Failed enqueue rolls the transaction back; failed provider delivery after commit cannot roll an order back.
- Immediate post-commit attempt preserves existing Telegram behavior. A durable row records PENDING/PROCESSING/RETRY/SENT/FAILED/UNCERTAIN, attempt count, next retry, safe error code, and a leased owner token. Provider calls occur outside database transactions. Attempt history is stored separately.
- Only one dispatcher can claim an event using an atomic conditional update. Known transient errors back off (30/60/120/240 seconds, respecting Telegram's `retry_after`) and stop after five automatic attempts. Missing config, rejected requests or a migrated group require operator correction. Invalid or extreme provider delays (more than seven days) require operator review instead of shortening the requested delay. No bot token, raw provider response, customer profile or message text is written to attempt logs.
- Network loss/malformed response or expired in-flight lease is UNCERTAIN. Telegram sendMessage has no application idempotency key; the message may already exist in the channel. No blind automatic resend: the admin must acknowledge possible duplication to requeue it. This is deliberately not an exactly-once delivery promise.
- `/admin/notifications`: 25 events/page, order links, independent per-admin read/read-all state, delivery status/attempt count/error guidance, explicit retry and a bounded “process due attempts now” action. Reading a notification does not confirm the order. No historical event backfill or unsolicited resend.
- `/admin/api/order-activity`: authenticated SUPER_ADMIN only, no-store, compact counts/revision without customer PII. Admin shell polls every 10s while visible/online, avoids overlapping requests, ignores stale replies, aborts on cleanup and backs off to 120s on errors. Lost authorization clears state and refreshes auth. Dashboard/order list/notification center refresh after changes while preserving typed fields by deferring refresh during editing. Print routes do not mount the activity toolbar; print CSS also hides it.
- CATALOG_MANAGER is denied the notification page, feed and every notification action, including read-all and dispatch. Authorization uses current DB role, not an old cookie claim.

## Feature-off compatibility

Default is OFF. The existing database needs no immediate change: checkout keeps the legacy Telegram path; feed counts/live order refresh work using existing Order rows; notification page explains that the saved center is not enabled. Feature-off behavior is tested with the notification tables absent.

Do not enable the flag before applying and checking SQL. If the flag is enabled while required tables are missing, enqueue fails closed instead of silently committing an order without its promised durable event.

## Reviewed additive SQL, not executed against the store

File: [prisma/additive/order-notifications.sql](../../prisma/additive/order-notifications.sql).

Creates only these new tables/indexes/constraints:

1. `OrderNotification` — one logical order-created event and Telegram delivery state.
2. `OrderNotificationRead` — event/admin read state, separate from provider delivery.
3. `OrderNotificationAttempt` — outcome of each attempt.

No existing order/customer/catalogue row, column or counter is updated, seeded, deleted or backfilled. Logical order/admin IDs avoid altering existing tables; a deleted/missing order becomes a visible failed delivery rather than a fabricated notification. New-table foreign keys cascade only read/attempt records with their notification.

The script enables RLS on all three server-only tables without public policies. The Prisma runtime must use the table owner or an appropriate server role; browser Data API roles are not granted access by this script. The script is transactional and repeatable. Test it against the intended isolated database and take the normal backup/checkpoint before any approved live application. `prisma generate` only generates code; it does not apply this SQL. Netlify builds intentionally do not execute migrations.

## Activation sequence requiring owner approval

1. Verify the actual Preview DB target in the hosting account without printing credentials. Keep the current DB and Telegram channel; do not replace either.
2. Review/apply `prisma/additive/order-notifications.sql` explicitly to that target after approval. Check all three tables and the unique order/event and attempt indexes. Do not seed/reset or run db push against the store.
3. Set `ORDER_OUTBOX_ENABLED=true` for the intended environment and rebuild the reviewed app. Leave worker flag/secret unset for the first manual preview acceptance.
4. Use authorized synthetic test orders only after agreeing their destination and mocked/sandbox notification channel. Verify one order/event, status/read isolation, retry/error states. This engineering batch did not submit real orders or send live Telegram messages.
5. Preview retries can be processed explicitly by a SUPER_ADMIN via the center. Netlify schedules **do not run automatically on Deploy Previews or branch deploys**. The page warns when scheduled processing is unavailable. The first attempt still occurs after a new checkout commit when outbox is enabled.
6. For a separately approved scheduled environment: generate a random secret of at least 32 characters securely (never in chat/repository), set matching server/function `ORDER_OUTBOX_WORKER_SECRET`, and `ORDER_OUTBOX_WORKER_ENABLED=true`. Confirm both Next functions and the scheduled function receive these runtime variables. The cron invokes only its own immutable `DEPLOY_URL`, with a secret-protected POST and redirect refusal. The internal route rejects requests while disabled or without the secret. A manual Netlify Run now may be used only for the approved preview/test destination; production schedule requires its own release approval.
7. Confirm scheduler success/failure in Netlify, event status transitions, lease recovery and channel receipt. An enabled flag is configuration evidence, not evidence that a worker or external delivery actually ran.

Cron is bounded to three due attempts per invocation and a wall-clock budget; empty/disabled paths send nothing. Function invocations and DB reads have usage cost; monitor actual volume before shortening poll/schedule intervals. No paid service/provider or push permission is introduced.

## Rollback and privacy

Disable worker flag/scheduling first, then disable the outbox flag and retain tables/events/attempt history. The app resumes its previous new-order Telegram path. Existing pending events are not automatically replayed; reconcile SENT/UNCERTAIN with the channel before re-enabling. Do not drop tables, clear queues or resend all events as rollback. Rollback cannot guarantee exactly-once delivery across an ambiguous provider outcome.

The center contains order identifiers and safe status codes, not duplicate contact/address/message snapshots. Only SUPER_ADMIN can access it. No service worker or private offline cache; no web push/email/marketing in this batch. Define retention/archive policy before high-volume operation.

## Verification

Uploaded application head `9f98c6f8b6b0202740943e0cc2bb2cc2eba9f6f6`, tree `dbea6ef8f7ab76cbc85097ee8187c0b7ecccde79`. Netlify Deploy Preview `6adb80a001714c38829c1578` succeeded for that head. [GitHub Actions run 39980725697](https://github.com/aboomar2026/ishtar/actions/runs/39980725697), job `120506992105`, passed admin safety 4/4, notifications 13/13 and all seven independent PostgreSQL race scenarios (8/8 runner tests including parent). Local TypeScript, lint, production build, brand 28/28 and 73 runner tests including parent groups passed. This deployment/CI checkpoint is retained locally for the next batch; PR #3 has the same results, avoiding a documentation-only preview rebuild.

Local targeted tests cover migration repeatability/existing-row preservation, feature-off operation without tables, real order/enqueue atomicity, provider 429/HTTP200-ok:false/migration/missing-config/network/malformed response, retry cap, read isolation, authorization, stale lease/manual acknowledgement, worker-secret gating, polling/backoff/visibility/offline/cleanup/stale responses. Existing HTTP integration now exercises the enabled center/feed and unchanged checkout/print/SEO flows with synthetic data and mocked Telegram.

Conventional PostgreSQL CI additionally runs the additive SQL twice in its random test schema and races independent processes: last-item purchase, checkout replay/conflicting payload, duplicate cancel, cancel/manual-stock ledger, durable-event replay and two dispatcher claims. Actual CI/deploy outcome is recorded in PR #3 after running, not inferred from this plan.

Interactive signed-in browser/mobile acceptance, actual Netlify scheduled execution, actual Telegram delivery, and the store DB schema remain NOT VERIFIED/NOT APPLIED until separately authorized. HTTP SSR is not browser interaction.

## Primary references

- [Telegram request success/error contract](https://core.telegram.org/bots/api#making-requests) and [ResponseParameters](https://core.telegram.org/bots/api#responseparameters): `ok`, `retry_after`, group migration. Reviewed 23 October 2026; no copied code.
- [Netlify scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/): published-only schedule, manual preview invocation, 30s limit. Reviewed 23 October 2026; scheduled function uses supported default export/config syntax with no extra runtime dependency.
