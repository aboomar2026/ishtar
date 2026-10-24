import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

test("collections on isolated PostgreSQL", { timeout: 90000 }, async (t) => {
  const db = new PGlite();
  const schema = execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--script",
    ],
    { encoding: "utf8" },
  );
  await db.exec(schema);
  await db.exec(
    'DROP TABLE "CollectionProduct", "ProductComplement", "Collection";',
  );
  const socket = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 0 });
  await socket.start();
  const address = socket.getServerConn();
  process.env.DATABASE_URL = `${address.startsWith("postgres") ? address : `postgresql://postgres:test@${address}/postgres`}?connection_limit=1&sslmode=disable`;
  const { prisma } = await import("../src/lib/prisma");
  const queries = await import(
    "../src/features/collections/collections.queries"
  );
  const { saveCollection, saveProductGroups } = await import(
    "../src/features/collections/collections.admin"
  );
  const { collectionInput } = await import(
    "../src/features/collections/collections.types"
  );
  const { getProductsByCategorySlug } = await import(
    "../src/features/catalog/catalog.queries"
  );
  t.after(async () => {
    await prisma.$disconnect();
    await socket.stop();
    await db.close();
  });
  await prisma.category.create({
    data: { id: "cat", name: "حقائب", slug: "bags" },
  });
  for (const [id, status, quantity] of [
    ["source", "ACTIVE", 5],
    ["same", "ACTIVE", 5],
    ["manual", "ACTIVE", 0],
    ["stocked", "ACTIVE", 10],
    ["draft", "DRAFT", 5],
  ] as const) {
    await prisma.product.create({
      data: {
        id,
        name: id,
        slug: id,
        categoryId: "cat",
        description: "اختبار",
        status,
        basePrice: 25,
        images: { create: { url: "/mock-products/gift-box.svg" } },
        variants: { create: { sku: id, price: 20, quantity } },
      },
    });
  }
  await t.test(
    "missing migration preserves catalog and returns no new discovery",
    async () => {
      assert.equal(await queries.collectionsReady(), false);
      assert.deepEqual(await queries.getCollections(), []);
      assert.deepEqual(await queries.getComplements("source"), []);
      assert.equal(await queries.getCollection("missing"), null);
      assert.equal(
        (await getProductsByCategorySlug("all", { q: "source" }))?.products
          .length,
        1,
      );
    },
  );
  await t.test(
    "additive SQL repeats safely, enables RLS and preserves catalog",
    async () => {
      const sql = readFileSync("prisma/additive/collections.sql", "utf8");
      await db.exec(sql);
      await db.exec(sql);
      assert.equal(await queries.collectionsReady(), true);
      const { rows } = await db.query<{
        tablename: string;
        rowsecurity: boolean;
      }>(
        `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('Collection', 'CollectionProduct', 'ProductComplement')`,
      );
      assert.equal(rows.length, 3);
      assert.ok(rows.every((row) => row.rowsecurity));
      assert.equal(await prisma.product.count(), 5);
    },
  );
  const input = {
    name: "هدية بمحبة",
    slug: "with-love",
    description: "اختيارات للهدايا",
    imageUrl: "",
    symbol: "gift" as const,
    tone: "rose" as const,
    keywords: ["عروسة"],
    isActive: true,
    showOnHome: true,
    sortOrder: 1,
    productIds: ["source", "same", "draft", "stocked"],
  };
  let id = "";
  await t.test(
    "validation rejects unsafe links, duplicates, empty published groups and missing products",
    async () => {
      assert.equal(
        collectionInput.safeParse({ ...input, imageUrl: "javascript:alert(1)" })
          .success,
        false,
      );
      assert.equal(
        collectionInput.safeParse({ ...input, productIds: ["same", "same"] })
          .success,
        false,
      );
      assert.equal(
        collectionInput.safeParse({ ...input, productIds: [] }).success,
        false,
      );
      await assert.rejects(
        saveCollection({ ...input, productIds: ["missing"] }),
      );
      await assert.rejects(saveCollection({ ...input, productIds: ["draft"] }));
      id = await saveCollection(input);
      assert.equal(await prisma.collection.count(), 1);
    },
  );
  await t.test(
    "public pages, membership, home and keyword discovery exclude unpublished products",
    async () => {
      assert.deepEqual(await queries.getCollections({ q: "%" }), []);
    const cards = await queries.getCollections({ home: true });
      assert.equal(cards.length, 1);
      assert.equal(cards[0].productCount, 3);
      assert.equal((await queries.getCollections({ q: "عروسة" })).length, 1);
      assert.equal(
        (await queries.getCollections({ productId: "source" })).length,
        1,
      );
      const page = await queries.getCollection("with-love");
      assert.deepEqual(
        page?.products.map((p) => p.id),
        ["source", "same", "stocked"],
      );
      assert.equal(
        (await getProductsByCategorySlug("all", { q: "عروسة" }))?.total,
        3,
      );
      assert.equal(
        (await getProductsByCategorySlug("all", { q: "%" }))?.total,
        0,
      );
    },
  );
  await t.test(
    "manual ranking, availability, hidden members and self exclusion",
    async () => {
      await prisma.productComplement.createMany({
        data: [
          { productId: "source", targetId: "manual", sortOrder: 0 },
          { productId: "source", targetId: "draft", sortOrder: 1 },
        ],
      });
      assert.deepEqual(
        (await queries.getComplements("source")).map((p) => p.id),
        ["manual", "same", "stocked"],
      );
      await assert.rejects(
        prisma.productComplement.create({
          data: { productId: "source", targetId: "source" },
        }),
      );
      await prisma.category.update({
        where: { id: "cat" },
        data: { isActive: false },
      });
      assert.deepEqual(await queries.getCollections(), []);
      assert.deepEqual(await queries.getComplements("source"), []);
      await prisma.category.update({
        where: { id: "cat" },
        data: { isActive: true },
      });
    },
  );
  await t.test(
    "stale full editors cannot overwrite product-page membership changes; saves are atomic",
    async () => {
      const before = await prisma.collection.findUniqueOrThrow({
        where: { id },
      });
      await saveProductGroups("manual", [id], []);
      await assert.rejects(
        saveCollection({
          ...input,
          id,
          version: before.updatedAt.toISOString(),
        }),
        /تغيّرت/,
      );
      assert.equal(
        await prisma.collectionProduct.count({
          where: { collectionId: id, productId: "manual" },
        }),
        1,
      );
      await assert.rejects(saveProductGroups("manual", [], []), /تغيّرت/);
      const current = await prisma.collection.findUniqueOrThrow({
        where: { id },
      });
      await assert.rejects(
        saveCollection({
          ...input,
          id,
          version: current.updatedAt.toISOString(),
          productIds: ["source", "missing"],
        }),
      );
      assert.equal(
        await prisma.collectionProduct.count({ where: { collectionId: id } }),
        5,
      );
      await saveCollection({
        ...input,
        id,
        version: current.updatedAt.toISOString(),
        isActive: false,
      });
      assert.deepEqual(await queries.getCollections(), []);
      assert.equal(await queries.getCollection("with-love"), null);
      assert.equal(
        (await getProductsByCategorySlug("all", { q: "عروسة" }))?.total,
        0,
      );
    },
  );
});
