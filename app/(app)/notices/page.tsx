import NoticesView from '@/components/NoticesView';
import { getNotices } from '@/lib/notices';

export const dynamic = 'force-dynamic';

export default async function NoticesPage() {
  const notices = await getNotices();
  return <NoticesView notices={notices} />;
}
