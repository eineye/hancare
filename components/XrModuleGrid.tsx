'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import type { XrModule } from '@/lib/types';

function formatClock(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function ModuleCard({ module: m }: { module: XrModule }) {
  const hasBuild = !!m.buildUrl;
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
      <div className="mt-auto flex gap-1.5 pt-1">
        {hasBuild ? (
          <span className="rounded-full bg-chip px-2.5 py-1 text-[11px] font-semibold text-brand">콘텐츠 연결됨</span>
        ) : (
          <span className="rounded-full bg-panel px-2.5 py-1 text-[11px] font-semibold text-faint">콘텐츠 없음</span>
        )}
      </div>
    </Link>
  );
}

export default function XrModuleGrid({ modules }: { modules: XrModule[] }) {
  const account = useAuthStore((s) => s.account);
  const [sessionStart] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - sessionStart), 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  const connectedCount = modules.filter((m) => m.buildUrl).length;

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <p className="text-[11.5px] font-bold tracking-wide text-brand">XR실습 XR PRACTICE</p>
        <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
          HnaCare XR 실습 모듈
        </h1>
        <p className="mt-2 text-sm text-muted">
          관리자가 Unity WebGL로 제작한 3D 인터랙션 콘텐츠를 올리면 모듈 카드에 연결됩니다. 자세한 내용은{' '}
          <code>docs/XR_MODULE_DESIGN.md</code> 참고.
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
          <p className="text-xs text-faint">콘텐츠 연결된 모듈</p>
          <p className="mt-1.5 font-mono text-sm font-bold text-brand-dark">
            {connectedCount} / {modules.length}
          </p>
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold text-brand-dark">XR실습 모듈</h2>
        {modules.length > 0 && (
          <span className="font-mono text-xs text-faint">
            법정 실습시간 합계 {modules.reduce((sum, m) => sum + m.legalHours, 0)}시간
          </span>
        )}
      </div>

      {modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          아직 등록된 XR실습 모듈이 없습니다. 관리자 모드의 &ldquo;XR실습 편집&rdquo;에서 모듈을 추가하고 Unity
          WebGL 빌드를 올려주세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <ModuleCard key={m.id} module={m} />
          ))}
        </div>
      )}
    </div>
  );
}
