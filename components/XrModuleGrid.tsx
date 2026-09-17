'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from './TopBar';
import { useXrProgressStore, getModuleProgress } from '@/lib/xrStore';
import { useAuthStore } from '@/lib/auth';
import type { XrModule } from '@/lib/types';

function formatClock(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function ModuleCard({ module: m, done }: { module: XrModule; done: boolean }) {
  return (
    <Link
      href={`/xr/${m.id}`}
      className="flex flex-col gap-2.5 rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-brand"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-light font-mono text-sm font-bold text-brand-dark">
          {String(m.order).padStart(2, '0')}
        </span>
        <span className="ml-auto font-mono text-xs text-gray-400">법정 {m.legalHours}시간</span>
      </div>
      <h3 className="text-sm font-bold leading-snug text-brand-dark">{m.titleKo}</h3>
      <p className="text-xs text-gray-400">{m.titleEn}</p>
      <p className="text-xs text-gray-500">환자: {m.patientNameKo}</p>
      <p className="font-mono text-[11px] leading-relaxed text-gray-400">{m.techNoteKo}</p>
      <div className="mt-auto flex gap-1.5 pt-1">
        <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-gray-500">테스트 가능</span>
        {done && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">완료 ✓</span>
        )}
      </div>
    </Link>
  );
}

export default function XrModuleGrid({ modules }: { modules: XrModule[] }) {
  const account = useAuthStore((s) => s.account);
  const progress = useXrProgressStore((s) => s.progress);
  const [sessionStart] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - sessionStart), 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  const doneCount = modules.filter((m) => getModuleProgress(progress, m.id).submitted).length;

  return (
    <div className="min-h-screen bg-surface pb-10">
      <TopBar title="XR실습 · HnaCare XR" />

      <main className="mx-auto max-w-5xl space-y-4 p-4">
        <Link href="/courses" className="inline-block text-xs font-medium text-brand hover:underline">
          ← 코스 목록
        </Link>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          이 화면은 <code>docs/XR_MODULE_DESIGN.md</code>의 XR실습 Phase 1(화면 흐름·상호작용 셸)입니다.
          실제 3D 뷰어·물리 엔진은 아직 없고, 인터랙션 버튼 결과는 미리 정의된 텍스트로 대체되어 있습니다.
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-gray-400">사용자</p>
            <p className="mt-1 truncate text-sm font-bold text-brand-dark">{account?.name ?? '학습자'}</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-gray-400">접속시간</p>
            <p className="mt-1 font-mono text-sm font-bold text-brand-dark">{formatClock(new Date(sessionStart))}</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-gray-400">이번 세션 실습시간</p>
            <p className="mt-1 font-mono text-sm font-bold text-brand-dark">{formatElapsed(elapsed)}</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-gray-400">완료한 모듈</p>
            <p className="mt-1 font-mono text-sm font-bold text-brand-dark">
              {doneCount} / {modules.length}
            </p>
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold text-brand-dark">XR실습 5대 모듈</h2>
          <span className="font-mono text-xs text-gray-400">
            법정 실습시간 합계 {modules.reduce((sum, m) => sum + m.legalHours, 0)}시간
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <ModuleCard key={m.id} module={m} done={getModuleProgress(progress, m.id).submitted} />
          ))}
        </div>
      </main>
    </div>
  );
}
