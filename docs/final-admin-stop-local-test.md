# Bab Al Hara — Admin Stop Summary & Local QA

## What changed in this final stop

### Admin dashboard
- Reworked the admin home page into an operational dashboard.
- Added priority cards for:
  - pending orders
  - orders waiting for delivery fee confirmation
  - low stock variants
  - out of stock variants
- Added today summary:
  - today's orders
  - today's pending orders
  - today's order value
- Added recent orders list with status, delivery status, total, location, and contact details.
- Added stock alerts list for variants below their low-stock threshold.
- Kept the layout mobile-first and action-oriented.

### Optional WhatsApp number
- Added optional WhatsApp number to checkout.
- The field is only used when the WhatsApp number differs from the main phone number.
- Stored on the order as a snapshot so admins can see it per order.
- Stored on the customer record when provided.
- Displayed in:
  - admin orders list
  - admin order details
  - recent orders on admin dashboard
  - printable invoice
  - printable packing slip
  - CSV export
- Admin order search now also searches by WhatsApp number.

## Database change

Prisma schema now includes:

```prisma
model Customer {
  whatsappPhone String?
}

model Order {
  customerWhatsappPhone String?
  @@index([customerWhatsappPhone])
}
```

## Local commands after merging

For dev/demo database:

```bash
npm run db:generate
npm run db:push
npm run db:backfill-delivery-fee-status
npm run db:backfill-inventory-ledger
npm run db:backfill-sold-count
npm run db:audit-commerce
npm run typecheck
npm run build
npm run dev
```

For migration workflow instead of db:push:

```bash
npm run db:migrate -- --name add_whatsapp_phone_and_admin_dashboard
npm run db:backfill-delivery-fee-status
npm run db:backfill-inventory-ledger
npm run db:backfill-sold-count
npm run db:audit-commerce
npm run typecheck
npm run build
npm run dev
```

## Manual QA checklist

### Checkout + WhatsApp
1. Add a product to cart.
2. Go to checkout.
3. Fill the required phone.
4. Leave WhatsApp empty and submit.
5. Confirm the order is created normally.
6. Repeat with a different WhatsApp number.
7. Open admin order details and confirm WhatsApp appears only for the second order.

### Admin orders
1. Open `/admin/orders`.
2. Confirm WhatsApp appears under customer details when provided.
3. Search by WhatsApp number and confirm the order appears.
4. Export CSV and confirm the WhatsApp column exists.

### Admin order detail
1. Open an order with WhatsApp.
2. Confirm it appears in the customer section.
3. Print invoice and packing slip.
4. Confirm WhatsApp appears on printed documents when provided.

### Admin dashboard
1. Open `/admin`.
2. Confirm priority cards load.
3. Click pending orders card and confirm it opens filtered orders.
4. Click delivery pending card and confirm it opens delivery-pending orders.
5. Confirm recent orders and stock alerts are usable on mobile.

### Commerce integrity
1. Create an order with quantity 5.
2. Confirm stock decreases.
3. Confirm sold count updates.
4. Set delivery fee in admin.
5. Move order through statuses.
6. Run `npm run db:audit-commerce` and confirm no errors.
