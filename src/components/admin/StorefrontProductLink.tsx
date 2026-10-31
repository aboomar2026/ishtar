import Link from '@/components/NavigationLink';
export function StorefrontProductLink({ slug, published, label = 'عرض', className }: {
  slug: string; published: boolean; label?: string; className: string;
}) {
  return published ? <Link href={`/product/${encodeURIComponent(slug)}`} className={className} target="_blank" rel="noopener noreferrer" prefetch={false}>{label}</Link>
    : <span className="adminMuted" title="فعّل المنتج وتصنيفه أولاً لعرضه في المتجر">غير منشور — فعّل المنتج وتصنيفه للعرض</span>;
}
