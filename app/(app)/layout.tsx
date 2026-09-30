import AuthGuard from '@/components/AuthGuard';
import AppShell from '@/components/AppShell';
import { getDefaultLearnHref, getPracticeUnitIds } from '@/lib/courses';

// content/*.json이 재배포 없이 수시로 바뀔 수 있으므로, 사이드바의 "실습한글" 기본
// 목적지도 매 요청마다 새로 계산한다.
export const dynamic = 'force-dynamic';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const [defaultLearnHref, practiceUnitIds] = await Promise.all([getDefaultLearnHref(), getPracticeUnitIds()]);
  return (
    <AuthGuard role="any">
      <AppShell defaultLearnHref={defaultLearnHref} practiceUnitIds={practiceUnitIds}>
        {children}
      </AppShell>
    </AuthGuard>
  );
}
