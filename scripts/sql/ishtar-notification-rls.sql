-- Equivalent of the three notification-table RLS changes confirmed by owner screenshots.
-- The canonical prisma/additive/order-notifications.sql already includes these statements.
-- Retained as a standalone reference for older installations, not an extra required step.
BEGIN;
ALTER TABLE public."OrderNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderNotificationRead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderNotificationAttempt" ENABLE ROW LEVEL SECURITY;
COMMIT;
