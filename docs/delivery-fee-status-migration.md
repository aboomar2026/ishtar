# Delivery fee status migration note

This change intentionally removes automatic storefront delivery pricing.

New orders now start with:

- `deliveryFeeStatus = PENDING`
- `deliveryFee = 0`
- `total = subtotal - discount`

Admins must set the delivery price on the order detail page before moving the order to `SHIPPED`, or mark delivery as free.

## Local/dev upgrade steps

```bash
npm run db:generate
npx prisma migrate dev --name add_delivery_fee_status
npm run db:backfill-delivery-fee-status
npm run db:audit-commerce
npm run typecheck
npm run build
```

If this project is using `prisma db push` instead of migrations during demo/dev:

```bash
npm run db:generate
npm run db:push
npm run db:backfill-delivery-fee-status
npm run db:audit-commerce
```

## Legacy order handling

The backfill script marks legacy orders as:

- `SET` when `deliveryFee > 0`
- `FREE` when the order is already `SHIPPED` or `DELIVERED` and `deliveryFee = 0`

Other old orders with `deliveryFee = 0` remain `PENDING` so the admin can confirm the delivery decision manually.
