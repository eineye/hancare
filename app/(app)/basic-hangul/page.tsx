import { getUnitsByCategory } from '@/lib/content';
import BasicHangulView from '@/components/BasicHangulView';

export const dynamic = 'force-dynamic';

export default async function BasicHangulPage() {
  const units = await getUnitsByCategory('basic');
  return <BasicHangulView units={units} />;
}
