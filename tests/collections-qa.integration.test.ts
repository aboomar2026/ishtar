import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { selectCollectionImages } from "../src/features/collections/collection-images";

test(
  "collection QA fixes against the original hundred-product fixture",
  { timeout: 90000 },
  async (t) => {
    const db = new PGlite();
    await db.exec(
      execFileSync(
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
      ),
    );
    await db.exec(
      readFileSync("scripts/sql/ishtar-test-products-100.sql", "utf8"),
    );
    await db.exec(
      readFileSync(
        "scripts/sql/ishtar-collections-from-products-100.sql",
        "utf8",
      ),
    );
    const socket = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 0 });
    await socket.start();
    const address = socket.getServerConn();
    process.env.DATABASE_URL = `${address.startsWith("postgres") ? address : `postgresql://postgres:test@${address}/postgres`}?connection_limit=1&sslmode=disable`;
    const { prisma } = await import("../src/lib/prisma");
    const { getCollection, getCollections, getCollectionRecommendations } =
      await import("../src/features/collections/collections.queries");
    const processes: { next?: ChildProcess } = {};
    t.after(async () => {
      const next = processes.next;
      if (next && next.exitCode === null) {
        const exit = new Promise((resolve) => next.once("exit", resolve));
        next.kill("SIGTERM");
        await exit;
      }
      await prisma.$disconnect();
      // Socket close cleanup is scheduled with setImmediate by pglite-socket.
      // Drain disconnected handlers before destroying the WASM database.
      for (let attempt = 0; attempt < 100 && socket.getStats().activeConnections > 0; attempt++) {
        await new Promise<void>(resolve => setImmediate(resolve));
      }
      assert.equal(socket.getStats().activeConnections, 0);
      await socket.stop();
      await new Promise<void>(resolve => setImmediate(resolve));
      await db.close();
    });

    await t.test(
      "pages clamp to the actual page count including invalid numeric values",
      async () => {
        for (const [input, expected] of [
          [3, 2],
          [999999, 2],
          [0, 1],
          [-2, 1],
          [NaN, 1],
          [Infinity, 1],
          [1.5, 1],
        ] as const) {
          const page = await getCollection("elegance", input);
          assert.equal(page?.page, expected);
          assert.equal(page?.pageCount, 2);
          assert.equal(page?.products.length, expected === 1 ? 24 : 16);
        }
      },
    );
    await t.test(
      "automatic collage represents categories, differs across gift/bride and matches editor preview",
      async () => {
        const cards = await getCollections();
        const gift = cards.find((c) => c.slug === "gifts-with-love")!;
        const bride = cards.find((c) => c.slug === "for-the-bride")!;
        assert.equal(gift.images.length, 3);
        assert.equal(bride.images.length, 3);
        assert.equal(new Set(gift.images).size, 3);
        assert.notDeepEqual(gift.images, bride.images);
        for (const card of cards) {
          const members = await prisma.collectionProduct.findMany({
            where: { collectionId: card.id },
            include: {
              product: {
                include: {
                  images: {
                    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                  },
                },
              },
            },
            orderBy: [{ sortOrder: "asc" }, { productId: "asc" }],
          });
          const preview = selectCollectionImages(
            members.map((m) => ({
              categoryId: m.product.categoryId,
              image: m.product.images[0].url,
            })),
          );
          assert.deepEqual(card.images, preview);
        }
        await prisma.collection.update({
          where: { id: gift.id },
          data: { imageUrl: "/custom-cover.webp" },
        });
        const custom = (await getCollections()).find((c) => c.id === gift.id)!;
        assert.equal(custom.imageUrl, "/custom-cover.webp");
        assert.deepEqual(custom.images, []);
      },
    );
    const source = "ishtar-qa-product-006";
    await t.test(
      "automatic associations diversify categories and manual selections remain unmixed",
      async () => {
        const automatic = await getCollectionRecommendations(source);
        assert.equal(automatic.kind, "collection");
        assert.equal(automatic.products.length, 4);
        assert.equal(
          new Set(automatic.products.map((p) => p.categoryId)).size,
          4,
        );
        assert.ok(
          automatic.products.every((p) => p.id !== source && !p.isOutOfStock),
        );
        await prisma.productComplement.create({
          data: {
            productId: source,
            targetId: "ishtar-qa-product-007",
            sortOrder: 0,
          },
        });
        const manual = await getCollectionRecommendations(source);
        assert.equal(manual.kind, "manual");
        assert.deepEqual(
          manual.products.map((p) => p.id),
          ["ishtar-qa-product-007"],
        );
        await prisma.product.update({
          where: { id: "ishtar-qa-product-007" },
          data: { status: "DRAFT" },
        });
        assert.equal(
          (await getCollectionRecommendations(source)).kind,
          "collection",
        );
        await prisma.product.update({
          where: { id: "ishtar-qa-product-007" },
          data: { status: "ACTIVE" },
        });
      },
    );
    await t.test(
      "cleanup removes exact historical fixture labels only, preserving all unrelated content and inventory",
      async () => {
        const variantsBefore = await prisma.productVariant.findMany({
          orderBy: { id: "asc" },
        });
        const details = [
          "المجموعة: لمسة",
          "التصنيف: عطور",
          "المجموعة: اختيار خاص",
          { note: "المجموعة: لمسة" },
          "تفصيل يدوي",
        ];
        await prisma.product.update({
          where: { id: source },
          data: { details },
        });
        await prisma.product.update({
          where: { id: "ishtar-qa-product-003" },
          data: { details: { note: "المجموعة: لمسة" } },
        });
        const before = await prisma.product.findUniqueOrThrow({
          where: { id: source },
        });
        await prisma.product.create({
          data: {
            id: "ordinary-product",
            slug: "ordinary-product",
            categoryId: before.categoryId,
            name: "منتج يدوي",
            description: "محفوظ",
            basePrice: 10,
            details: ["المجموعة: لمسة"],
          },
        });
        const sql = readFileSync(
          "scripts/sql/ishtar-remove-legacy-collection-details.sql",
          "utf8",
        );
        const first = await db.exec(sql);
        assert.equal(first[0].rows.length, 1);
        assert.equal((await db.exec(sql))[0].rows.length, 0);
        const after = await prisma.product.findUniqueOrThrow({
          where: { id: source },
        });
        assert.deepEqual(after.details, details.slice(1));
        assert.deepEqual(
          { ...after, details: before.details, updatedAt: before.updatedAt },
          before,
        );
        assert.deepEqual(
          await prisma.productVariant.findMany({ orderBy: { id: "asc" } }),
          variantsBefore,
        );
        assert.deepEqual(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: "ordinary-product" },
            })
          ).details,
          ["المجموعة: لمسة"],
        );
        assert.deepEqual(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: "ishtar-qa-product-003" },
            })
          ).details,
          { note: "المجموعة: لمسة" },
        );
      },
    );

    await prisma.$disconnect();
    await db.exec("DEALLOCATE ALL");
    let origin = "",
      output = "";
    const next = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "0",
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: "production",
          NEXT_TELEMETRY_DISABLED: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    processes.next = next;
    next.stdout?.on("data", (chunk) => {
      output += String(chunk);
      origin = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0] ?? "";
    });
    next.stderr?.on("data", (chunk) => {
      output += String(chunk);
    });
    for (let i = 0; i < 60; i++) {
      if (origin) break;
      if (next.exitCode !== null) throw new Error(output.slice(-1000));
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await t.test(
      "production route redirects excess/invalid pages and renders honest recommendation titles",
      async () => {
        assert.ok(origin);
        // Next may stream its redirect as a 200 RSC redirect instruction after the loading shell.
        for (const [page, target] of [
          ["3", "/collections/elegance?page=2"],
          ["-1", "/collections/elegance"],
          ["nonsense", "/collections/elegance"],
          ["Infinity", "/collections/elegance"],
        ] as const) {
          const response = await fetch(
            `${origin}/collections/elegance?page=${page}`,
            { redirect: "manual" },
          );
          const body = await response.text();
          assert.ok(
            response.headers.get("location") === target ||
              (body.includes(target) &&
                /NEXT_REDIRECT|http-equiv="refresh"/.test(body)),
            `Missing redirect for ${page}`,
          );
          assert.doesNotMatch(body, /صفحة 3 من 2/);
        }
        const product = await (
          await fetch(`${origin}/product/ishtar-fragrances-6-1`)
        ).text();
        assert.match(product, /يكمّل اختيارك/);
        const automatic = await (
          await fetch(`${origin}/product/ishtar-fragrances-8-1`)
        ).text();
        assert.match(automatic, /اختيارات من نفس المجموعات/);
      },
    );
  },
);
