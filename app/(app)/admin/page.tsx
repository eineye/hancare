import AdminView from '@/components/AdminView';
import { getCourseSections } from '@/lib/courses';
import { getUnits } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [sections, units] = await Promise.all([getCourseSections(), getUnits()]);
  return <AdminView sections={sections} units={units} />;
}
