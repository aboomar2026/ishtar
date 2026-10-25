-- Create curated collections from the existing 100-product import.
-- Run this WHOLE file once in Supabase SQL Editor after prisma/additive/collections.sql.
-- Re-running preserves admin edits, hidden state, membership removals and product ordering.
-- No product names, images, prices, stock, orders or Telegram settings are modified.
DO $ishtar_collections$
BEGIN
  SET LOCAL lock_timeout = '10s';
  SET LOCAL statement_timeout = '60s';
  IF to_regclass('public."Collection"') IS NULL OR to_regclass('public."CollectionProduct"') IS NULL THEN
    RAISE EXCEPTION 'طبّقي ملف collections.sql لإنشاء الجداول أولاً.';
  END IF;
  -- Serializes two concurrent executions of this seed only.
  PERFORM pg_advisory_xact_lock(20261025, 601);
  CREATE TEMP TABLE ishtar_collection_input ON COMMIT DROP AS
  SELECT * FROM jsonb_to_recordset('[{"id": "ishtar-curated-elegance", "slug": "elegance", "name": "أناقة يومية", "description": "حقائب وساعات ونظارات وقطع يومية لتنسيق إطلالة تعبّر عنكِ.", "symbol": "bag", "tone": "sand", "home": true, "keywords": ["أناقة", "يومي", "إطلالة"], "sort": 0, "productIds": ["ishtar-qa-product-014", "ishtar-qa-product-015", "ishtar-qa-product-016", "ishtar-qa-product-017", "ishtar-qa-product-018", "ishtar-qa-product-019", "ishtar-qa-product-020", "ishtar-qa-product-021", "ishtar-qa-product-022", "ishtar-qa-product-023", "ishtar-qa-product-024", "ishtar-qa-product-025", "ishtar-qa-product-026", "ishtar-qa-product-027", "ishtar-qa-product-028", "ishtar-qa-product-042", "ishtar-qa-product-043", "ishtar-qa-product-044", "ishtar-qa-product-045", "ishtar-qa-product-046", "ishtar-qa-product-060", "ishtar-qa-product-061", "ishtar-qa-product-062", "ishtar-qa-product-063", "ishtar-qa-product-064", "ishtar-qa-product-065", "ishtar-qa-product-066", "ishtar-qa-product-067", "ishtar-qa-product-068", "ishtar-qa-product-069", "ishtar-qa-product-070", "ishtar-qa-product-071", "ishtar-qa-product-072", "ishtar-qa-product-073", "ishtar-qa-product-074", "ishtar-qa-product-088", "ishtar-qa-product-089", "ishtar-qa-product-090", "ishtar-qa-product-091", "ishtar-qa-product-092"]}, {"id": "ishtar-curated-beauty-touch", "slug": "beauty-touch", "name": "لمسة جمال", "description": "مكياج وإكسسوارات وعطور تضيف تفاصيلك الخاصة إلى الإطلالة.", "symbol": "sparkle", "tone": "rose", "home": true, "keywords": ["جمال", "لمسة", "مكياج"], "sort": 1, "productIds": ["ishtar-qa-product-001", "ishtar-qa-product-002", "ishtar-qa-product-003", "ishtar-qa-product-004", "ishtar-qa-product-005", "ishtar-qa-product-006", "ishtar-qa-product-007", "ishtar-qa-product-008", "ishtar-qa-product-009", "ishtar-qa-product-010", "ishtar-qa-product-034", "ishtar-qa-product-035", "ishtar-qa-product-036", "ishtar-qa-product-047", "ishtar-qa-product-048", "ishtar-qa-product-049", "ishtar-qa-product-050", "ishtar-qa-product-051", "ishtar-qa-product-052", "ishtar-qa-product-053", "ishtar-qa-product-054", "ishtar-qa-product-055", "ishtar-qa-product-056", "ishtar-qa-product-080", "ishtar-qa-product-081", "ishtar-qa-product-082", "ishtar-qa-product-093", "ishtar-qa-product-094", "ishtar-qa-product-095", "ishtar-qa-product-096", "ishtar-qa-product-097", "ishtar-qa-product-098", "ishtar-qa-product-099", "ishtar-qa-product-100"]}, {"id": "ishtar-curated-gifts-with-love", "slug": "gifts-with-love", "name": "هدية بمحبة", "description": "عطور وساعات وإكسسوارات وحقائب لتختاري هدية على ذوق من تحبّين.", "symbol": "gift", "tone": "rose", "home": true, "keywords": ["هدية", "هدايا", "حب", "محبة"], "sort": 2, "productIds": ["ishtar-qa-product-006", "ishtar-qa-product-007", "ishtar-qa-product-008", "ishtar-qa-product-009", "ishtar-qa-product-010", "ishtar-qa-product-024", "ishtar-qa-product-025", "ishtar-qa-product-026", "ishtar-qa-product-027", "ishtar-qa-product-028", "ishtar-qa-product-034", "ishtar-qa-product-035", "ishtar-qa-product-036", "ishtar-qa-product-042", "ishtar-qa-product-043", "ishtar-qa-product-044", "ishtar-qa-product-045", "ishtar-qa-product-046", "ishtar-qa-product-052", "ishtar-qa-product-053", "ishtar-qa-product-054", "ishtar-qa-product-055", "ishtar-qa-product-056", "ishtar-qa-product-070", "ishtar-qa-product-071", "ishtar-qa-product-072", "ishtar-qa-product-073", "ishtar-qa-product-074", "ishtar-qa-product-080", "ishtar-qa-product-081", "ishtar-qa-product-082", "ishtar-qa-product-088", "ishtar-qa-product-089", "ishtar-qa-product-090", "ishtar-qa-product-091", "ishtar-qa-product-092", "ishtar-qa-product-098", "ishtar-qa-product-099", "ishtar-qa-product-100"]}, {"id": "ishtar-curated-for-the-bride", "slug": "for-the-bride", "name": "للعروسة", "description": "اختيارات من الفساتين والأحذية والإكسسوارات والعطور لتنسيق مناسباتك.", "symbol": "heart", "tone": "sand", "home": false, "keywords": ["عروسة", "عروس", "زفاف", "مناسبة"], "sort": 3, "productIds": ["ishtar-qa-product-006", "ishtar-qa-product-007", "ishtar-qa-product-008", "ishtar-qa-product-009", "ishtar-qa-product-010", "ishtar-qa-product-029", "ishtar-qa-product-030", "ishtar-qa-product-031", "ishtar-qa-product-032", "ishtar-qa-product-033", "ishtar-qa-product-034", "ishtar-qa-product-035", "ishtar-qa-product-036", "ishtar-qa-product-037", "ishtar-qa-product-038", "ishtar-qa-product-039", "ishtar-qa-product-040", "ishtar-qa-product-041", "ishtar-qa-product-052", "ishtar-qa-product-053", "ishtar-qa-product-054", "ishtar-qa-product-055", "ishtar-qa-product-056", "ishtar-qa-product-075", "ishtar-qa-product-076", "ishtar-qa-product-077", "ishtar-qa-product-078", "ishtar-qa-product-079", "ishtar-qa-product-080", "ishtar-qa-product-081", "ishtar-qa-product-082", "ishtar-qa-product-083", "ishtar-qa-product-084", "ishtar-qa-product-085", "ishtar-qa-product-086", "ishtar-qa-product-087", "ishtar-qa-product-098", "ishtar-qa-product-099", "ishtar-qa-product-100"]}, {"id": "ishtar-curated-body-care", "slug": "body-care", "name": "العناية بالجسم", "description": "غسول ولوشن وصابون لاختيار ما يناسب روتين العناية اليومي.", "symbol": "flower", "tone": "sage", "home": false, "keywords": ["عناية", "جسم", "لوشن", "صابون"], "sort": 4, "productIds": ["ishtar-qa-product-011", "ishtar-qa-product-012", "ishtar-qa-product-013", "ishtar-qa-product-057", "ishtar-qa-product-058", "ishtar-qa-product-059"]}, {"id": "ishtar-curated-evening-edit", "slug": "evening-edit", "name": "إطلالة سهرة", "description": "فساتين وأحذية وحقائب وإكسسوارات تتناغم مع مناسباتك المسائية.", "symbol": "sparkle", "tone": "rose", "home": false, "keywords": ["سهرة", "حفلة", "مناسبات"], "sort": 5, "productIds": ["ishtar-qa-product-024", "ishtar-qa-product-025", "ishtar-qa-product-026", "ishtar-qa-product-027", "ishtar-qa-product-028", "ishtar-qa-product-029", "ishtar-qa-product-030", "ishtar-qa-product-031", "ishtar-qa-product-032", "ishtar-qa-product-033", "ishtar-qa-product-034", "ishtar-qa-product-035", "ishtar-qa-product-036", "ishtar-qa-product-037", "ishtar-qa-product-038", "ishtar-qa-product-039", "ishtar-qa-product-040", "ishtar-qa-product-041", "ishtar-qa-product-070", "ishtar-qa-product-071", "ishtar-qa-product-072", "ishtar-qa-product-073", "ishtar-qa-product-074", "ishtar-qa-product-075", "ishtar-qa-product-076", "ishtar-qa-product-077", "ishtar-qa-product-078", "ishtar-qa-product-079", "ishtar-qa-product-080", "ishtar-qa-product-081", "ishtar-qa-product-082", "ishtar-qa-product-083", "ishtar-qa-product-084", "ishtar-qa-product-085", "ishtar-qa-product-086", "ishtar-qa-product-087"]}]'::jsonb)
    AS x(id text, slug text, name text, description text, symbol text, tone text,
         home boolean, keywords text[], sort integer, "productIds" text[]);

  IF NOT EXISTS (SELECT 1 FROM ishtar_collection_input x JOIN "Product" p ON p.id = ANY(x."productIds")) THEN
    RAISE EXCEPTION 'لم نجد منتجات الاستيراد المئة. تأكدي من المشروع ومن تنفيذ استيراد المنتجات.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM ishtar_collection_input x JOIN "Collection" c
    ON c.slug = x.slug AND c.id <> x.id
    WHERE NOT EXISTS (SELECT 1 FROM "Collection" owned WHERE owned.id = x.id)
  ) THEN
    RAISE EXCEPTION 'اسم رابط إحدى المجموعات مستخدم لمجموعة أخرى. توقّف الأمر بدون تعديل البيانات.';
  END IF;

  CREATE TEMP TABLE ishtar_collection_created ON COMMIT DROP AS
  WITH created AS (
    INSERT INTO "Collection" (id, name, slug, description, symbol, tone, keywords,
                              "isActive", "showOnHome", "sortOrder", "updatedAt")
    SELECT x.id, x.name, x.slug, x.description, x.symbol, x.tone, x.keywords,
           true, x.home, x.sort, NOW()
    FROM ishtar_collection_input x
    WHERE EXISTS (SELECT 1 FROM "Product" p JOIN "Category" cat ON cat.id = p."categoryId"
                  WHERE p.id = ANY(x."productIds") AND p.status = 'ACTIVE' AND cat."isActive")
    ON CONFLICT DO NOTHING RETURNING id
  ) SELECT id FROM created;

  INSERT INTO "CollectionProduct" ("collectionId", "productId", "sortOrder")
  SELECT x.id, p.id, (member.position - 1)::integer
  FROM ishtar_collection_input x
  JOIN ishtar_collection_created created ON created.id = x.id
  CROSS JOIN LATERAL unnest(x."productIds") WITH ORDINALITY AS member(id, position)
  JOIN "Product" p ON p.id = member.id
  ON CONFLICT ("collectionId", "productId") DO NOTHING;

  RAISE NOTICE 'تم إنشاء % مجموعات جديدة. المجموعات الموجودة وتعديلات الأدمن محفوظة.',
    (SELECT COUNT(*) FROM ishtar_collection_created);
END;
$ishtar_collections$;

-- Report: the public shop displays published products in active categories only.
SELECT c.name AS "المجموعة", c."isActive" AS "منشورة", c."showOnHome" AS "الرئيسية",
       COUNT(cp."productId")::integer AS "المنتجات المرتبطة",
       COUNT(cp."productId") FILTER (WHERE p.status = 'ACTIVE' AND cat."isActive")::integer AS "المنتجات الظاهرة"
FROM "Collection" c
LEFT JOIN "CollectionProduct" cp ON cp."collectionId" = c.id
LEFT JOIN "Product" p ON p.id = cp."productId"
LEFT JOIN "Category" cat ON cat.id = p."categoryId"
WHERE c.id IN ('ishtar-curated-elegance', 'ishtar-curated-beauty-touch', 'ishtar-curated-gifts-with-love',
               'ishtar-curated-for-the-bride', 'ishtar-curated-body-care', 'ishtar-curated-evening-edit')
GROUP BY c.id ORDER BY c."sortOrder", c.id;
