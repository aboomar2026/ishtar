import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
// Request scoped: a missing additive migration must not break the existing shop.
export const collectionsReady = cache(async () => {
  const rows = await prisma.$queryRaw<
    { ready: boolean }[]
  >`SELECT to_regclass('public."Collection"') IS NOT NULL AND to_regclass('public."CollectionProduct"') IS NOT NULL AND to_regclass('public."ProductComplement"') IS NOT NULL AS ready`;
  return rows[0]?.ready === true;
});
