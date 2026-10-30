import { requireAdmin } from '@/features/admin/auth/admin-auth';
import { EnrichmentPanel } from './EnrichmentPanel';
export const dynamic='force-dynamic';
export default async function Page(){await requireAdmin();return <EnrichmentPanel/>;}
