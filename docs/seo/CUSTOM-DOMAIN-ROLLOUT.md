# Custom domain rollout — 1 November 2026

Production origin: https://www.ishtar.live

The owner saved NEXT_PUBLIC_SITE_URL=https://www.ishtar.live/ for Production in Vercel. A new production build is required for Next.js public variables and redirect configuration to take effect. Preview builds retain noindex and do not redirect to production.

## Application paths

- Telegram new-order messages already use publicSiteUrl() to generate /admin/orders/{id}. Retrying an unsent notification renders its link from current configuration; previously sent Telegram messages are not edited.
- Product WhatsApp inquiries and native/clipboard shares use the same configured origin. Cart WhatsApp contains a support message; order WhatsApp contains the order number, without customer contact information or an administrative URL. No direct WhatsApp SDK or webhook depends on the domain.
- Invoice and packing-slip QR codes point at /track-order?order={number} on the configured origin. Previously printed QR codes remain unchanged; the former host redirects to the new address.
- Prisma accesses PostgreSQL from the server. No Supabase client, Supabase Auth, Storage SDK or browser-to-Supabase request exists in the current source. No Supabase CORS/Auth configuration change is indicated for this application. Provider dashboards were not inspected.
- Cloudinary image delivery uses independent HTTPS asset URLs; product assets are not moved during this migration.

## Redirects

On Vercel Production, when the configured origin is https://www.ishtar.live, known aliases ishtarstore.vercel.app and ishtar.live receive permanent host redirects. Paths and queries are retained. Custom production host and preview hosts do not match the redirect rules. Netlify is an independent legacy deployment and is not changed by these rules.

## Checks completed before release

- Production build, ESLint and TypeScript passed.
- Deployment checks 5/5, SEO/public-origin checks 13/13, WhatsApp checks 3/3, discovery/share checks 4/4 passed.
- Isolated checkout integration passed 21/21 using disposable PGlite, including current prices, stock, retry/idempotency, tracking, authenticated print routes and mocked Telegram transport. Added assertions confirm the actual rendered Telegram admin URL and invoice tracking QR URL use www.ishtar.live.
- Live browser smoke test: home and product images loaded; a product added to cart at ILS 25; cart and checkout retained the item and total on www.ishtar.live. No live order was submitted and no real Telegram/WhatsApp message was sent.
- Google Search Console verified www.ishtar.live ownership using the existing HTML verification file. Submit its sitemap only after confirming all XML locations use the new host.

## Release verification

Check the production homepage/product canonical and Open Graph URLs; robots sitemap declaration; every sitemap location; product and gallery WhatsApp payloads; native/clipboard share output; tracking page and checkout; loaded Cloudinary images; and a deep link plus query on both known aliases. Confirm that production and preview deployments succeed. Search Console discovery does not establish indexing or ranking.

A production test order, actual provider delivery, old-message rewriting and legacy Netlify configuration are outside the completed smoke checks.
