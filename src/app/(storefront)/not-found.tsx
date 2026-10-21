import { EmptyState } from '@/components/EmptyState';

export default function NotFound() {
  return <EmptyState title="الصفحة غير موجودة" description="الرابط غير صحيح أو المنتج غير متوفر حالياً." actionHref="/" actionLabel="العودة للرئيسية" />;
}
