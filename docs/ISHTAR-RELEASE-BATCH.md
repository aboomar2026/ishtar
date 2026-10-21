# ISHTAR consolidated release batch

Target: `aboomar2026/ishtar`, branch `main`.
Public site: https://ishtar-store.netlify.app/

## Release prerequisites

The owner reported completing the additive Order schema SQL (checkoutRequestKey, checkoutFingerprint and unique request-key index) before authorizing this release. The submitted screenshots were unavailable here, so production database state is owner-confirmed rather than independently inspected. No database connection, migration, reset or seed is run by this release.

The owner also confirmed updating NEXT_PUBLIC_SITE_URL in Netlify to the new public origin. Existing Telegram URL guards and regression tests from main are retained.

## Scope

This batch contains the storefront/admin/SEO improvements, checkout retry protection, inventory/cart validation and isolated regression suites described in ISHTAR-BATCH-IMPLEMENTATION.md and ISHTAR-RUNTIME-VERIFICATION.md. Those reports record their original snapshots; their statements about pending source reconciliation and database application are historical. This note records the later release decision.

## Validation and limits

Release validation passed: TypeScript; ESLint (zero warnings); static brand checks 28/28; URL tests 5/5; commerce tests 9/9; production build; real-Prisma integration tests 12/12 against a disposable PGlite database. Test notification credentials are removed; no live Telegram message is sent.

Browser/mobile visual acceptance, independent PostgreSQL concurrent transactions, interactive admin uploads and physical/PDF printing remain unverified. Deployment success must be checked in Netlify after main is updated. This source release does not certify full production readiness.
