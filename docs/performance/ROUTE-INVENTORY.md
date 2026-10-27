# Routes and request graphs

This inventories all page/handler endpoints and shared boundaries in src/app. Dynamic means server rendered per request; it does not rule out the explicitly tagged public hero data cache. SQL counts/times are measured only for the fixture routes in BENCHMARKS.md; the graphs below are source-derived, NOT invented query counts. Browser route JS, image bytes, paint time and navigation type have not been measured. No middleware or templates were found.

| Route | Render / freshness / cache | Request/query graph | Images / JS / navigation; disposition |
|---|---|---|---|
| / | Dynamic; stock/catalog fresh; hero config tagged 300s | Parallel home catalog groups + hero + collection cards; sales, variants, images and category counts | Hero motion/carousel, cards, providers; hero responsive; showcase now transformed/lazy. P08 |
| /product/[slug] | Dynamic; product/metadata React request cache | Product relations → actual sales → parallel collection links and recommendation selection; category fallback if none | One main gallery + small thumbs; details/selection/cart client; Link to related. P02/P05; secondary wait remains |
| /category/[slug] | Dynamic; normalized params request cache | Category and active categories in parallel → filtered ID/count/rank SQL → bounded relations; query group matches if searching | 24 cards (max 48 via internal reader); next/form + Link; P04/P06 |
| Search (category/all?q=) | Same category route, faceted noindex | Same bounded listing graph; optional group matching | Existing predictive search debounce/cancel; actual browser filtering/paint unverified |
| /collections | Dynamic; published groups fresh | Readiness → published group/count rows → bounded three-photo collage per card | CollectionCard; lazy responsive collage; Link |
| /collections/[slug] | Dynamic; summary request cache; membership fresh | Shared summary/count/cover → requested 24 memberships/relations only | 24 cards, bounded page/redirect, Link; P01 |
| /wishlist | Static shell; client saved IDs, fresh no-store API | Local IDs → saved-products POST → visible catalog relations | ID-only local storage, client state; shared cards; no public user cache |
| /cart | Static shell; local cart and live availability | Hydration/ID/focus → cart Server Action → active variants/prices | Client CartProvider; bounded photos; Link checkout. No purchase authority in client |
| /checkout | Static shell; fresh verification and authoritative final transaction | Cart availability → validated server action → idempotency/customer/order/items/stock/outbox transaction | CheckoutForm/recovery; bounded small photos; no real submissions during benchmark |
| /order-success | Dynamic; private receipt lookup, noindex | Order receipt verification through order query helper | Receipt client/links; no public cache |
| /track-order | Dynamic shell; private submitted lookup, noindex | Server action with validated reference/contact → bounded receipt data | TrackOrderForm; bounded small photos; no public cache |
| /admin/login | Dynamic; session current per request, noindex | Cookie signature → active DB user; credential submit verifies password | LoginForm, logo; authenticated redirects |
| /admin/logout | Handler; session mutation | Clear session cookie → redirect | No data cache |
| /admin | Dynamic inherited auth; fresh dashboard | Session guard → parallel product/category/banner/variant/order counts and recent rows; analytics aggregation | DashboardAnalytics client; aggregate fan-out remains; no dashboard cache |
| /admin/products | Dynamic; current role check; fresh rows | Shared request auth → SQL stock/filter/sort/count/IDs → max 24 products with category/image/variant relations; category choices | Server table/mobile cards + filters/actions; bounded photos; Link pages; P03/P07 |
| /admin/products/new | Dynamic inherited catalog auth | Categories → ProductForm | Editor/upload/variants; full image previews retained; no live provider action |
| /admin/products/[id]/edit | Dynamic inherited catalog auth | Product + categories → readiness → groups/complements → bounded selected options | ProductForm/ProductCollections; full editing data retained |
| /admin/inventory | Dynamic inherited auth; fresh | Full variant query with product + primary photo, optional JS low-stock filtering | InventoryTable client; small photos bounded; list pagination remains |
| /admin/categories | Dynamic inherited auth; fresh | Category admin query including descendants/counts | CategoryManager; existing mutations/invalidation retained |
| /admin/banners | Dynamic inherited auth; fresh editor settings | Banner rows + fresh hero settings | BannerManager/HeroEditor/uploads; save invalidates only new public hero tag plus existing paths |
| /admin/collections | Dynamic; explicit catalog auth | Readiness → editors and ordered memberships → batches of selected product options (200) | CollectionManager/picker; tiny previews bounded; editor list remains unbounded |
| /admin/orders | Dynamic; order role required; fresh | Session → order count/page + related private rows | Bounded existing pagination/polling; no aggressive cache |
| /admin/orders/[id] | Dynamic; order role required | Private order/customer/items/history query | Admin operations; small detail thumbs bounded; permissions unchanged |
| /admin/orders/[id]/invoice | Dynamic; order role required | Order print query | PrintableInvoice; print-quality originals retained |
| /admin/orders/[id]/packing-slip | Dynamic; order role required | Order print query | PrintablePackingSlip; existing print behavior |
| /admin/orders/export | GET handler, private/no-store | Authorized filtered bounded export helper | CSV download intentionally uses document/download semantics |
| /admin/notifications | Dynamic; order role required | Notification counts/page/reads + order numbers | NotificationActions; fresh per-admin read state |
| /admin/api/order-activity | Dynamic GET; private,no-store,Vary Cookie | Auth → status groups/latest order + optional unread/failure/latest notification reads | Existing polling/backoff; no session state shared between users |
| /admin/api/uploads | Dynamic Node POST; authenticated | Validate multipart/type/size → signed Cloudinary upload | Admin-only; no production upload test |
| /admin/api/uploads/delete | Dynamic Node POST; authenticated | Validate publicId → explicit Cloudinary deletion | Admin-only; no production deletion test |
| /api/catalog/saved-products | Dynamic POST; no-store/noindex | Sanitized capped IDs → active products/variants/images | Wishlist/recent/quick-view use; cannot expose hidden catalog |
| /api/catalog/suggestions | Dynamic GET; no-store/noindex | Normalized query → bounded public SQL + collection suggestions | Six product suggestions; existing cancellation/timeout preserved |
| /api/internal/order-notifications/dispatch | Dynamic private POST | Worker auth/config → leased outbox processing → mocked transport only in tests | No worker activation/live Telegram send |
| /sitemap.xml | Dynamic; visibility fresh | Public products/images + categories/counts + published groups | Preview noindex behavior retained; no persisted catalog cache |
| /robots.txt | Dynamic config | Canonical origin + deployment noindex config; no catalog DB required | Production sitemap/preview exclusions preserved |
| /icon.svg, /brand/*, /mock-products/* | Static assets | No DB | Existing brand SVG/PNG assets unchanged |

Shared shell: root layout supplies RTL/lang, Tajawal/El Messiri via next/font, metadata and CSS. Storefront layout keeps CartProvider → WishlistProvider → QuickViewProvider around Header/main/Footer/MobileBottomNav. Quick view is already loaded on demand, and hero carousel is split with an SSR-visible fallback. root error and storefront not-found remain; new segment loading boundaries were tested and removed to preserve HTTP 404 status before streaming. No whole-app client conversion, animation redesign or artificial wait was added.

For each non-benchmarked row, actual DB duration/request count/image transfer/route JS = **not measured**. Current source and render output were inspected; signed-in mobile editor workflows and cross-browser acceptance remain unverified.
