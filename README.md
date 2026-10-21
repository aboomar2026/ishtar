# Bab Al Hara E-commerce

Mobile-first **Arabic RTL** fashion & lifestyle e-commerce app for **Bab Al Hara**, built on a real PostgreSQL + Prisma backend. The storefront keeps a warm boutique identity (cream, beige, camel, tan, brown, black with soft gold accents) while behaving like a fast mobile marketplace.

This is a working **Sprint 5** codebase: real database-backed orders, a protected admin dashboard, full order/inventory/invoice/packing-slip workflow, and CSV export.

## Stack

- Next.js (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL
- Arabic RTL, mobile-first CSS
- LocalStorage cart
- Cookie-based admin dashboard auth

## Features

### Storefront
- Homepage with hero, category showcase, offers, new arrivals, best sellers
- Category listing pages (real categories + virtual `new-in` / `sale`)
- Product detail pages with variants (color, size, SKU, price, stock)
- LocalStorage cart with product/variant snapshots
- Cash on Delivery (COD) checkout that creates **real database orders**
- Order success confirmation
- Public order tracking by order number

### Admin
- Protected login (cookie session)
- Dashboard overview
- Product management (create / edit / list)
- Category management
- Banner management
- Inventory management with manual stock adjustments
- Order management with status transitions, notes, and a "packed" toggle
- Printable invoice
- Printable packing slip
- CSV export of orders

### Backend / business logic
- Database-backed orders with server-side price calculation
- Customer upsert on checkout
- Transactional stock deduction (locked stock transaction)
- Inventory logs for every stock change, including ProductForm quantity edits and initial product stock
- Stock restore on order cancellation
- Order status history

## Routes

### Storefront
| Route | Description |
| --- | --- |
| `/` | Homepage |
| `/category/[slug]` | Category / collection listing (incl. virtual `new-in`, `sale`) with search, sort, availability filters |
| `/product/[slug]` | Product detail with variant selection and add-to-cart |
| `/cart` | LocalStorage cart review |
| `/checkout` | COD checkout form; creates a real order |
| `/order-success` | Order confirmation (reads `?order=` number) |
| `/track-order` | Public order tracking by order number |

### Admin (protected)
| Route | Description |
| --- | --- |
| `/admin/login` | Staff login |
| `/admin` | Dashboard overview |
| `/admin/products` | Product list |
| `/admin/products/new` | Create product |
| `/admin/products/[id]/edit` | Edit product |
| `/admin/categories` | Category management |
| `/admin/banners` | Banner management |
| `/admin/inventory` | Inventory + manual stock adjustments |
| `/admin/orders` | Order list with filters |
| `/admin/orders/[id]` | Order detail: status transitions, notes, packed toggle |
| `/admin/orders/[id]/invoice` | Printable invoice |
| `/admin/orders/[id]/packing-slip` | Printable packing slip |
| `/admin/orders/export` | CSV export endpoint |

## Setup

```bash
npm install
npm run db:generate   # prisma generate
npm run db:push       # sync schema to the database
npm run db:seed       # seed categories, products, banners
npm run db:backfill-delivery-fee-status  # one-time after adding deliveryFeeStatus
npm run db:backfill-inventory-ledger     # one-time after enabling inventory ledger audit
npm run typecheck
npm run lint
npm run build
npm run dev
```

For a migration-file workflow instead of `db:push`:

```bash
npm run db:migrate
```

## Environment variables

Copy `.env.example` to `.env` and fill in your local values. **Never commit real secrets** — `.env`, `.env.local`, and `.env.*.local` are gitignored.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `ADMIN_EMAIL` | Admin login email (used by the seed script) |
| `ADMIN_PASSWORD` | Admin login password (used by the seed script) |
| `ADMIN_NAME` | Display name for the seeded admin |
| `ADMIN_SESSION_SECRET` | Secret used to sign the admin session cookie |
| `NEXT_PUBLIC_SITE_URL` | Public base URL used for QR codes on invoices / packing slips and order-tracking links |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for image uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key (server-side signing) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret — **server-only**, never exposed to the client |
| `CLOUDINARY_FOLDER` | Base folder for uploads (images land under `<folder>/products` and `<folder>/banners`) |

`.env.example` contains placeholder values only and is safe to commit.

## Cloudinary image uploads

Admins can upload product and banner images directly from the dashboard. Uploads
are **signed and server-side**: the browser sends the file to our own protected
route, which validates the admin session, checks the file type/size, and then
uploads to Cloudinary. No unsigned upload presets are used, and the API secret
never reaches the client.

- Upload route: `POST /admin/api/uploads` (multipart form-data, fields `file` + `kind`)
- Delete route: `POST /admin/api/uploads/delete` (JSON `{ publicId }`)
- `kind` is `product` or `banner` (defaults to `product`); files are stored under
  `${CLOUDINARY_FOLDER}/products` or `${CLOUDINARY_FOLDER}/banners`.
- Allowed types: JPG, PNG, WebP, AVIF. Max size: 5MB. SVG/GIF are rejected.
- Both routes require a valid admin session and return `401` otherwise.

**Configure locally**

1. Create a free Cloudinary account and open the dashboard to find your cloud name, API key, and API secret.
2. Add the four `CLOUDINARY_*` variables to your local `.env` (copy the keys from `.env.example`).
3. Restart `npm run dev` so the new env vars are picked up.

Storefront images use `<img>` with `secure_url`, so existing seed/demo image
paths keep working alongside newly uploaded Cloudinary URLs.

**Configure on Vercel**

Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and
`CLOUDINARY_FOLDER` under **Project → Settings → Environment Variables** (do not
prefix the secret with `NEXT_PUBLIC_`). Redeploy after saving. `res.cloudinary.com`
is already allowed in `next.config.mjs` for remote images.

## Project structure

- `src/app/(storefront)` — public storefront routes and layout
- `src/app/admin` — admin login and protected admin routes
- `src/components` — storefront UI components (`src/components/admin` for admin UI)
- `src/features/catalog` — catalog queries, mappers, filters, types
- `src/features/orders` — order pricing, stock, validation, actions
- `src/features/admin/*` — admin queries, actions, and validation per domain
- `prisma/` — Prisma schema and seed script

## QA status

Sprint 7 build. Checkout, orders, inventory, invoices, packing slips, and CSV export are real and functional. Sprint 7 adds signed, admin-protected Cloudinary image uploads for products and banners (manual image URLs still work as a fallback). Customer accounts and a wishlist are intentionally **not** part of this sprint.

## White-label demo identities

The storefront supports selectable brand profiles while reusing the same application, demo database and Cloudinary account. Set `NEXT_PUBLIC_STORE_BRAND` to `saad`, `bab-al-hara`, or `oppeh`. See `docs/BRAND_PROFILES.md` for the profile structure, shared-database banner behavior and asset checklist.
