import { notFound } from 'next/navigation';
import { getSituation } from '@/lib/content';
import RoleplayView from '@/components/RoleplayView';

export const dynamic = 'force-dynamic';

export default async function RoleplayPage({
  params,
}: {
  params: Promise<{ unitId: string; situationId: string }>;
}) {
  const { unitId, situationId } = await params;
  const found = await getSituation(unitId, situationId);
  if (!found) notFound();

  return (
    <RoleplayView
      unitId={unitId}
      situationId={situationId}
      situationTitleKo={found.situation.titleKo}
      terms={found.situation.terms}
      learnHref={`/learn/${unitId}/${situationId}`}
    />
  );
}
