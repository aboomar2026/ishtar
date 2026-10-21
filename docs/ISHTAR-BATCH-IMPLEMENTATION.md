# ISHTAR — Consolidated implementation batch

Prepared: 21 October 2026, Asia/Hebron. Local branch: `ishtar/ui-qa-batch`.

> Follow-up: see `ISHTAR-RUNTIME-VERIFICATION.md` for the newer real-Prisma/HTTP tests and the checkout advisory-lock fix. The validation/limitations below describe the original batch snapshot.

## Result and source

Implemented a consolidated source batch against the previously prepared ISHTAR working snapshot, preserving the four other brand profile files and all official artwork. The original `project_sources/01-src.zip` is an older source reference without ISHTAR; it was not used to overwrite the newer implementation.

The original working directory was left intact. The batch lives in the sibling `ishtar-batch` checkout. Its inherited index contains previous identity changes, while the new batch is an additional working-tree diff. No new remote HEAD was fetched during this implementation. Reconcile against the actual target branch before committing/pushing; do not assume the local base is the latest GitHub state.

No push, merge, deploy, production database update, real order, admin mutation or production print was performed in this implementation phase. The attached source archive excludes dependencies, build output, git internals and environment secrets.

## Implemented

- Global search uses an all-products category. Category queries rank and filter on effective purchasable variant prices and actual non-cancelled order quantities before applying pagination. SQL is parameterized and includes stable tie breakers, total count and bounded page size. Prisma's existing includes load only the selected product IDs.
- Legacy JSON-encoded details are normalized safely into bullet items. The cheapest unavailable option no longer determines the purchase price when available options exist. Prices isolate bidirectional text and use consistent formatting.
- Cart prices and stock refresh from the server on restore, additions/removals and window focus. Stale responses are ignored, unavailable items remain visible, quantities are capped, failed refresh blocks proceeding, storage failure is handled, and deletion has an undo action. Product add buttons report when the available quantity is already in the cart.
- Checkout has exception recovery, focus on its error summary, a link back to edit the cart, and less repetitive delivery copy. Arabic/Persian digit keyboards are normalized for phone/quantity inputs. Tracking validates individual fields and prioritizes its form when there are no saved orders.
- Checkout attempts use a random, session-persisted key, a server-side payload fingerprint, an advisory transaction lock and a unique database key. A replay returns the existing receipt without deducting stock again or sending another notification. Uncertain responses retain the key and expose a receipt recovery flow. Post-commit cache errors do not turn a committed order into a reported purchase failure.
- ISHTAR styling reduces hero/header height and decorative effects, aligns the hero content, balances category presentation with a horizontal list, improves product readability and empty states, and reserves mobile bottom/safe-area space. Homepage lists are shorter; further editorial deduplication can be reviewed in visual acceptance.
- Navigation entries are shared between desktop and the mobile drawer; mobile icons match their purpose. Dialogs manage focus, Escape, focus restoration and background scroll. Product images support an accessible zoom dialog and selected thumbnails.
- Unverified imported ratings/sold counters are hidden by default for ISHTAR. This does not clean the live catalogue or certify its data. Other profiles retain their metrics setting. `NEXT_PUBLIC_SHOW_CATALOG_METRICS=true` is an explicit opt-in after business verification.
- Admin improvements include labelled fields, toggle semantics, mutation failure messages, upload status announcements, blocking product save while its upload is active, product-editor unsaved-change protection, and an explicit product search action. Inventory rejects blank/fractional/negative fields and explains partial saves. Cancelling the reason prompt now cancels the cancellation workflow itself.
- Admin login offers password visibility and localized errors. Banner editing explicitly explains when the identity overrides database text. Pending footer links and empty social content are hidden for ISHTAR without inventing contact details or policies.
- Per-product/category metadata, public sitemap, robots rules, noindex metadata on private flows and a recoverable error boundary were added. A configured public HTTPS origin is required for production QR generation; it must not silently point at localhost.
- Pending-delivery invoices show a draft notice in screen and print output. Print counters are described as print-window requests, not successful physical prints. Admin/tracking/receipt display and today-filter boundaries use Asia/Hebron.

## Validation actually completed

| Check | Result | Scope |
|---|---|---|
| `npm ci --ignore-scripts` | PASS | Locked dependencies installed; Prisma generation run separately. |
| `npm run db:generate` | PASS | Client regenerated from the additive schema; no database change. |
| `npm run typecheck` | PASS | Complete TypeScript source tree. |
| `npm run lint` | PASS | Zero errors/warnings under the repository's existing lint rules. |
| `npm run brand:check` | PASS 28/28 | Static identity/assets checks; not visual approval. |
| `npm run test:commerce` | PASS 9/9 | Focused tests using an isolated in-memory Postgres via dev-only PGlite. |
| `npm run build` | PASS | Production compilation and route generation; dynamic DB routes were not exercised against production. |

