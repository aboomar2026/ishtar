import type { DeliveryFeeStatus, OrderStatus } from '@prisma/client';
import { STATUS_LABEL_AR } from '@/features/admin/orders/order-admin.validation';
import { formatCurrency } from '@/features/admin/shared/admin-format';

type StepState = 'done' | 'current' | 'blocked' | 'todo' | 'muted';

type Step = {
  label: string;
  description: string;
  state: StepState;
};

function isAtLeast(status: OrderStatus, target: OrderStatus): boolean {
  const order: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  return order.indexOf(status) >= order.indexOf(target);
}

function stepClass(state: StepState): string {
  return `adminWorkflowStep is${state[0].toUpperCase()}${state.slice(1)}`;
}

export function OrderWorkflowChecklist({
  status,
  deliveryFeeStatus,
  deliveryFee,
  isPacked
}: {
  status: OrderStatus;
  deliveryFeeStatus: DeliveryFeeStatus;
  deliveryFee: number;
  isPacked: boolean;
}) {
  const isCanceled = status === 'CANCELED';
  const deliveryReady = deliveryFeeStatus !== 'PENDING';
  const currentDeliveryText = deliveryFeeStatus === 'PENDING'
    ? 'حدد سعر التوصيل حسب المنطقة أو اعتمده مجاناً.'
    : deliveryFeeStatus === 'FREE'
      ? 'تم اعتماد التوصيل المجاني.'
      : `تم تحديد التوصيل: ${formatCurrency(deliveryFee)}.`;

  const steps: Step[] = isCanceled
    ? [
        {
          label: 'الطلب ملغي',
          description: 'تم إغلاق الطلب وإرجاع المخزون حسب سجل الحركة.',
          state: 'blocked'
        }
      ]
    : [
        {
          label: 'تأكيد الطلب',
          description: isAtLeast(status, 'CONFIRMED') ? `الحالة الحالية: ${STATUS_LABEL_AR[status]}.` : 'راجع بيانات العميل والمنتجات ثم أكد الطلب.',
          state: isAtLeast(status, 'CONFIRMED') ? 'done' : 'current'
        },
        {
          label: 'تحديد التوصيل',
          description: currentDeliveryText,
          state: deliveryReady ? 'done' : isAtLeast(status, 'CONFIRMED') ? 'current' : 'todo'
        },
        {
          label: 'التجهيز والتغليف',
          description: isPacked ? 'تم تحديد الطلب كمغلّف.' : 'اطبع قائمة التغليف وجهز القطع ثم علّم الطلب كمغلّف.',
          state: isPacked ? 'done' : isAtLeast(status, 'PROCESSING') ? 'current' : 'todo'
        },
        {
          label: 'الشحن',
          description: deliveryReady ? 'يمكن تحويل الطلب إلى تم الشحن بعد التجهيز.' : 'الشحن مقفول حتى يتم تحديد التوصيل.',
          state: isAtLeast(status, 'SHIPPED') ? 'done' : !deliveryReady && isAtLeast(status, 'PROCESSING') ? 'blocked' : 'todo'
        },
        {
          label: 'التسليم',
          description: isAtLeast(status, 'DELIVERED') ? 'تم تسليم الطلب.' : 'بعد وصول الطلب للعميل حوّله إلى تم التسليم.',
          state: isAtLeast(status, 'DELIVERED') ? 'done' : 'todo'
        }
      ];

  return (
    <div className="adminWorkflow">
      {steps.map((step) => (
        <div key={step.label} className={stepClass(step.state)}>
          <span className="adminWorkflowDot" aria-hidden="true" />
          <div>
            <strong>{step.label}</strong>
            <p>{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
