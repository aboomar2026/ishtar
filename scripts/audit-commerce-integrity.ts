import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { calcLineTotal, calcOrderTotals } from '../src/features/orders/order-pricing';

function ensureEnvLoaded(): void {
  if (process.env.DATABASE_URL) return;
  const loader = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
  if (typeof loader === 'function') {
    try {
      loader.call(process, path.resolve(process.cwd(), '.env'));
    } catch {
      /* .env is optional when vars are already exported */
    }
  }
}

ensureEnvLoaded();

const prisma = new PrismaClient();
const MONEY_TOLERANCE = 0.01;

type Issue = {
  area: string;
  severity: 'error' | 'warning';
  message: string;
  reference?: string;
};

const issues: Issue[] = [];

function decimalToNumber(value: { toNumber(): number } | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return value.toNumber();
}

function moneyMatches(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= MONEY_TOLERANCE;
}

function addIssue(issue: Issue): void {
  issues.push(issue);
}

async function auditOrderMoney(): Promise<void> {
  const orders = await prisma.order.findMany({
    include: {
      items: { select: { id: true, quantity: true, unitPrice: true, total: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  for (const order of orders) {
    let expectedSubtotal = 0;

    for (const item of order.items) {
      const unitPrice = decimalToNumber(item.unitPrice);
      const actualLineTotal = decimalToNumber(item.total);
      const expectedLineTotal = calcLineTotal(unitPrice, item.quantity);
      expectedSubtotal = Math.round((expectedSubtotal + expectedLineTotal + Number.EPSILON) * 100) / 100;

      if (!moneyMatches(actualLineTotal, expectedLineTotal)) {
        addIssue({
          area: 'order-money',
          severity: 'error',
          message: `Order item total mismatch. Expected ${expectedLineTotal}, got ${actualLineTotal}.`,
          reference: `${order.orderNumber} / item ${item.id}`
        });
      }
    }

    const actualDeliveryFee = decimalToNumber(order.deliveryFee);
    const expectedTotals = calcOrderTotals(expectedSubtotal, decimalToNumber(order.discount), actualDeliveryFee);
    const actualSubtotal = decimalToNumber(order.subtotal);
    const actualTotal = decimalToNumber(order.total);

    if (!moneyMatches(actualSubtotal, expectedTotals.subtotal)) {
      addIssue({
        area: 'order-money',
        severity: 'error',
        message: `Order subtotal mismatch. Expected ${expectedTotals.subtotal}, got ${actualSubtotal}.`,
        reference: order.orderNumber
      });
    }

    if (!moneyMatches(actualDeliveryFee, expectedTotals.deliveryFee)) {
      addIssue({
        area: 'order-money',
        severity: 'error',
        message: `Order delivery fee mismatch. Expected ${expectedTotals.deliveryFee}, got ${actualDeliveryFee}.`,
        reference: order.orderNumber
      });
    }

    if ((order.deliveryFeeStatus === 'PENDING' || order.deliveryFeeStatus === 'FREE') && !moneyMatches(actualDeliveryFee, 0)) {
      addIssue({
        area: 'delivery-fee',
        severity: 'error',
        message: `Order with deliveryFeeStatus=${order.deliveryFeeStatus} must have deliveryFee=0, got ${actualDeliveryFee}.`,
        reference: order.orderNumber
      });
    }

    if (order.deliveryFeeStatus === 'SET' && moneyMatches(actualDeliveryFee, 0)) {
      addIssue({
        area: 'delivery-fee',
        severity: 'warning',
        message: 'Order delivery fee status is SET but fee is 0. Prefer FREE for intentional free delivery.',
        reference: order.orderNumber
      });
    }

    if (!moneyMatches(actualTotal, expectedTotals.total)) {
      addIssue({
        area: 'order-money',
        severity: 'error',
        message: `Order total mismatch. Expected ${expectedTotals.total}, got ${actualTotal}.`,
        reference: order.orderNumber
      });
    }
  }
}

async function auditInventoryLogs(): Promise<void> {
  const orders = await prisma.order.findMany({
    include: {
      items: {
        select: { productId: true, variantId: true, quantity: true }
      },
      inventoryLogs: {
        select: { variantId: true, type: true, quantityChange: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  for (const order of orders) {
    const quantityByVariant = new Map<string, number>();
    const productByVariant = new Map<string, string>();

    for (const item of order.items) {
      if (!item.variantId) {
        addIssue({
          area: 'inventory',
          severity: 'warning',
          message: 'Order item has no variantId, so future stock restore cannot target a variant.',
          reference: order.orderNumber
        });
        continue;
      }
      quantityByVariant.set(item.variantId, (quantityByVariant.get(item.variantId) ?? 0) + item.quantity);
      productByVariant.set(item.variantId, item.productId);
    }

    for (const [variantId, orderedQuantity] of quantityByVariant) {
      const createdChange = order.inventoryLogs
        .filter((log) => log.variantId === variantId && log.type === 'ORDER_CREATED')
        .reduce((sum, log) => sum + log.quantityChange, 0);

      if (createdChange !== -orderedQuantity) {
        addIssue({
          area: 'inventory',
          severity: 'error',
          message: `ORDER_CREATED inventory log mismatch. Expected ${-orderedQuantity}, got ${createdChange}.`,
          reference: `${order.orderNumber} / variant ${variantId} / product ${productByVariant.get(variantId)}`
        });
      }

      const canceledChange = order.inventoryLogs
        .filter((log) => log.variantId === variantId && log.type === 'ORDER_CANCELED')
        .reduce((sum, log) => sum + log.quantityChange, 0);

      if (order.status === 'CANCELED') {
        if (canceledChange !== orderedQuantity) {
          addIssue({
            area: 'inventory',
            severity: 'error',
            message: `ORDER_CANCELED inventory log mismatch. Expected ${orderedQuantity}, got ${canceledChange}.`,
            reference: `${order.orderNumber} / variant ${variantId} / product ${productByVariant.get(variantId)}`
          });
        }
      } else if (canceledChange !== 0) {
        addIssue({
          area: 'inventory',
          severity: 'error',
          message: `Non-canceled order has cancellation inventory logs totaling ${canceledChange}.`,
          reference: `${order.orderNumber} / variant ${variantId}`
        });
      }
    }
  }
}

async function auditInventoryLedgerBalance(): Promise<void> {
  const variants = await prisma.productVariant.findMany({
    select: {
      id: true,
      sku: true,
      quantity: true,
      product: { select: { name: true } }
    }
  });

  const logSums = await prisma.inventoryLog.groupBy({
    by: ['variantId'],
    _sum: { quantityChange: true }
  });
  const ledgerQuantityByVariant = new Map(logSums.map((row) => [row.variantId, row._sum.quantityChange ?? 0]));

  for (const variant of variants) {
    const ledgerQuantity = ledgerQuantityByVariant.get(variant.id) ?? 0;
    if (ledgerQuantity !== variant.quantity) {
      addIssue({
        area: 'inventory-ledger',
        severity: 'error',
        message: `Variant current quantity does not match inventory log ledger. Current quantity=${variant.quantity}, ledger sum=${ledgerQuantity}. Run npm run db:backfill-inventory-ledger once if this is pre-existing legacy data.`,
        reference: `${variant.product.name} / ${variant.sku} / ${variant.id}`
      });
    }
  }
}

async function auditProductCounters(): Promise<void> {
  const salesByProduct = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { order: { status: { not: 'CANCELED' } } },
    _sum: { quantity: true }
  });

  const productIds = salesByProduct.map((row) => row.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, soldCount: true }
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  for (const row of salesByProduct) {
    const actualSold = row._sum.quantity ?? 0;
    const product = productById.get(row.productId);
    if (!product) continue;

    if (product.soldCount < actualSold) {
      addIssue({
        area: 'sold-count',
        severity: 'warning',
        message: `Stored soldCount is behind real non-canceled order quantity. Run npm run db:backfill-sold-count. Expected at least ${actualSold}, got ${product.soldCount}.`,
        reference: `${product.name} / ${product.id}`
      });
    }
  }
}

async function auditProductAndVariantSanity(): Promise<void> {
  const negativeVariants = await prisma.productVariant.findMany({
    where: {
      OR: [
        { quantity: { lt: 0 } },
        { lowStockThreshold: { lt: 0 } }
      ]
    },
    select: { id: true, sku: true, quantity: true, lowStockThreshold: true }
  });

  for (const variant of negativeVariants) {
    addIssue({
      area: 'variant-sanity',
      severity: 'error',
      message: `Variant has invalid negative quantity or threshold. quantity=${variant.quantity}, lowStockThreshold=${variant.lowStockThreshold}.`,
      reference: `${variant.sku} / ${variant.id}`
    });
  }

  const activeProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: {
      variants: { select: { id: true, isActive: true, colorName: true, colorValue: true, size: true } }
    }
  });

  for (const product of activeProducts) {
    const activeVariants = product.variants.filter((variant) => variant.isActive);
    if (activeVariants.length === 0) {
      addIssue({
        area: 'variant-sanity',
        severity: 'error',
        message: 'ACTIVE product has no active variants.',
        reference: `${product.name} / ${product.id}`
      });
      continue;
    }

    const comboSeen = new Set<string>();
    for (const variant of activeVariants) {
      const colorKey = (variant.colorValue || variant.colorName || '').trim().toLowerCase();
      const sizeKey = (variant.size || '').trim().toLowerCase();
      const comboKey = `${colorKey}||${sizeKey}`;
      if (comboSeen.has(comboKey)) {
        addIssue({
          area: 'variant-sanity',
          severity: 'error',
          message: 'ACTIVE product has duplicate active color + size combinations.',
          reference: `${product.name} / ${product.id}`
        });
        break;
      }
      comboSeen.add(comboKey);
    }
  }
}

async function main(): Promise<void> {
  console.log('Running commerce integrity audit...');
  await auditOrderMoney();
  await auditInventoryLogs();
  await auditInventoryLedgerBalance();
  await auditProductCounters();
  await auditProductAndVariantSanity();

  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  if (issues.length === 0) {
    console.log('✅ Commerce integrity audit passed. No calculation, stock, inventory-ledger, inventory-log, or sold-count issues found.');
    return;
  }

  for (const issue of issues) {
    const prefix = issue.severity === 'error' ? '❌' : '⚠️';
    console.log(`${prefix} [${issue.area}] ${issue.message}${issue.reference ? ` (${issue.reference})` : ''}`);
  }

  console.log(`\nAudit finished with ${errors.length} error(s) and ${warnings.length} warning(s).`);
  if (warnings.length) {
    console.log('Warnings do not always block checkout, but should be reviewed. sold-count warnings are usually fixed with: npm run db:backfill-sold-count. Inventory-ledger errors on legacy data are usually fixed once with: npm run db:backfill-inventory-ledger');
  }

  if (errors.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('Commerce integrity audit failed unexpectedly', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