The tests generate the database DDL from the current Prisma schema and check 30-product pagination, effective-price ordering/filtering, non-new global search, parameterized search, actual-sales ranking, legacy detail normalization, Arabic/Persian digits, business-day boundaries, and idempotency column/index repeatability and uniqueness. ORM product hydration is stubbed to fixtures; the catalogue SQL itself executes in Postgres. These tests do **not** prove concurrent full checkout execution, UI behavior, mobile layout, authenticated administration or printer output.

The `tsx` CLI's local IPC socket was unavailable in this environment; the test script uses `node --import tsx --test` and passes without that socket.

## Required before deploying this batch

1. Review the additive schema update against a **test** database. `scripts/sql/ishtar-checkout-idempotency.sql` adds two nullable columns and a unique index to `Order`. Existing rows are preserved. No order/customer data is modified by that SQL. Back up and apply through the deployment's established DB change process before this application version serves checkout.
2. This repo has no Prisma migrations baseline. Do not manufacture a migration history or run reset/seed on an existing store. For a new disposable test DB, the full Prisma schema can be created with the existing `db:push` workflow. For an existing DB, use the reviewed additive SQL within the established release process, then regenerate Prisma.
3. Set `NEXT_PUBLIC_SITE_URL` to the approved public HTTPS origin. Confirm the site's current Netlify configuration and badge control in the actual account. No hosting setting was changed here.
4. Finish mobile/tablet visual acceptance, keyboard/dialog testing, full checkout concurrency/retry/stock scenarios and authenticated admin/print checks against isolated test data.
5. Reconcile the source with the latest GitHub branch, review the combined diff, push one consolidated branch and inspect a deployment preview before a production release. No push/deploy is authorized as completed by this report.

## Disposition of the 48 review items

“Implemented” means source work is present, not universal runtime approval. The numbered review remains in `ISHTAR-EXPANDED-UI-REVIEW-2026-10-21.md`.

| Review IDs | Disposition |
|---|---|
| 01–08 | Core source fixes implemented; targeted catalogue tests pass. Full checkout/cart UI, network interruption and retry concurrency acceptance remain. |
| 09–12, 14, 18–19, 23 | Styling/layout source implemented. No post-change mobile/desktop visual approval claimed. Real product photography remains a content task. |
| 13 | Homepage section sizes reduced. Editorial deduplication/selection remains to be judged with actual inventory and visual review. |
| 15 | Live names, descriptions and slugs were not mutated. Requires catalogue cleanup and redirects approved with the actual products. |
| 16–17 | Unverified metrics hidden for ISHTAR; actual sales ranking and price presentation corrected. Business verification and content cleanup remain. |
| 20 | Hosting badge/account configuration remains; no Netlify setting changed. |
| 21 | General-image guidance added; automatic color-to-photo matching requires real variant image data and was not fabricated. |
| 22, 24–29, 33 | Interaction, navigation, tracking, zoom and login source fixes implemented. Browser/assistive technology acceptance remains. |
| 30 | Main loose labels and upload/mutation feedback improved. A full screen-reader audit of all admin validation states remains. |
| 31 | Banner identity-override explanation and mutation failure feedback implemented. Copy policy remains intentionally identity-owned. |
| 32 | Product editor warns about unsaved changes; inventory validates blanks and reports partial save. Other long editors and full transactional save UX remain to be validated/improved. |
| 34 | Misleading pending links/empty social block hidden. Actual return policy, contacts and official channels remain owner-supplied content. |
| 35 | Metadata, sitemap, noindex and error boundary implemented; public-origin configuration and live crawler responses still need release verification. |
| 36 | Print wording and draft behavior improved; A4 multipage physical/PDF acceptance remains. |
| 37–40 | Checkout focus/copy/line totals/edit link and Arabic digit fixes implemented; numeral normalization tested. |
| 41 | Delivery-region policy left unchanged pending owner confirmation. No service area was invented or removed. |
| 42–48 | Source changes implemented, including retry schema, cancellation guard, admin search/localization, QR guard, timezone and print draft notice. Schema application, concurrent purchase tests and admin/print acceptance remain. |

## Explicit limitations

- The code may not yet be published: the live Netlify site remains unchanged by this implementation.
- Build success does not establish working production database credentials, applied schema, uploads, notifications or authenticated administration.
- No screenshots of the changed app were obtained. No post-change UI/UX pass is claimed.
- Retrying a purchase after uncertain connectivity must preserve its key. The code provides recovery, but failure injection after commit and concurrent independent browser tests remain required before release.
