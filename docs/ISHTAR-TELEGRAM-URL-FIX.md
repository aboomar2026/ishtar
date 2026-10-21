# Telegram order link correction

The notification previously defaulted to http://localhost:3000 when NEXT_PUBLIC_SITE_URL was absent. It now uses the shared public-origin resolver: valid NEXT_PUBLIC_SITE_URL first, then Netlify's main URL environment variable if available. Production rejects HTTP, loopback/local hostnames and embedded credentials. If no valid origin exists, the order notification remains available but omits the broken hyperlink and logs a configuration warning.

## Netlify configuration required

Set NEXT_PUBLIC_SITE_URL to https://ishtar-store.netlify.app for the production context, with both Builds and Functions scope (or all scopes). Redeploy after saving. An environment change alone does not change an existing deployment or previously sent Telegram messages.

Expected new notification link: https://ishtar-store.netlify.app/admin/orders/ACTUAL_ORDER_ID

Do not include brackets or the literal orderId placeholder in the environment variable; the code appends the actual order ID.

## Verification

- Five isolated URL regression tests pass: deployed path, Netlify fallback, explicit-domain precedence, rejection of invalid production origins and local development support.
- Run with: node --import tsx --test tests/site-url.test.ts
- No real Telegram messages were sent for verification.
- TypeScript and targeted ESLint passed.
- Environment configuration is managed in Netlify; this commit does not modify the production database.
- The later consolidated batch is documented separately in ISHTAR-RELEASE-BATCH.md.
