import AdminView from '@/components/AdminView';
import { getCourseSections } from '@/lib/courses';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const sections = await getCourseSections();
  return <AdminView sections={sections} />;
}
