import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { EmptyState } from './EmptyState';

export function ProductGrid({ products, homePreview = false }: { products: Product[]; homePreview?: boolean }) {
  if (!products.length) {
    return <EmptyState title="لا توجد منتجات" description="جرّبي البحث بكلمة مختلفة أو اختاري تصنيفاً آخر." actionHref="/category/all" actionLabel="تصفّح جميع المنتجات" />;
  }

  return (
    <div className={`productGrid${homePreview ? ' productGrid--homePreview' : ''}`}>
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}
