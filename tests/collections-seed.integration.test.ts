import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('curated collection seed uses imported products and preserves subsequent admin changes', { timeout: 90000 }, async () => {
  const db = new PGlite();
  try {
    await db.exec(execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' }));
    const seed = readFileSync('scripts/sql/ishtar-collections-from-products-100.sql', 'utf8');
    await assert.rejects(db.exec(seed), /لم نجد منتجات/);
    await db.exec(readFileSync('scripts/sql/ishtar-test-products-100.sql', 'utf8'));
    await db.exec(readFileSync('prisma/additive/collections.sql', 'utf8'));
    const snapshot = async (table: string) => (await db.query(`SELECT * FROM "${table}" ORDER BY id`)).rows;
    const before = await Promise.all(['Product', 'ProductVariant', 'ProductImage', 'InventoryLog'].map(snapshot));
    await db.exec(`INSERT INTO "Collection" (id,name,slug,"updatedAt") VALUES ('manual','مجموعة يدوية','elegance',NOW());`);
    await assert.rejects(db.exec(seed), /مستخدم لمجموعة أخرى/);
    assert.equal((await db.query('SELECT * FROM "Collection"')).rows.length, 1);
    await db.exec(`UPDATE "Collection" SET slug='manual-group' WHERE id='manual';`);
    await db.exec(seed);
    const counts = (await db.query<{ slug: string; count: number }>(`SELECT c.slug, COUNT(cp."productId")::integer AS count FROM "Collection" c JOIN "CollectionProduct" cp ON cp."collectionId"=c.id GROUP BY c.id ORDER BY c."sortOrder"`)).rows;
    assert.deepEqual(counts.map(row => row.count), [40, 34, 39, 39, 6, 36]);
    assert.equal((await db.query(`SELECT DISTINCT "productId" FROM "CollectionProduct"`)).rows.length, 100);
    assert.equal((await db.query(`SELECT id FROM "Collection" WHERE "showOnHome"`)).rows.length, 3);
    const firstLinks = (await db.query(`SELECT * FROM "CollectionProduct" ORDER BY "collectionId", "sortOrder"`)).rows;
    await db.exec(seed);
    assert.deepEqual((await db.query(`SELECT * FROM "CollectionProduct" ORDER BY "collectionId", "sortOrder"`)).rows, firstLinks);
    await db.exec(`UPDATE "Collection" SET name='اختيار الأدمن', slug='my-edited-elegance', "isActive"=false, "sortOrder"=99 WHERE id='ishtar-curated-elegance';
      DELETE FROM "CollectionProduct" WHERE "collectionId"='ishtar-curated-elegance' AND "productId"=(SELECT "productId" FROM "CollectionProduct" WHERE "collectionId"='ishtar-curated-elegance' LIMIT 1);
      UPDATE "CollectionProduct" SET "sortOrder"=900 WHERE "collectionId"='ishtar-curated-body-care';`);
    const editedGroups = await snapshot('Collection');
    const editedLinks = (await db.query(`SELECT * FROM "CollectionProduct" ORDER BY "collectionId", "productId"`)).rows;
    await db.exec(seed);
    assert.deepEqual(await snapshot('Collection'), editedGroups);
    assert.deepEqual((await db.query(`SELECT * FROM "CollectionProduct" ORDER BY "collectionId", "productId"`)).rows, editedLinks);
    assert.deepEqual(await Promise.all(['Product', 'ProductVariant', 'ProductImage', 'InventoryLog'].map(snapshot)), before);
    assert.equal((await db.query('SELECT * FROM "Order"')).rows.length, 0);
  } finally { await db.close(); }
});
