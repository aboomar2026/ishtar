import { requireAdmin } from '@/features/admin/auth/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell admin={{ name: admin.name, email: admin.email, role: admin.role }}>{children}</AdminShell>;
}
