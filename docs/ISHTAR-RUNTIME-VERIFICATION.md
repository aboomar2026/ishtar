# ISHTAR — Runtime verification follow-up

Date: 21 October 2026, Asia/Hebron. Local branch: `ishtar/ui-qa-batch`.

## Outcome

The production server starts. Real Prisma checkout operations and production HTTP rendering now pass against a disposable, in-memory Postgres instance accessed through its PostgreSQL wire protocol. No production database, real customer, hosting setting or remote repository was changed.

A blocking checkout defect in the previous batch was found and corrected: the advisory-lock SELECT returned PostgreSQL `void`, which Prisma could not deserialize (`P2010`). The result is now cast to text while retaining the same transaction-scoped lock. Before this fix, the new runtime test failed to create an order; after it, creation, replay and rollback tests pass.

Use **ISHTAR-runtime-verified-batch.zip**, superseding the earlier consolidated archive for further work.

## Checks completed

| Check | Result |
|---|---|
| TypeScript | PASS |
| ESLint | PASS, no errors/warnings |
| Production build | PASS after checkout fix |
| Static brand checks | Previously PASS 28/28; identity assets/profiles unchanged in this follow-up |
| `npm run test:commerce` | PASS 9/9 |
| `npm run test:integration` | PASS 12/12 (11 scenario subtests plus their parent test) |

### New integration coverage

1. Invalid checkout fields create no order and reserve no inventory.
2. A valid purchase uses the current variant price from the database, rather than the product base price; creates one order and one stock log, and starts with delivery pending.
3. Replaying the same committed request key returns the same receipt and deducts no additional stock.
4. A changed payload using the same key is rejected. Receipt recovery returns only the order number and does not expose customer details.
5. Insufficient stock rolls back the attempted purchase, leaving order/log counts unchanged.
6. Tracking rejects the wrong phone and accepts the matching phone with Arabic digits.
7. Cart availability returns the current price and treats a disabled category as unavailable; checkout rejects it too.
8. Production HTTP responses render the homepage, all-products category, product, cart, checkout and tracking. Unknown-product handling is present in the response. This check does not claim a 404 transport status where Next streams a not-found boundary.
9. Admin routes redirect an unauthenticated request to login. A synthetic admin authenticates through the real credential function; the wrong password fails. A signed test session permits HTTP rendering of dashboard, products, orders, inventory, categories and banners. This is not an interactive browser login test or an admin mutation suite.
10. A pending-delivery invoice displays its draft notice; a confirmed free-delivery invoice does not. Invoice and packing-slip HTML render 50 synthetic order lines; fixture totals match those lines. The packing slip retains its no-prices policy text. This is not A4/PDF pagination verification.
11. Private-flow noindex markup, robots response and a public-product sitemap are present; the sitemap excludes admin links.

## Test architecture and isolation

- `@electric-sql/pglite-socket` is a dev dependency. It exposes a fresh in-memory PGlite database only to the current test process and its child production server.
- DDL is generated from the current Prisma schema. A new database is created on every run. The test runner replaces `DATABASE_URL` with its own loopback socket URL; it never accepts a supplied external database URL.
- Checkout, stock, queries, credential verification and session signing use the actual application functions and real Prisma, without mocking those operations. The older catalogue-focused suite still stubs ORM hydration while running its SQL in Postgres, as previously documented.
- The standalone Node runner supplies only Next's `server-only` build marker through a scoped preload. The child Next production server uses its normal bundler/runtime. No production authentication check is disabled.
- A test admin has a random password and signing secret. Customer names, addresses and phones are synthetic fixtures. Telegram credentials are removed from the test environment, so no notification is sent externally.
- Next chooses an available HTTP port. The runner parses the child server's own announced URL, avoiding an unrelated local application.
- The parent Prisma connection is closed before child-server checks and prepared statements are cleared. PGlite multiplexes a single backend connection; this isolation avoids prepared-statement collisions between separate Prisma clients, which were a test-environment issue rather than an app fix.
- Direct calls to the checkout action outside a Next request naturally lack Next's revalidation store. The expected cache-refresh error is logged, while the committed order remains successful. This also exercises the post-commit error boundary. HTTP rendering itself uses the real Next request context.
- The child server, Prisma client, socket and in-memory database are closed after the run, including failure cleanup.

## How to rerun

Use the project directory with a supported Node version (this run used Node 24):

```bash
npm ci
npm run db:generate
npm run typecheck
npm run lint
npm run test:commerce
npm run build
npm run test:integration
```

The integration runner requires the production build. It does not require production credentials, Docker, a persistent database or live-store seed/reset commands. Its test-only server-marker preload must remain limited to that test command.

## What remains unverified

- The cloud browser could not reach the terminal environment's loopback HTTP server (`ERR_CONNECTION_REFUSED`). The production server was reachable to its own test-process HTTP client. The separate browser-network limitation does not imply the application is down.
- No changed-page screenshot, mobile/tablet responsive approval, keyboard interaction test, accessible-dialog browser test or visual typography acceptance was completed.
- PGlite/socket serializes transactions through one backend. Sequential retries pass, but independent concurrent transactions, competing last-item purchases and real multi-connection advisory locking still need tests against an isolated conventional PostgreSQL server.
- Interactive admin creation/editing/upload/cancellation workflows remain untested in a browser. Only credential verification and authenticated SSR routes were covered here.
- Browser storage recovery, service interruption after an HTTP response is lost, full checkout through the browser, actual notification delivery and external media uploads remain unverified.
- Fifty-row document HTML passes. Actual A4/PDF page breaks, printer behavior and QR scanning remain unverified.
- Catalogue copy/photos, confirmed service areas, actual contacts/return policy and Netlify badge configuration remain owner/content or hosting tasks from the 48-item review.

## Release gate

The additive checkout SQL still needs the established database release process before deploying this schema-dependent version against an existing database. It has not been applied to production. Set the real public HTTPS origin before production QR/sitemap use.

No Push, Merge or Deploy was performed. The next useful step is a test deployment/database accessible to a browser for the remaining visual and interactive checks; the current evidence supports server integration, not full production readiness.
