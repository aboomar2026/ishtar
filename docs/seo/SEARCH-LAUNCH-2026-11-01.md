# Ishtar search launch — 1 November 2026

## Observed production baseline

Read-only HTTP checks of https://ishtarstore.vercel.app on 1 November 2026:

- `/robots.txt` returns 200, permits public crawling, excludes admin/API routes and advertises the production sitemap.
- `/sitemap.xml` contains 208 URLs: 180 products, 18 category pages, 8 collections, home and collections index. This is a discovery inventory, not an indexed-page count.
- Homepage HTML contains `index, follow`, an HTTPS canonical on the Vercel production origin and JSON-LD. No Google verification meta tag was found. DNS/file/other ownership verification and existing Search Console properties were not inspected.
- No live ranking, Search Console coverage, field Core Web Vitals or Google indexing status has been established.

## Code changes in this batch

- Collection pagination has a self-referencing canonical per page, with metadata using the same page normalization as the displayed products. Tracking parameters are excluded.
- Collection metadata uses the shared title/description, Open Graph, Twitter and deployment-indexing policy. Product images provide the collection share-image fallback.
- Collection detail pages expose BreadcrumbList JSON-LD.
- Sitemap includes all published collection pages and no longer silently limits collections to 100 or loads unused collage images. Existing product/category visibility and preview policies remain.
- No products, prices, business policies, domains or production settings were changed.

## Google Search Console setup

1. Open https://search.google.com/search-console and check whether the site already has a property. For the current host, use a URL-prefix property: `https://ishtarstore.vercel.app/`.
2. If unverified, choose HTML tag verification. Copy only the `content` value of the provided meta tag to Vercel Production environment variable `GOOGLE_SITE_VERIFICATION`. Redeploy Production, then press Verify. Keep the token configured after verification. The application already supports this variable.
3. Submit `sitemap.xml` in Sitemaps. Check the last-read result, not just the submission acknowledgement.
4. Inspect home, one real product, one category and one collection. Run the live test and request indexing for representative important pages. Live-test success does not prove indexing.
5. Review Page Indexing exclusions and Google-selected canonical URLs. Noindex on cart, checkout, tracking, wishlist, search and filtered pages is intentional. Investigate excluded public product URLs individually.
6. Check product structured data with https://search.google.com/test/rich-results . Prices, currency and stock must match the visible page; do not invent ratings, GTINs, return policies or shipping terms.
7. Track Performance by query, page, country and device. Compare consistent weekly/28-day windows: impressions, clicks, CTR and average position. Avoid treating a `site:` search as a complete indexing report.

## Content and ranking work

- Start with the actual catalogue: accurate Arabic product names, original useful descriptions, materials, sizes, colours and use/care details. Replace demo/duplicate content where present; this audit did not verify all 180 product descriptions.
- Write category/collection introductions around real customer intent, such as accessories or hair care in Gaza, only where the range and delivery service support those claims. Avoid repeated keyword stuffing and unsupported coverage claims.
- Keep product/category/collection links crawlable. Add clear delivery, returns and contact information only after the business confirms actual policies.
- Use descriptive image alternative text and inspect mobile performance using PageSpeed Insights and Search Console field data. Local build tests do not measure real-user Web Vitals.
- Link the store from the verified brand social profiles. Prioritize useful content and legitimate mentions over purchased links or guaranteed-ranking offers.

## Domain changes

The verified runtime canonical currently uses `ishtarstore.vercel.app`. Do not switch to an unconnected domain. When a purchased domain is connected and confirmed: make it the primary domain, permanently redirect the old host, update `NEXT_PUBLIC_SITE_URL`, redeploy, verify the new Search Console property and submit the new sitemap. Follow Google's site-move guidance for the actual migration.

## References

- https://developers.google.com/search/docs/specialty/ecommerce/how-to-launch-an-ecommerce-website
- https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- https://developers.google.com/search/docs/appearance/structured-data/product

## Validation

Production build passed. SEO and public-origin unit checks passed 13/13. Production HTTP integration checks passed 8/8, including collection pagination, redirects, image fallback, breadcrumbs and discovery beyond 100 collections. TypeScript and ESLint passed. Local runtime was Node 24.22.1; the repository deployment target is Node 22.x, so hosted CI remains the target-runtime check. The integration suite uses an isolated disposable PGlite catalogue; it never connects to the production database. Deployment and Search Console actions remain separate from local verification.
