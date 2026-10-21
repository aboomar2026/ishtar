import type { DeliveryFeeStatus } from '@prisma/client';

export const DELIVERY_FEE_STATUS_LABEL_AR: Record<DeliveryFeeStatus, string> = {
  PENDING: 'بانتظار التحديد',
  SET: 'تم تحديد التوصيل',
  FREE: 'توصيل مجاني'
};

export function formatDeliveryFeeStatus(status: DeliveryFeeStatus): string {
  return DELIVERY_FEE_STATUS_LABEL_AR[status];
}
