-- READ ONLY. Run after restoring/setting up the database.
-- No customer details, email addresses, password hashes or connection strings are returned.
SELECT expected.name AS table_name,
       to_regclass(format('public.%I', expected.name)) IS NOT NULL AS exists,
       tables.rowsecurity AS rls_enabled
FROM (VALUES ('Category'), ('Product'), ('ProductImage'), ('ProductVariant'), ('AdminUser'),
             ('Order'), ('OrderItem'), ('InventoryLog'), ('HeroSettings'),
             ('OrderNotification'), ('OrderNotificationRead'), ('OrderNotificationAttempt'),
             ('Collection'), ('CollectionProduct'), ('ProductComplement')) AS expected(name)
LEFT JOIN pg_tables tables ON tables.schemaname = 'public' AND tables.tablename = expected.name
ORDER BY expected.name;

SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Order'
  AND column_name IN ('checkoutRequestKey', 'checkoutFingerprint', 'deliveryFeeStatus')
ORDER BY column_name;

SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public' AND indexname IN (
  'Order_checkoutRequestKey_key', 'OrderNotification_orderId_key',
  'OrderNotificationAttempt_notificationId_attempt_key', 'Collection_slug_key',
  'CollectionProduct_pkey', 'ProductComplement_pkey')
ORDER BY tablename, indexname;

SELECT conrelid::regclass::text AS table_name, conname AS constraint_name
FROM pg_constraint WHERE connamespace = 'public'::regnamespace
  AND conname IN ('OrderNotification_deliveryStatus_check', 'OrderNotification_attempts_check', 'ProductComplement_no_self')
ORDER BY constraint_name;
