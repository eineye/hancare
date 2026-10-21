import AdminAlertsView from '@/components/AdminAlertsView';
import { getNotices } from '@/lib/notices';

export const dynamic = 'force-dynamic';

export default async function AdminAlertsPage() {
  const notices = await getNotices();
  return <AdminAlertsView initialNotices={notices} />;
}
