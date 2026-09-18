import { getUnits } from '@/lib/content';
import ReportView from '@/components/ReportView';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  const units = await getUnits();
  const unitSummaries = units.map((unit) => ({
    id: unit.id,
    titleKo: unit.titleKo,
    termIds: unit.situations.flatMap((s) => s.terms.map((t) => t.id)),
  }));

  return <ReportView units={unitSummaries} />;
}
