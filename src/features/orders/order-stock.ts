import 'server-only';
import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * Lock the given ProductVariant rows FOR UPDATE inside an active transaction.
 * This prevents two concurrent checkouts from overselling the same stock:
 * the second transaction blocks here until the first commits/rolls back.
 * IDs are passed via Prisma.join (parameterised) — never string-concatenated.
 */
export async function lockVariantsForUpdate(tx: Tx, variantIds: string[]): Promise<void> {
  if (variantIds.length === 0) return;
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM "ProductVariant" WHERE id IN (${Prisma.join(variantIds)}) FOR UPDATE`
  );
}
