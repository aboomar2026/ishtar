# عشتار | ISHTAR

ISHTAR is an Arabic, RTL accessories and lifestyle storefront with a staff admin dashboard, built with Next.js App Router, TypeScript, PostgreSQL and Prisma. Its identity uses the approved burgundy, copper, cream and blush palette and official ISHTAR artwork.

## Hosting and database

The deployment target is **Vercel + Prisma Postgres**, with Cloudinary for images. Follow [the deployment guide](docs/VERCEL-PRISMA.md) for the exact Vercel variables and first deployment. Production builds create the schema and initial administrator without demo products or orders. Preview builds do not change the schema.

The [SQL execution ledger](docs/database/README.md) and earlier implementation reports are historical references for the previous database; they are not setup steps for the new Prisma database.

## Identity

- Default brand: `ishtar`, including when `NEXT_PUBLIC_STORE_BRAND` is absent or unrecognized.
- Explicit configuration: `NEXT_PUBLIC_STORE_BRAND=ishtar`.
- Brand profile and copy: `src/config/brands/ishtar.ts`.
- Official artwork and icons: `public/brand/ishtar/`.
- Scoped UI refinements: `src/app/ishtar.css`.
- Other brand profiles remain available for compatibility. Their names and assets are not ISHTAR content.
- Phone, WhatsApp, hours and social accounts remain unset until confirmed. Demo products, photos, ratings and sales counts are not verified ISHTAR business data.

## Implemented areas — runtime acceptance pending

- Storefront: homepage, categories/search/filtering, product variants, cart, cash-on-delivery checkout, order confirmation and tracking.
- Staff dashboard: login, products, categories, banners, inventory, orders, delivery pricing, notes, invoices, packing slips and CSV exports.
- Backend: server-side totals, stock transactions, inventory history and order status history.
- Shared branding: header, mobile navigation, footer, admin, printing and SEO metadata.

## Local setup

Use a dedicated local/test PostgreSQL database. Copy `.env.example` to `.env`, configure it, then:

```bash
npm ci
npm run db:generate
```

For a new disposable test database, set `DIRECT_URL` and create the schema with `npm run db:deploy`, then create staff access with `npm run db:bootstrap`. **`npm run db:seed` deletes existing commerce data before inserting demo records. Never run it against a live store.** Seeding is optional; it is not part of the read-only brand check.

When ready for the final validation phase:

```bash
npm run brand:check
npm run test:commerce
npm run typecheck
npm run lint
npm run build
npm run test:integration
npm run dev
```

The checks listed in the current-status paragraph passed for this batch; `npm run dev` and full browser acceptance are separate. Review the existing backfill scripts individually before using them on an existing database.

## Configuration

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_STORE_BRAND` | Set to `ishtar`; default is also ISHTAR |
| `DATABASE_URL` | Prisma Postgres direct connection string |
| `DATABASE_URL_POOLED` | Prisma Postgres pooled connection for application traffic |
| `DIRECT_URL` | Direct connection for local Prisma CLI; Vercel build defaults it to `DATABASE_URL` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Staff account seed configuration |
| `ADMIN_SESSION_SECRET` | Admin session signing secret |
| `NEXT_PUBLIC_SITE_URL` | Site origin for order-tracking links and print QR codes |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Server-side media upload credentials |
| `CLOUDINARY_FOLDER` | Upload namespace, e.g. `ishtar/dev` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` | Optional order notifications |
| `PEXELS_API_KEY` | Optional demo-media script access |

Only placeholders belong in `.env.example`. Keep real `.env` files and credentials out of Git. New ISHTAR demo-media uploads use `ishtar/demo/`; existing media for alternative profiles retains its compatibility paths. Browser cart, shipping and recent-order data use an ISHTAR namespace without importing other demo brands' saved customer data.

The root `_prod-db-update.mjs` is a **legacy Saad-only utility**, not an ISHTAR deployment step. It refuses to run unless that legacy profile is explicitly selected. No database update was performed during the identity cleanup.

## Routes

| Area | Routes |
| --- | --- |
| Catalog | `/`, `/category/[slug]`, `/product/[slug]` |
| Purchase | `/cart`, `/checkout`, `/order-success` |
| Tracking | `/track-order` |
| Staff access | `/admin/login`, `/admin` |
| Products | `/admin/products`, `/admin/products/new`, `/admin/products/[id]/edit` |
| Catalog administration | `/admin/categories`, `/admin/banners`, `/admin/inventory` |
| Orders | `/admin/orders`, `/admin/orders/[id]`, `/admin/orders/export` |
| Print documents | `/admin/orders/[id]/invoice`, `/admin/orders/[id]/packing-slip` |

## Project structure

- `src/app/` — storefront/admin routes, layout and styles.
- `src/components/` — storefront and admin interfaces.
- `src/config/brands/` — ISHTAR and retained alternative brand profiles.
- `src/features/` — catalog, commerce and staff operations.
- `prisma/` — schema and destructive demo seeder.
- `scripts/` — static checks, demo media and maintenance utilities.
- `public/brand/ishtar/` — official brand assets.

## QA and handoff

Implementation reports are in `docs/ISHTAR-IMPLEMENTATION.md` and the Phase 2–4 reports. Earlier phase reports are historical snapshots. `docs/LOCAL_QA_CHECKLIST.md` and `docs/final-admin-stop-local-test.md` contain inherited baseline checklists, not proof of ISHTAR runtime verification.

Before release, complete content/SEO and font review, confirm business information and real catalog data, then run type/lint/build checks, mobile/desktop visual review, keyboard checks, checkout/admin tests and print preview against a test database. No deployment is implied by this repository import.
