/** Development fixture generator. Provenance stays in comments, never storefront fields. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Source = { sourceId: number; title: string; nameAr: string; category: string; categoryName: string; images: string[] };
const sources: Source[] = JSON.parse(readFileSync(resolve('scripts/fixtures/test-products.json'), 'utf8'));
const count = Number(process.argv[2] ?? 100);
if (!Number.isInteger(count) || count < 1 || count > 200) throw new Error('Choose 1–200 products.');
const quote = (value: unknown) => `'${String(value).replaceAll("'", "''")}'`;
const copy: Record<string, { subtitle: string; description: string; categoryDescription: string }> = {
  beauty: { subtitle: 'لمسات تكمل إطلالتك', description: 'أضيفي لمستك الخاصة إلى إطلالتك مع هذا الاختيار ضمن مجموعة المكياج. اكتشفي تفاصيل المنتج في الصور واختاري ما يناسب روتينك.', categoryDescription: 'اختيارات من مكياج العيون والشفاه والوجه والأظافر لإطلالات متنوعة.' },
  fragrances: { subtitle: 'عطر يرافق لحظاتك', description: 'اختيار عطري يضيف لمسة خاصة إلى حضورك، ضمن تشكيلة تجمع أسماء متنوعة من عالم العطور. تصفحي صور العبوة وتفاصيلها.', categoryDescription: 'تشكيلة عطور تختارين منها ما يناسب ذوقك ومناسباتك.' },
  'skin-care': { subtitle: 'تفاصيل صغيرة للعناية اليومية', description: 'أكملي روتين العناية اليومي باختيار يناسب احتياجاتك. راجعي تعليمات الاستخدام والمكونات الموضحة على العبوة.', categoryDescription: 'منتجات للعناية بالوجه والجسم واليدين ضمن روتينك اليومي.' },
  sunglasses: { subtitle: 'إطار يبرز شخصيتك', description: 'أضيفي إلى إطلالتك نظارة بتصميم يسهل تنسيقه مع ملابسك وإكسسواراتك. الصور تعرض شكل الإطار وتفاصيله من زوايا مختلفة.', categoryDescription: 'نظارات بتصاميم وألوان متنوعة لتنسيق إطلالتك.' },
  tops: { subtitle: 'اختيارات لإطلالة يومية متجددة', description: 'قطعة تمنحك خيارات متنوعة للتنسيق مع حقيبتك وحذائك المفضلين. تصفحي الصور للتعرف إلى القصة واللون والتفاصيل.', categoryDescription: 'تشكيلة ملابس وفساتين يومية بتصاميم متنوعة.' },
  'womens-bags': { subtitle: 'رفيقة تفاصيل يومك', description: 'حقيبة تضيف لمسة مكملة لإطلالتك وتنسجم مع اختياراتك اليومية. شاهدي الصور للتعرف إلى شكلها وتفاصيل تصميمها.', categoryDescription: 'حقائب يد وحقائب ظهر لتنسيقات يومية ومناسبات مختلفة.' },
  'womens-dresses': { subtitle: 'تفاصيل تليق بمناسبتك', description: 'اختيار لإطلالة مميزة يمكنك تنسيقها مع إكسسوارات بسيطة أو قطع بارزة. تعرض الصور القصة والتفاصيل لمساعدتك في الاختيار.', categoryDescription: 'فساتين وأطقم لإطلالات متنوعة في المناسبات والخروجات.' },
  'womens-jewellery': { subtitle: 'لمسة أخيرة تلفت النظر', description: 'أقراط تضيف تفصيلاً مميزاً إلى إطلالتك، سواء اخترت تنسيقها مع قطع أخرى أو ارتداءها وحدها. شاهدي تفاصيل التصميم في الصور.', categoryDescription: 'أقراط وإكسسوارات تكمل إطلالتك بتفاصيل متنوعة.' },
  'womens-shoes': { subtitle: 'خطوة تكمل إطلالتك', description: 'نسّقي حذاءك مع ملابسك وحقيبتك لإطلالة متكاملة. تصفحي الصور للتعرف إلى التصميم واللون والتفاصيل.', categoryDescription: 'أحذية وصنادل نسائية لتنسيقات يومية ومناسبات مختلفة.' },
  'womens-watches': { subtitle: 'تفصيل أنيق على معصمك', description: 'ساعة تضيف لمسة مميزة إلى إطلالتك وتتكامل مع إكسسواراتك المفضلة. تعرفي إلى شكل الميناء والسوار من خلال الصور.', categoryDescription: 'ساعات نسائية بتصاميم متنوعة لإكمال إطلالتك.' },
};
const collections = ['لمسة', 'أناقة', 'رونق', 'إشراقة', 'جاذبية'];
const rows = Array.from({ length: count }, (_, index) => {
  const source = sources[index % sources.length];
  const number = String(index + 1).padStart(3, '0');
  const edition = Math.floor(index / sources.length);
  const collection = collections[edition];
  const text = copy[source.category];
  const price = 15 + (index * 7) % 180;
  const name = source.nameAr;
  return { id: `ishtar-qa-product-${number}`, legacySlug: `ishtar-qa-${number}`,
    slug: `ishtar-${source.category}-${source.sourceId}-${edition + 1}`, sku: `ISH-${1000 + index + 1}`,
    name, category: source.category, categoryName: source.categoryName,
    categorySlug: `collection-${source.category}`, categoryDescription: text.categoryDescription,
    subtitle: text.subtitle, description: `${source.nameAr}. ${text.description}`,
    details: [`التصنيف: ${source.categoryName}`],
    oldGroupName: `${source.nameAr} — مجموعة ${collection}`,
    oldPublicDetails: [`المجموعة: ${collection}`, `التصنيف: ${source.categoryName}`],
    price, compareAt: index % 4 === 0 ? price + 20 : null,
    stock: index % 20 === 0 ? 0 : index % 10 === 0 ? 3 : 50,
    featured: index % 7 === 0, newArrival: index % 3 === 0,
    images: source.images,
    // Exact legacy strings let the repair preserve content manually edited by an admin.
    oldName: `${source.categoryName} — ${source.title} — اختبار ${number}`,
    oldDescription: `منتج تجريبي لاختبار المتجر فقط، غير مخصص للبيع الفعلي. ${source.title}. نسخة اختبار ${edition + 1}. الصور قد تتكرر بين النسخ.`,
    oldDetails: { source: 'DummyJSON', sourceId: source.sourceId, testOnly: true },
  };
});
const input = `CREATE TEMP TABLE ishtar_qa_input ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset(${quote(JSON.stringify(rows))}::jsonb)
AS x(id text, "legacySlug" text, slug text, sku text, name text, category text, "categoryName" text,
     "categorySlug" text, "categoryDescription" text, subtitle text, description text, details jsonb,
     price numeric, "compareAt" numeric, stock integer, featured boolean, "newArrival" boolean,
     images jsonb, "oldName" text, "oldDescription" text, "oldDetails" jsonb, "oldGroupName" text, "oldPublicDetails" jsonb);`;
const repair = `-- Repair only exact legacy copy. Preserve prices, stock, orders, images and manual copy edits.
UPDATE "Category" c SET
  name = CASE WHEN c.name = 'اختبار — ' || x."categoryName" THEN x."categoryName" ELSE c.name END,
  description = CASE WHEN c.description = 'قسم منتجات تجريبية، غير مخصص للبيع الفعلي' THEN x."categoryDescription" ELSE c.description END,
  slug = CASE WHEN c.slug = 'ishtar-qa-' || x.category
    AND NOT EXISTS (SELECT 1 FROM "Category" other WHERE other.slug = x."categorySlug" AND other.id <> c.id)
    THEN x."categorySlug" ELSE c.slug END,
  "updatedAt" = NOW()
FROM (SELECT DISTINCT category, "categoryName", "categorySlug", "categoryDescription" FROM ishtar_qa_input) x
WHERE c.id = 'ishtar-qa-category-' || x.category;

UPDATE "Product" p SET
  name = CASE WHEN p.name IN (x."oldName", x."oldGroupName") THEN x.name ELSE p.name END,
  subtitle = CASE WHEN p.subtitle = 'بيانات اختبار فقط' THEN x.subtitle ELSE p.subtitle END,
  description = CASE WHEN p.description = x."oldDescription" THEN x.description ELSE p.description END,
  details = CASE WHEN p.details IN (x."oldDetails", x."oldPublicDetails") THEN x.details ELSE p.details END,
  tags = CASE WHEN p.tags = ARRAY['ishtar-test-data','dummyjson'] THEN ARRAY[x."categoryName"] ELSE p.tags END,
  slug = CASE WHEN p.slug = x."legacySlug"
    AND NOT EXISTS (SELECT 1 FROM "Product" other WHERE other.slug = x.slug AND other.id <> p.id)
    THEN x.slug ELSE p.slug END,
  "updatedAt" = NOW()
FROM ishtar_qa_input x WHERE p.id = x.id;

UPDATE "ProductVariant" v SET sku = x.sku, "updatedAt" = NOW()
FROM ishtar_qa_input x WHERE v.id = x.id || '-variant' AND v."productId" = x.id
  AND v.sku = 'ISHTAR-QA-' || x."legacySlug"
  AND NOT EXISTS (SELECT 1 FROM "ProductVariant" other WHERE other.sku = x.sku AND other.id <> v.id);

UPDATE "ProductImage" img SET alt = x.name, "updatedAt" = NOW()
FROM ishtar_qa_input x WHERE img."productId" = x.id AND img.alt IN (x."oldName", x."oldGroupName");`;
const header = `-- ISHTAR development fixture: ${count} listings using ${sources.length} source products.
-- Provenance: https://dummyjson.com/docs/products (2026-10-24). Some photos repeat.
-- Prices are synthetic store-currency amounts. These notes never appear in storefront content.
-- Legacy generated copy is repaired in place; manual edits, prices and stock are preserved.
DO $ishtar_catalog$
DECLARE added_count integer;
BEGIN
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
${input}
${repair}`;
const sql = `${header}
INSERT INTO "Category" (id, name, slug, description, "sortOrder", "isActive", "updatedAt")
SELECT 'ishtar-qa-category-' || category, MIN("categoryName"), MIN("categorySlug"), MIN("categoryDescription"), 1000, true, NOW()
FROM ishtar_qa_input x
WHERE NOT EXISTS (SELECT 1 FROM "Category" c WHERE c.id = 'ishtar-qa-category-' || x.category)
GROUP BY category ON CONFLICT (slug) DO NOTHING;

CREATE TEMP TABLE ishtar_qa_created ON COMMIT DROP AS
WITH inserted AS (
  INSERT INTO "Product" (id, "categoryId", name, slug, subtitle, description, "basePrice", "compareAtPrice",
                         status, "isFeatured", "isNewArrival", tags, details, "updatedAt")
  SELECT x.id, c.id, x.name, x.slug, x.subtitle, x.description, x.price, x."compareAt",
         'ACTIVE', x.featured, x."newArrival", ARRAY[x."categoryName"], x.details, NOW()
  FROM ishtar_qa_input x
  JOIN "Category" c ON c.id = COALESCE(
    (SELECT id FROM "Category" WHERE id = 'ishtar-qa-category-' || x.category),
    (SELECT id FROM "Category" WHERE slug = x."categorySlug"))
  WHERE NOT EXISTS (SELECT 1 FROM "Product" p WHERE p.id = x.id)
  ON CONFLICT (slug) DO NOTHING RETURNING id
) SELECT id FROM inserted;

INSERT INTO "ProductVariant" (id, "productId", sku, price, "compareAtPrice", quantity, "updatedAt")
SELECT x.id || '-variant', x.id, x.sku, x.price, x."compareAt", x.stock, NOW()
FROM ishtar_qa_input x JOIN ishtar_qa_created n ON n.id = x.id;

INSERT INTO "ProductImage" (id, "productId", url, alt, "sortOrder", "isPrimary", "updatedAt")
SELECT x.id || '-image-' || img.ordinality, x.id, img.url, x.name,
       (img.ordinality - 1)::integer, img.ordinality = 1, NOW()
FROM ishtar_qa_input x JOIN ishtar_qa_created n ON n.id = x.id
CROSS JOIN LATERAL jsonb_array_elements_text(x.images) WITH ORDINALITY AS img(url, ordinality);

INSERT INTO "InventoryLog" (id, "productId", "variantId", type, "quantityChange", note)
SELECT x.id || '-opening-stock', x.id, x.id || '-variant', 'RESTOCK', x.stock,
       'Opening stock; development fixture sourced from DummyJSON'
FROM ishtar_qa_input x JOIN ishtar_qa_created n ON n.id = x.id WHERE x.stock > 0;

SELECT COUNT(*) INTO added_count FROM ishtar_qa_created;
RAISE NOTICE 'Products added: %', added_count;
END;
$ishtar_catalog$;
`;
mkdirSync(resolve('scripts/sql'), { recursive: true });
writeFileSync(resolve(`scripts/sql/ishtar-test-products-${count}.sql`), sql);
writeFileSync(resolve(`scripts/sql/ishtar-product-content-repair-${count}.sql`), `${header}\nEND;\n$ishtar_catalog$;\n`);
console.log(`Generated ${count}-product import and content-only repair SQL. Storefront fields use natural catalog copy.`);
