import AuthGuard from '@/components/AuthGuard';
import AppShell from '@/components/AppShell';
import { getDefaultLearnHref, getPracticeUnitIds } from '@/lib/courses';
import { getNotices } from '@/lib/notices';

// content/*.json이 재배포 없이 수시로 바뀔 수 있으므로, 사이드바의 "실습한글" 기본
// 목적지와 알림 벨 배지(관리자가 /admin/alerts에서 방금 작성한 알림 포함)도 매 요청마다
// 새로 계산한다.
export const dynamic = 'force-dynamic';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const [defaultLearnHref, practiceUnitIds, notices] = await Promise.all([
    getDefaultLearnHref(),
    getPracticeUnitIds(),
    getNotices(),
  ]);
  return (
    <AuthGuard role="any">
      <AppShell defaultLearnHref={defaultLearnHref} practiceUnitIds={practiceUnitIds} notices={notices}>
        {children}
      </AppShell>
    </AuthGuard>
  );
}
