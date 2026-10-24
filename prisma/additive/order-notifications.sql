-- Review and apply explicitly to the intended database; never run from the build.
-- Existing orders/customers/catalogue are not updated or backfilled.
BEGIN;
CREATE TABLE IF NOT EXISTS "OrderNotification" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderNotification_deliveryStatus_check" CHECK ("deliveryStatus" IN ('PENDING','PROCESSING','RETRY','SENT','FAILED','UNCERTAIN')),
  CONSTRAINT "OrderNotification_attempts_check" CHECK ("attempts" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrderNotification_orderId_key" ON "OrderNotification"("orderId");
CREATE INDEX IF NOT EXISTS "OrderNotification_deliveryStatus_nextAttemptAt_idx" ON "OrderNotification"("deliveryStatus","nextAttemptAt");
CREATE INDEX IF NOT EXISTS "OrderNotification_createdAt_id_idx" ON "OrderNotification"("createdAt","id");
CREATE INDEX IF NOT EXISTS "OrderNotification_updatedAt_id_idx" ON "OrderNotification"("updatedAt","id");
CREATE TABLE IF NOT EXISTS "OrderNotificationRead" (
  "notificationId" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderNotificationRead_pkey" PRIMARY KEY ("notificationId","adminId"),
  CONSTRAINT "OrderNotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "OrderNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "OrderNotificationRead_adminId_idx" ON "OrderNotificationRead"("adminId");
CREATE TABLE IF NOT EXISTS "OrderNotificationAttempt" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL,
  "outcome" TEXT NOT NULL DEFAULT 'PROCESSING',
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "OrderNotificationAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderNotificationAttempt_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "OrderNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrderNotificationAttempt_notificationId_attempt_key" ON "OrderNotificationAttempt"("notificationId","attempt");
-- Server-only tables: deny browser Data API access without explicit policies.
-- Prisma connects as the table owner or an appropriately privileged server role.
ALTER TABLE "OrderNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderNotificationRead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderNotificationAttempt" ENABLE ROW LEVEL SECURITY;
COMMIT;
