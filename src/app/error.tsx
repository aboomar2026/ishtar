'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="emptyState" role="alert"><h1>تعذر تحميل الصفحة</h1><p>تحققي من الاتصال وحاولي مرة أخرى.</p><button type="button" className="primaryButton" onClick={reset}>إعادة المحاولة</button><Link href="/">العودة للرئيسية</Link></section>;
}
