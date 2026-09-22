'use client';

import { useSettingsStore } from '@/lib/store';
import type { Situation } from '@/lib/types';

interface SituationCardProps {
  situation: Situation;
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}

export default function SituationCard({
  situation,
  current,
  total,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: SituationCardProps) {
  const displayLang = useSettingsStore((s) => s.displayLang);
  const bilingual = displayLang !== 'ko';

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="text-[11px] font-bold tracking-wide text-brand">상황 SITUATION</span>
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] tabular-nums text-faint">
          {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            className="rounded-lg border border-line px-2 py-1 text-xs text-brand-dark disabled:opacity-30"
            aria-label="이전 상황"
          >
            ←
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="rounded-lg border border-line px-2 py-1 text-xs text-brand-dark disabled:opacity-30"
            aria-label="다음 상황"
          >
            →
          </button>
        </div>
      </div>

      <h1 className="text-[22px] font-bold leading-[1.35] tracking-tight text-brand-dark sm:text-[25px]">
        {situation.titleKo}
      </h1>
      {bilingual && <p className="mt-1 text-sm text-muted">{situation.titleEn}</p>}
      <p className="mt-2 text-sm leading-relaxed text-muted">{situation.descriptionKo}</p>
      {bilingual && <p className="mt-1 text-xs leading-relaxed text-faint">{situation.descriptionEn}</p>}
      <div className="mt-3.5 flex flex-wrap gap-2">
        {[situation.placeTag, situation.formalityTag].map((tag) => (
          <span key={tag} className="rounded-full border border-chipBorder bg-chip px-3 py-1.5 text-xs font-medium text-brand">
            {tag}
          </span>
        ))}
        <span className="rounded-full border border-warnBorder bg-warnBg px-3 py-1.5 text-xs font-medium text-warn">
          {situation.difficultyTag}
        </span>
      </div>
    </section>
  );
}
