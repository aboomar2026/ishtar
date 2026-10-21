import { getInventoryVariants, type InventoryFilter } from '@/features/admin/inventory/inventory-admin.queries';
import { InventoryFilters } from '@/components/admin/InventoryFilters';
import { InventoryTable } from '@/components/admin/InventoryTable';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ q?: string; filter?: string }>;

export default async function AdminInventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const rows = await getInventoryVariants({ q: sp.q, filter: (sp.filter as InventoryFilter) ?? 'all' });

  return (
    <div>
      <div className="adminPageHeader">
        <div>
          <h1>المخزون</h1>
          <p className="adminMuted">{rows.length} خيار. تُسجَّل تغييرات الكمية كتعديلات يدوية.</p>
        </div>
      </div>
      <InventoryFilters />
      <InventoryTable rows={rows} />
    </div>
  );
}
