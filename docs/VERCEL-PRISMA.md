# Vercel + Prisma Postgres

This is a fresh database deployment. No Supabase export/import or Netlify runtime is required. Cloudinary remains the image host.

## Vercel settings

- Repository: `aboomar2026/ishtar`; production branch: `main`; root: repository root.
- Framework: Next.js; Node.js: 22.x; default install command (`npm ci`).
- Build command: `npm run vercel-build` (also configured in `vercel.json`). Remove any dashboard override with the old build command.
- Connect the existing Prisma Postgres database to Production and Preview. Keep the integration-managed `DATABASE_URL`, `DATABASE_URL_POOLED`, `POSTGRES_URL`, and `PRISMA_DATABASE_URL`.
- Do not copy any Supabase connection URL. `DIRECT_URL` can be omitted on Vercel: the build uses the integration's direct `DATABASE_URL`. If you set it manually, it must point to the same Prisma database.

## Add these environment variables

| Variable | Value |
| --- | --- |
| `ADMIN_EMAIL` | Initial administrator email |
| `ADMIN_PASSWORD` | Initial password, at least 12 characters |
| `ADMIN_NAME` | إدارة عشتار |
| `ADMIN_SESSION_SECRET` | Random secret, at least 32 characters |
| `NEXT_PUBLIC_SITE_URL` | Actual Vercel production HTTPS origin; change to `https://ishtarstore.online` after connecting that domain |
| `NEXT_PUBLIC_STORE_BRAND` | `ishtar` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER` | Existing Cloudinary settings |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` | Existing Telegram settings |
| `ORDER_OUTBOX_ENABLED`, `ORDER_OUTBOX_WORKER_ENABLED` | `true` |
| `CRON_SECRET` | Random secret, at least 32 characters |
| `ORDER_OUTBOX_WORKER_SECRET` | Optional separate secret for POST dispatch; at least 32 characters |
| `ENABLE_TEST_ORDER_RESET` | `false` |
| `SEO_NOINDEX` | `false` for Production; previews are automatically excluded |

## What deploy does

`postinstall` generates Prisma Client, including when Vercel restores dependencies from cache. The Vercel build generates it again, then **Production only** applies the initial schema through `prisma migrate deploy` and creates the first active super administrator. It never inserts products, demo orders or other fixtures. Once an active super administrator exists, later builds do not change accounts or passwords. The old `db:seed` is for disposable demo databases only and is never part of deployment.

Publish Production first so its tables exist before opening previews. Preview builds do not apply schema changes or bootstrap accounts. The current integration connects previews to the same database; edits/orders on previews affect that data.

Application traffic uses `DATABASE_URL_POOLED`, falling back to `DATABASE_URL`. Prisma CLI uses `DIRECT_URL` (automatically mapped by the Vercel build). For local Prisma commands, set `DIRECT_URL` to the direct Prisma connection string in `.env`.

## Notifications

Checkout still attempts immediate Telegram delivery. `vercel.json` configures a daily GET recovery job, authenticated by `CRON_SECRET`. This cadence works on Hobby; failed retryable deliveries can wait until the next daily run. For minute-level recovery, use an external scheduler POST to `/api/internal/order-notifications/dispatch` with `Authorization: Bearer <ORDER_OUTBOX_WORKER_SECRET>`, or change the Vercel cron cadence on a supporting plan. Manual retry remains in the admin dashboard. The Netlify scheduled function has been removed.

## Quick verification

After a successful deployment: open `/`, log in at `/admin/login`, add a category and product with an image/variant, place a test order, verify stock/order totals and Telegram's admin link, and check `/robots.txt` and `/sitemap.xml`. The empty catalog is expected before staff add products.
