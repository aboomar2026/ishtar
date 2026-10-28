# Cache and freshness policy

| Data | Key/scope | Lifetime | Invalidation / privacy |
|---|---|---|---|
| Public hero presentation settings | unstable_cache public-hero-settings-v1; tag public-hero-settings | 300s revalidation | Successful authorized saveHeroSettingsAction calls updateTag, then existing path revalidation. Tested via real production HTTP action. Admin editor uses uncached getHeroSettings. |
| Product details + metadata | React cache by slug | One render/request | No cross-request product cache introduced; edits, visibility, price/images/variants re-read next request |
| Category results + metadata | getCategoryPage(slug, serialized params) React cache | One request | Filters in key; no shared stock/price cache |
| Collection summary + metadata | React cache by slug | One request | Count, visibility, cover from same request; requested members loaded once separately |
| Collection migration readiness | React cache | One request | Preserves safe missing-table fallback |
| Admin session | React cache, request context/cookies | One request | Layout and page share current-DB role/active check; anonymous, changed role and revoked account tested on following requests. Never unstable_cache. |
| Home products/categories/banners, recommendations, collections/search, sitemap | Fresh server queries | Every request | Existing action path invalidation retained; no new persistent cache needing broad mutation hooks |
| Saved-products/quick view/suggestions | Bounded fresh API reads | no-store | No IDs/customer state persisted in shared cache |
| Cart/checkout | Browser ID/cart state + live server availability | Existing focus/ID revalidation; authoritative final transaction | Browser price/stock cannot authorize an order |
| Orders/admin/notifications/session tokens | Fresh/private | Existing no-store/dynamic handling | Never publicly cached |
| Cloudinary assets | Stable versioned source + finite transforms | CDN-controlled; headers not verified | Uploads use overwrite:false; replacement changes reference. Fallback removes failed srcset. No custom long-lived caching of private routes. |

force-dynamic remains on public catalog pages intentionally: product status/category, variants, prices and stock are still fresh. A wholesale ISR conversion was skipped because live stock freshness and every product/category/order mutation would need adapter-level invalidation acceptance. The only new persistent cache excludes all purchase and personal data. Manual SQL edits to hero settings bypass application invalidation; use the admin save path or wait for revalidation. A full product cache remains a possible later optimization, not an implemented claim.

Product/category/inventory/order/collection mutation invalidations are preserved. Their existing path breadth was not narrowed blindly. Product SEO and sitemap read fresh data, so hidden/deleted products cannot be resurrected by a new persistent catalog cache. Long-lived sessions in already rendered browser UI still need a fresh request; checkout/authorization recheck on the server.
