'use client';

import Link from 'next/link';
import { useLessonStore } from '@/lib/store';

interface LessonHeaderProps {
  unitTitleKo: string;
  unitTitleEn: string;
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}

export default function LessonHeader({
  unitTitleKo,
  unitTitleEn,
  current,
  total,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: LessonHeaderProps) {
  const lang = useLessonStore((s) => s.lang);
  const setLang = useLessonStore((s) => s.setLang);

  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-brand-dark px-4 py-3 text-white">
      <div className="flex items-center gap-3">
        <Link
          href="/courses"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-bold"
          title="코스 목록으로"
        >
          한
        </Link>
        <div>
          <p className="text-sm font-semibold leading-tight">
            한글케어 <span className="text-brand-light/80">HangulCare</span>
          </p>
          <p className="text-xs text-white/60">{lang === 'ko' ? unitTitleKo : unitTitleEn}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/courses"
          className="hidden rounded-lg border border-white/20 px-2.5 py-1 text-xs sm:inline-block"
        >
          ← 코스 목록
        </Link>
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="rounded-lg border border-white/20 px-2 py-1 text-sm disabled:opacity-30"
          aria-label="이전 상황"
        >
          ←
        </button>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium tabular-nums">
          {current} / {total}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="rounded-lg border border-white/20 px-2 py-1 text-sm disabled:opacity-30"
          aria-label="다음 상황"
        >
          →
        </button>
        <div className="ml-2 flex overflow-hidden rounded-lg border border-white/20 text-xs">
          <button
            type="button"
            onClick={() => setLang('ko')}
            className={`px-2 py-1 ${lang === 'ko' ? 'bg-brand text-white' : 'text-white/60'}`}
          >
            한국어
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-2 py-1 ${lang === 'en' ? 'bg-brand text-white' : 'text-white/60'}`}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}
