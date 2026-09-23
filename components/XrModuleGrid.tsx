'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
      className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-4 transition-transform hover:-translate-y-0.5 hover:border-brand"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chip font-mono text-sm font-bold text-brand-dark">
          {String(m.order).padStart(2, '0')}
        </span>
        <span className="ml-auto font-mono text-xs text-faint">법정 {m.legalHours}시간</span>
      </div>
      <h3 className="text-sm font-bold leading-snug text-brand-dark">{m.titleKo}</h3>
      <p className="text-xs text-faint">{m.titleEn}</p>
      <p className="text-xs text-muted">환자: {m.patientNameKo}</p>
      <p className="font-mono text-[11px] leading-relaxed text-faint">{m.techNoteKo}</p>
      <div className="mt-auto flex gap-1.5 pt-1">
        <span className="rounded-full bg-panel px-2.5 py-1 text-[11px] font-semibold text-muted">테스트 가능</span>
        {done && (
          <span className="rounded-full bg-chip px-2.5 py-1 text-[11px] font-semibold text-brand">완료 ✓</span>
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
    <div className="flex flex-col gap-3.5">
      <div>
        <p className="text-[11.5px] font-bold tracking-wide text-brand">XR실습 XR PRACTICE</p>
        <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
          HnaCare XR 5대 모듈
        </h1>
        <p className="mt-2 text-sm text-muted">
          <code>docs/XR_MODULE_DESIGN.md</code>의 Phase 1(화면 흐름·상호작용 셸)입니다. 실제 3D 뷰어·물리 엔진은
          아직 없고, 인터랙션 버튼 결과는 미리 정의된 텍스트로 대체되어 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-white p-4 text-center">
          <p className="text-xs text-faint">사용자</p>
          <p className="mt-1.5 truncate text-sm font-bold text-brand-dark">{account?.name ?? '학습자'}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 text-center">
          <p className="text-xs text-faint">접속시간</p>
          <p className="mt-1.5 font-mono text-sm font-bold text-brand-dark">{formatClock(new Date(sessionStart))}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 text-center">
          <p className="text-xs text-faint">이번 세션 실습시간</p>
          <p className="mt-1.5 font-mono text-sm font-bold text-brand-dark">{formatElapsed(elapsed)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 text-center">
          <p className="text-xs text-faint">완료한 모듈</p>
          <p className="mt-1.5 font-mono text-sm font-bold text-brand-dark">
            {doneCount} / {modules.length}
          </p>
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold text-brand-dark">XR실습 5대 모듈</h2>
        <span className="font-mono text-xs text-faint">
          법정 실습시간 합계 {modules.reduce((sum, m) => sum + m.legalHours, 0)}시간
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <ModuleCard key={m.id} module={m} done={getModuleProgress(progress, m.id).submitted} />
        ))}
      </div>
    </div>
  );
}
