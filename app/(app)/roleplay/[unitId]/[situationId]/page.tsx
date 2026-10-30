import { notFound } from 'next/navigation';
import { getSituation } from '@/lib/content';
import { getRoleplayScenario } from '@/lib/contentStore';
import RoleplayView from '@/components/RoleplayView';

export const dynamic = 'force-dynamic';

export default async function RoleplayPage({
  params,
}: {
  params: Promise<{ unitId: string; situationId: string }>;
}) {
  const { unitId, situationId } = await params;
  const [found, scenario] = await Promise.all([getSituation(unitId, situationId), getRoleplayScenario(unitId, situationId)]);
  if (!found) notFound();

  return (
    <RoleplayView
      unitId={unitId}
      situationId={situationId}
      situationTitleKo={found.situation.titleKo}
      terms={found.situation.terms}
      learnHref={`/learn/${unitId}/${situationId}`}
      scenario={scenario ?? {}}
    />
  );
}
