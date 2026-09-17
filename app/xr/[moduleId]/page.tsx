import { notFound } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import XrPracticeScreen from '@/components/XrPracticeScreen';
import { getXrModules } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function XrModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const modules = await getXrModules();
  const index = modules.findIndex((m) => m.id === moduleId);
  if (index === -1) notFound();

  const module_ = modules[index];
  const prev = index > 0 ? modules[index - 1] : undefined;
  const next = index < modules.length - 1 ? modules[index + 1] : undefined;

  return (
    <AuthGuard role="any">
      <XrPracticeScreen
        module={module_}
        prevHref={prev ? `/xr/${prev.id}` : undefined}
        nextHref={next ? `/xr/${next.id}` : undefined}
        progress={{ current: index + 1, total: modules.length }}
      />
    </AuthGuard>
  );
}
