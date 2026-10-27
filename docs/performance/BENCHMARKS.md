# Before/after lab measurements

Same host, production Next build/start, fresh 100-product PGlite fixture, single DB connection; first + seven warm sequential requests per route. Warm medians below. No p95, mobile simulation or field p75 claim. See BASELINE.md for conditions and definitions. The final after-run ran without concurrent builds/tests.

| Route | TTFB ms before → after | Complete HTML ms before → after | DB statements before → after | Local DB execute ms before → after | Decoded HTML bytes before → after |
|---|---:|---:|---:|---:|---:|
| / | 57.4 → 52.9 | 62.5 → 59.4 | 27.0 → 26.0 | 10.5 → 9.5 | 168,765.0 → 170,129.0 |
| /product/ishtar-beauty-1-1 | 30.0 → 28.6 | 34.2 → 32.9 | 14.0 → 13.0 | 4.2 → 3.6 | 70,461.0 → 70,704.0 |
| /collections/beauty-touch | 32.0 → 27.2 | 38.6 → 35.7 | 15.0 → 8.0 | 5.4 → 3.2 | 168,788.0 → 169,604.0 |
| /category/collection-beauty | 20.6 → 21.5 | 25.3 → 26.1 | 7.0 → 7.0 | 1.4 → 1.4 | 120,593.0 → 121,382.0 |
| /category/all?q=عطر | 26.2 → 24.7 | 30.0 → 28.8 | 8.0 → 8.0 | 3.4 → 3.0 | 115,207.0 → 115,937.0 |
| /cart | 2.2 → 2.7 | 2.8 → 3.2 | 0.0 → 0.0 | 0.0 → 0.0 | 40,512.0 → 40,512.0 |
| /checkout | 2.6 → 2.2 | 3.1 → 2.9 | 0.0 → 0.0 | 0.0 → 0.0 | 40,822.0 → 40,822.0 |
| /admin/orders | 13.3 → 10.5 | 17.9 → 12.3 | 3.0 → 3.0 | 0.3 → 0.3 | 29,825.0 → 29,825.0 |
| /admin/products | 61.9 → 26.0 | 83.5 → 34.1 | 6.0 → 7.0 | 1.7 → 1.5 | 556,976.0 → 162,080.0 |
| /admin/collections | 23.3 → 21.7 | 27.1 → 26.2 | 8.0 → 8.0 | 1.8 → 2.0 | 91,012.0 → 91,012.0 |

Collection SQL statements fall from 15 to 8 (46.7%). Product pills remove one statement. Admin product response is bounded to 24 rows instead of 100; the response reduction below includes responsive image descriptors and pagination UI. Admin selection adds one SQL statement; no net statement-count saving is attributed to request-scoped auth reuse in this fixture.

First-byte time is not proof of earlier meaningful product paint; browsers were unavailable. Loading-boundary candidates were removed after SEO tests exposed soft 404s. Full HTML times do not uniformly improve, and local millisecond differences on unchanged routes are noise rather than regressions/improvements established by this sample. No network/provider throughput inference is justified.

| Build artifact metric (all static JS; not route JS loaded by a browser) | Before | After |
|---|---:|---:|
| files | 44 | 44 |
| bytes | 1,870,830 | 1,885,805 |
| gzipBytes | 551,423 | 558,288 |

Client build JS increases modestly (shared error-handling image component, Next Form). Bundle-size reduction was not achieved. Actual route-specific transferred/executed JS is not measured.

| Required browser/provider metric | Status |
|---|---|
| Home→Product/Collection, Collection→Product, Product→Related/Cart, Search→Product, Cart→Checkout navigation/meaningful paint | Not measured; HTTP route responses only |
| Admin client navigation to Orders/Products/Collections | Not measured; signed-in HTTP route responses only |
| LCP / CLS / TBT / INP | Not measured |
| Main image visible time, image transfer bytes, requests by type | Not measured |
| Browser cache hits, CDN headers and serverless cold starts | Not measured / not verified |

Raw samples: [baseline.json](baseline.json), [after.json](after.json). After-run includes successful authenticated public hero cache invalidation and anonymous/changed-role/revoked-session checks on a local production Next server. No live infrastructure was load-tested.
