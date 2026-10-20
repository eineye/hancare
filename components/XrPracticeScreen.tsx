'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { XrModule } from '@/lib/types';

interface XrPracticeScreenProps {
  module: XrModule;
  prevHref?: string;
  nextHref?: string;
  progress: { current: number; total: number };
}

// Unity WebGL 빌드를 <iframe>으로 띄운다. 빌드가 아직 연결되지 않은 모듈은 안내만 보여준다.
// docs/XR_MODULE_DESIGN.md 참고.
export default function XrPracticeScreen({ module: m, prevHref, nextHref, progress }: XrPracticeScreenProps) {
  const router = useRouter();
  const frameWrapRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  async function toggleFullscreen() {
    if (!frameWrapRef.current) return;
    if (!document.fullscreenElement) {
      await frameWrapRef.current.requestFullscreen().catch(() => undefined);
      setFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => undefined);
      setFullscreen(false);
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-line bg-white px-4 py-3">
        <div className="min-w-[120px] flex-1">
          <p className="truncate text-sm font-bold text-brand-dark">{m.titleKo}</p>
          <p className="truncate text-xs text-muted">{m.titleEn}</p>
        </div>
        <span className="shrink-0 rounded-full bg-panel px-3 py-1 font-mono text-xs text-brand-dark">
          모듈 {progress.current} / {progress.total}
        </span>
        <button
          type="button"
          onClick={() => prevHref && router.push(prevHref)}
          disabled={!prevHref}
          className="shrink-0 rounded-lg border border-line px-2 py-1 text-sm text-brand-dark disabled:opacity-30"
          aria-label="이전 모듈"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => nextHref && router.push(nextHref)}
          disabled={!nextHref}
          className="shrink-0 rounded-lg border border-line px-2 py-1 text-sm text-brand-dark disabled:opacity-30"
          aria-label="다음 모듈"
        >
          →
        </button>
        <Link href="/xr" className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs text-brand-dark">
          ← 목록
        </Link>
      </div>

      {m.buildUrl ? (
        <div
          ref={frameWrapRef}
          className={`relative overflow-hidden rounded-2xl border border-line bg-black ${
            fullscreen ? 'h-screen w-screen' : 'aspect-video w-full'
          }`}
        >
          <iframe
            src={m.buildUrl}
            title={m.titleKo}
            className="h-full w-full border-0"
            allow="autoplay; fullscreen; xr-spatial-tracking; gamepad"
            allowFullScreen
          />
          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute right-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
          >
            {fullscreen ? '전체화면 끄기' : '전체화면'}
          </button>
        </div>
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white p-8 text-center">
          <p className="text-sm font-semibold text-brand-dark">아직 이 모듈에 콘텐츠가 연결되지 않았습니다.</p>
          <p className="text-xs text-muted">
            관리자 모드의 &ldquo;XR실습 편집&rdquo;에서 Unity WebGL 빌드(.zip)를 올리면 여기에 표시됩니다.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-line bg-white p-3.5 text-xs text-muted">
        법정 실습시간 <span className="font-mono font-semibold text-brand-dark">{m.legalHours}시간</span>
      </div>
    </div>
  );
}
