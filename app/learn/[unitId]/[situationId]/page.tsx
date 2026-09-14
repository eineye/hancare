import { notFound } from 'next/navigation';
import { getSituation } from '@/lib/content';
import LessonScreen from '@/components/LessonScreen';
import AuthGuard from '@/components/AuthGuard';

export default async function LearnPage({
  params,
}: {
  params: Promise<{ unitId: string; situationId: string }>;
}) {
  const { unitId, situationId } = await params;
  const found = getSituation(unitId, situationId);
  if (!found) notFound();

  return (
    <AuthGuard role="any">
      <LessonScreen unit={found.unit} situation={found.situation} />
    </AuthGuard>
  );
}
