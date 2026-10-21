import { getAdminCategories, getParentCategoryOptions } from '@/features/admin/categories/category-admin.queries';
import { CategoryManager } from '@/components/admin/CategoryManager';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const [categories, parentOptions] = await Promise.all([getAdminCategories(), getParentCategoryOptions()]);

  return (
    <div>
      <div className="adminPageHeader">
        <div>
          <h1>التصنيفات</h1>
          <p className="adminMuted">نظّم كتالوج المتجر. عطّل التصنيفات التي لا تزال تحتوي على منتجات بدلاً من حذفها.</p>
        </div>
      </div>
      <CategoryManager categories={categories} parentOptions={parentOptions} />
    </div>
  );
}
