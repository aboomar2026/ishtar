import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { EmptyState } from './EmptyState';

export function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) {
    return <EmptyState title="لا توجد منتجات" description="جرّبي البحث بكلمة مختلفة أو اختاري تصنيفاً آخر." />;
  }

  return (
    <div className="productGrid">
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}
