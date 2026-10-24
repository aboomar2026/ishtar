import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('product SQL preserves existing data and is safe to rerun', { timeout: 90000 }, async () => {
  const db = new PGlite();
  try {
    await db.exec(execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' }));
    await db.exec(`INSERT INTO "Category" (id,name,slug,"updatedAt") VALUES ('existing-cat','Existing','existing',NOW());
      INSERT INTO "Product" (id,"categoryId",name,slug,description,"basePrice","updatedAt") VALUES ('existing','existing-cat','Untouched','existing','Keep',25,NOW());
      INSERT INTO "ProductVariant" (id,"productId",sku,price,quantity,"updatedAt") VALUES ('existing-v','existing','KEEP',25,17,NOW());`);
    const before = await db.query('SELECT * FROM "Product" WHERE id=\'existing\'');
    const sql = readFileSync('scripts/sql/ishtar-test-products-100.sql', 'utf8');
    await db.query(sql);
    const count = async (table: string) => (await db.query<{ count: number }>(`SELECT COUNT(*)::integer AS count FROM "${table}"`)).rows[0].count;
    assert.equal(await count('Product'), 101);
    assert.equal(await count('ProductVariant'), 101);
    const publicCopy = await db.query(`SELECT p.name, p.subtitle, p.description, p.details, p.tags, p.slug,
      c.name AS category_name, c.description AS category_description, c.slug AS category_slug, v.sku, i.alt
      FROM "Product" p JOIN "Category" c ON c.id=p."categoryId"
      JOIN "ProductVariant" v ON v."productId"=p.id
      JOIN "ProductImage" i ON i."productId"=p.id WHERE p.id LIKE 'ishtar-qa-product-%'`);
    assert.doesNotMatch(JSON.stringify(publicCopy.rows), /اختبار|تجريب|غير مخصص للبيع|\btest\b|dummyjson|testOnly|ishtar-qa|ISHTAR-QA|مجموعة (لمسة|أناقة|رونق|إشراقة|جاذبية)/i);
    const names = await db.query<{ count: number }>('SELECT COUNT(DISTINCT name)::integer AS count FROM "Product"');
    assert.equal(names.rows[0].count, 47);
    assert.ok(await count('ProductImage') >= 100);
    const imageCount = await count('ProductImage');
    const logCount = await count('InventoryLog');
    const badPrimary = await db.query(`SELECT "productId" FROM "ProductImage" GROUP BY "productId" HAVING COUNT(*) FILTER (WHERE "isPrimary") <> 1`);
    assert.equal(badPrimary.rows.length, 0);
    const mismatches = await db.query(`SELECT v.id FROM "ProductVariant" v LEFT JOIN "InventoryLog" l ON l."variantId"=v.id WHERE v.id LIKE 'ishtar-qa-%' GROUP BY v.id HAVING v.quantity <> COALESCE(SUM(l."quantityChange"),0)`);
    assert.equal(mismatches.rows.length, 0);
    assert.deepEqual(await db.query('SELECT * FROM "Product" WHERE id=\'existing\''), before);
    await db.exec(`UPDATE "ProductVariant" SET quantity=7 WHERE id='ishtar-qa-product-002-variant';
      UPDATE "Product" SET name='Manually edited test item' WHERE id='ishtar-qa-product-002';`);
    await db.query(sql);
    assert.equal(await count('Product'), 101);
    assert.equal(await count('ProductImage'), imageCount);
    assert.equal(await count('InventoryLog'), logCount);
    const kept = await db.query<{ quantity: number; name: string }>(`SELECT v.quantity, p.name FROM "ProductVariant" v JOIN "Product" p ON p.id=v."productId" WHERE p.id='ishtar-qa-product-002'`);
    assert.deepEqual(kept.rows[0], { quantity: 7, name: 'Manually edited test item' });

    // Simulate a previous import, including its public metadata and image alt.
    const source = JSON.parse(readFileSync('scripts/fixtures/test-products.json', 'utf8'))[0];
    const oldName = `${source.categoryName} — ${source.title} — اختبار 001`;
    const oldDescription = `منتج تجريبي لاختبار المتجر فقط، غير مخصص للبيع الفعلي. ${source.title}. نسخة اختبار 1. الصور قد تتكرر بين النسخ.`;
    await db.query(`UPDATE "Product" SET name=$1, subtitle='بيانات اختبار فقط', description=$2,
      details=$3::jsonb, tags=ARRAY['ishtar-test-data','dummyjson'], slug='ishtar-qa-001' WHERE id='ishtar-qa-product-001'`,
      [oldName, oldDescription, JSON.stringify({ source: 'DummyJSON', sourceId: source.sourceId, testOnly: true })]);
    await db.query(`UPDATE "ProductImage" SET alt=$1 WHERE "productId"='ishtar-qa-product-001'`, [oldName]);
    await db.exec(`UPDATE "Category" SET name='اختبار — مكياج', description='قسم منتجات تجريبية، غير مخصص للبيع الفعلي', slug='ishtar-qa-beauty' WHERE id='ishtar-qa-category-beauty';
      UPDATE "ProductVariant" SET sku='ISHTAR-QA-ishtar-qa-001' WHERE id='ishtar-qa-product-001-variant';`);
    await db.query(`UPDATE "Product" SET name='بودرة وجه مضغوطة — مجموعة لمسة', details=$1::jsonb
      WHERE id='ishtar-qa-product-003'`, [JSON.stringify(['المجموعة: لمسة', 'التصنيف: مكياج'])]);
    await db.exec(`UPDATE "ProductImage" SET alt='بودرة وجه مضغوطة — مجموعة لمسة' WHERE "productId"='ishtar-qa-product-003';`);
    const repair = readFileSync('scripts/sql/ishtar-product-content-repair-100.sql', 'utf8');
    await db.query(repair);
    await db.query(repair);
    const repaired = await db.query(`SELECT p.name, p.subtitle, p.description, p.details, p.tags, p.slug, c.name AS category_name,
      c.description AS category_description, c.slug AS category_slug, v.sku, i.alt
      FROM "Product" p JOIN "Category" c ON c.id=p."categoryId" JOIN "ProductVariant" v ON v."productId"=p.id
      JOIN "ProductImage" i ON i."productId"=p.id WHERE p.id='ishtar-qa-product-001'`);
    assert.doesNotMatch(JSON.stringify(repaired.rows), /اختبار|تجريب|غير مخصص للبيع|\btest\b|dummyjson|testOnly|ishtar-qa|ISHTAR-QA|مجموعة (لمسة|أناقة|رونق|إشراقة|جاذبية)/i);
    assert.equal(await count('Product'), 101);
    assert.equal(await count('ProductImage'), imageCount);
    assert.equal(await count('InventoryLog'), logCount);
    assert.equal((await db.query<{ name: string }>(`SELECT name FROM "Product" WHERE id='ishtar-qa-product-003'`)).rows[0].name, 'بودرة وجه مضغوطة');
    assert.deepEqual((await db.query<{ details: string[] }>(`SELECT details FROM "Product" WHERE id='ishtar-qa-product-003'`)).rows[0].details, ['التصنيف: مكياج']);
    assert.equal((await db.query<{ alt: string }>(`SELECT alt FROM "ProductImage" WHERE "productId"='ishtar-qa-product-003' LIMIT 1`)).rows[0].alt, 'بودرة وجه مضغوطة');
    assert.deepEqual((await db.query(`SELECT v.quantity, p.name FROM "ProductVariant" v JOIN "Product" p ON p.id=v."productId" WHERE p.id='ishtar-qa-product-002'`)).rows[0], kept.rows[0]);
    assert.deepEqual(await db.query('SELECT * FROM "Product" WHERE id=\'existing\''), before);
  } finally { await db.close(); }
});
