# Category artwork

Bundled Pexels photographs selected on 2026-10-28. Source license: https://www.pexels.com/license/ . The first seven are existing store category presets. New imagery illustrates categories, not inventory or availability.

| Asset | Pexels photo |
| --- | --- |
| accessories.avif | https://www.pexels.com/photo/28973056/ |
| perfumes.avif | https://www.pexels.com/photo/31823739/ |
| clothes.avif | https://www.pexels.com/photo/33482420/ |
| shoes.avif | https://www.pexels.com/photo/1445696/ |
| underwear.avif | https://www.pexels.com/photo/7235669/ |
| makeup.avif | https://www.pexels.com/photo/7256102/ |
| bags.avif | https://www.pexels.com/photo/22434765/ |
| watches.avif | https://www.pexels.com/photo/14808296/ |
| skin-care.avif | https://www.pexels.com/photo/4857811/ |
| dresses.avif | https://www.pexels.com/photo/35538618/ |
| jewellery.avif | https://www.pexels.com/photo/10581732/ |
| tops.avif | https://www.pexels.com/photo/11674381/ |
| sunglasses.avif | https://www.pexels.com/photo/10388460/ |

`src/lib/category-images.ts` maps all 18 existing category slugs. Custom administrator images take precedence; bundled photos replace empty/legacy SVG presets and recover broken custom images through CatalogImage. Unknown categories use the accessories photograph. No database rewrite, products, orders, or uploads are created.
