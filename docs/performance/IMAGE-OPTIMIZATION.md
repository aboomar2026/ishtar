# Image pipeline

Authenticated admin multipart upload → server Cloudinary signed upload → secure_url/public_id saved to ProductImage/banner/collection reference → server mapper → image component → direct Cloudinary transformed CDN URL → browser. Upload validation, 5MB limit, allowed raster types, unique asset creation (overwrite:false), and explicit authenticated deletion/invalidation are unchanged. No production assets were created/replaced/deleted during this task. Live provider upload/replacement/deletion is **not verified**.

| View | Previous | Current | Loading/layout |
|---|---|---|---|
| Hero/banner | Existing HeroImage responsive 480/800/1200; thumbnail rail 96/192/320 | Preserved | Existing first true main hero high/eager, extras lazy; CSS layout unchanged |
| Product card + decorative backdrop | Fixed 800×1000 | Same fit crop/appearance, candidates 320×400, 480×600, 800×1000; same sizes/source for foreground/backdrop | Both lazy; 42vw mobile, 33vw tablet, 20vw desktop; existing absolute/CSS frames |
| Main gallery | Fixed 1000×1250; no priority | Candidates 480×600, 800×1000, 1000×1250 | One active large image eager/high; existing CSS 4:5 area; not all full gallery images mounted |
| Gallery thumbs / zoom | 200×250 thumbs eager by default; zoom on demand | Same bounded thumb transform, lazy/async; on-demand zoom preserved | No crop/gravity regression; existing square thumb frame preserved |
| Collection cover/collage | Fixed 600×600 | Candidates 320/480/600 square with appropriate sizes | Lazy/async and shared fallback; collage category ordering unchanged |
| Category showcase | Stored original | Bounded 480×600 fit | Below-fold lazy/async; existing CSS frame |
| Search suggestions | Existing 96×96 fit | Preserved | Already bounded |
| Cart / checkout / track-order | Stored original | Stable 200×250 fit | Lazy/async; existing CSS dimensions/alt preserved |
| Admin inventory/products/order detail/collection picker | Stored original thumbnail | Same 200×250 fit | Lazy/async; full-resolution product editors and printable views left intact |
| Logos/brand graphics | SVG/PNG identity assets | Preserved | No identity or icon rewrite |

getCloudinaryResponsiveSource centralizes finite candidates; only HTTPS res.cloudinary.com/image/upload sources get transforms/srcset. f_auto,q_auto remain; fit/limit omit gravity and fill retains it. Version/public ID remain in the URL. Non-Cloudinary/local sources remain unchanged and do not receive a bogus multi-candidate srcset. CatalogImage removes srcset/sizes on error and uses a stable local SVG; a changed source may recover. Tests cover this and the earlier HTTP-400-generating fit/limit + gravity combination.

Direct delivery is retained; no extra Next image optimization hop or new paid service. Existing hero/thumbnail variants are reused where possible; responsive variants add a bounded number of Cloudinary derived assets, so transformation credits can increase initially. Smaller requested dimensions are NOT a measured byte/quality saving: original dimensions/bytes, actual currentSrc at each breakpoint/DPR, CDN headers/hit rates and image transfer have **not been measured**. Non-Cloudinary originals still need a separate policy. No changes to Cloudinary account settings or stored production URLs.
