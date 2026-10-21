import { notFound } from 'next/navigation';
import { getOrderForPrint } from '@/features/admin/orders/order-print.queries';
import { PrintablePackingSlip } from '@/components/admin/PrintablePackingSlip';
import { PrintTrigger } from '@/components/admin/PrintTrigger';

export const dynamic = 'force-dynamic';

export default async function OrderPackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getOrderForPrint(id);
  if (!data) notFound();

  return (
    <div className="printPage">
      <PrintTrigger orderId={id} type="packing" backHref={`/admin/orders/${id}`} />
      <PrintablePackingSlip order={data.order} qrDataUrl={data.qrDataUrl} />
    </div>
  );
}
