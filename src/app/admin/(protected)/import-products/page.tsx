import { requireAdmin } from '@/features/admin/auth/admin-auth';
import { ImportPanel } from './ImportPanel';

export const dynamic = 'force-dynamic';
export default async function ImportProductsPage() {
  await requireAdmin();
  return <ImportPanel />;
}
