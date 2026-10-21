'use client';

import { useEffect } from 'react';
import { saveRecentOrder, type RecentOrder } from '@/features/orders/recent-orders.client';

export function OrderSuccessRecentOrderSaver({ order }: { order: RecentOrder }) {
  useEffect(() => {
    saveRecentOrder(order);
  }, [order]);

  return null;
}
