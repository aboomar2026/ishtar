import type { Metadata } from 'next';
import { WishlistPageClient } from '@/components/WishlistPageClient';
export const metadata: Metadata = { title: 'المفضّلة', robots: { index: false, follow: false } };
export default function WishlistPage() {
  return <div className="plainPage"><div className="pageTitleBlock"><span className="eyebrow">Your favourites</span><h1>المفضّلة</h1></div><WishlistPageClient /></div>;
}
