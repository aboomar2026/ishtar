import { IconArrowRight } from '@/components/Icons';
import Link from '@/components/NavigationLink';
import { getCategoryOptions } from '@/features/admin/products/product-admin.queries';
import { ProductForm, type ProductFormInitial } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

const EMPTY: ProductFormInitial = {
  name: '',
  slug: '',
  subtitle: '',
  description: '',
  details: [],
  careInstructions: '',
  brand: '',
  stockLocation: 'مخزون جوليا',
  categoryId: '',
  basePrice: '',
  status: 'DRAFT',
  isFeatured: false,
  isNewArrival: false,
  isBestSeller: false,
  tags: [],
  images: [],
  variants: []
};

export default async function NewProductPage() {
  const categories = await getCategoryOptions();

  return (
    <div>
      <div className="adminPageHeader">
        <div>
          <h1>منتج جديد</h1>
          <p className="adminMuted">أنشئ منتجاً، ثم أضف الصور والخيارات.</p>
        </div>
        <Link href="/admin/products" className="adminBtn adminBtnGhost"><IconArrowRight size={20} /> رجوع</Link>
      </div>
      <ProductForm mode="create" categories={categories} initial={EMPTY} />
    </div>
  );
}
