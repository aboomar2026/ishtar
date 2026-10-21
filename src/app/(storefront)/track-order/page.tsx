import { TrackOrderForm } from '@/components/TrackOrderForm';

export const dynamic = 'force-dynamic';

export default async function TrackOrderPage({ searchParams }: { searchParams?: Promise<{ order?: string }> }) {
  const resolved = searchParams ? await searchParams : {};

  return (
    <div className="plainPage">
      <div className="pageTitleBlock">
        <span className="eyebrow">تتبع الطلب</span>
        <h1>تتبع الطلب</h1>
        <p>تابعي حالة طلبك عبر رقم الطلب ورقم الجوال. الدفع عند الاستلام.</p>
      </div>
      <TrackOrderForm initialOrderNumber={resolved.order ?? ''} />
    </div>
  );
}
