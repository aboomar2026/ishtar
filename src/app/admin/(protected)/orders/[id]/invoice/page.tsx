import { notFound } from 'next/navigation';
import { getOrderForPrint } from '@/features/admin/orders/order-print.queries';
import { PrintableInvoice } from '@/components/admin/PrintableInvoice';
import { PrintTrigger } from '@/components/admin/PrintTrigger';

export const dynamic = 'force-dynamic';

export default async function OrderInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getOrderForPrint(id);
  if (!data) notFound();

  const disabledReason = data.order.deliveryFeeStatus === 'PENDING'
    ? 'حدد سعر التوصيل أو اعتمده مجانياً قبل طباعة الفاتورة النهائية.'
    : undefined;

  return (
    <div className="printPage">
      <PrintTrigger orderId={id} type="invoice" backHref={`/admin/orders/${id}`} disabledReason={disabledReason} />
      <PrintableInvoice order={data.order} invoiceNumber={data.invoiceNumber} qrDataUrl={data.qrDataUrl} />
    </div>
  );
}
