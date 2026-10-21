import Link from 'next/link';
import type { Category } from '@/lib/types';

export function CategoryStrip({ categories, activeSlug }: { categories: Category[]; activeSlug?: string }) {
  return (
    <nav className="categoryStrip" aria-label="تصنيفات المتجر">
      <Link href="/category/new-in" className={activeSlug === 'new-in' ? 'active' : ''}>وصل حديثاً</Link>
      {categories.map((category) => (
        <Link
          href={`/category/${category.slug}`}
          className={activeSlug === category.slug ? 'active' : ''}
          key={category.slug}
        >
          {category.name}
        </Link>
      ))}
      <Link href="/category/sale" className={activeSlug === 'sale' ? 'active saleChip' : 'saleChip'}>العروض</Link>
    </nav>
  );
}
