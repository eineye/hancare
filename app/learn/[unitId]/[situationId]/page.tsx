import { notFound } from 'next/navigation';
import { findAdjacentSituation, getSituation, unitProgress } from '@/lib/content';
import LessonScreen from '@/components/LessonScreen';
import AuthGuard from '@/components/AuthGuard';

// content/*.json이 재배포 없이 수시로 바뀔 수 있으므로 매 요청마다 새로 읽는다.
export const dynamic = 'force-dynamic';

export default async function LearnPage({
  params,
}: {
  params: Promise<{ unitId: string; situationId: string }>;
}) {
  const { unitId, situationId } = await params;
  const found = await getSituation(unitId, situationId);
  if (!found) notFound();

  const [prev, next, progress] = await Promise.all([
    findAdjacentSituation(unitId, situationId, -1),
    findAdjacentSituation(unitId, situationId, 1),
    unitProgress(unitId, situationId),
  ]);

  return (
    <AuthGuard role="any">
      <LessonScreen
        unit={found.unit}
        situation={found.situation}
        prevHref={prev ? `/learn/${prev.unitId}/${prev.situationId}` : undefined}
        nextHref={next ? `/learn/${next.unitId}/${next.situationId}` : undefined}
        progress={progress}
      />
    </AuthGuard>
  );
}
