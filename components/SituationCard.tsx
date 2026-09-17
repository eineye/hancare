'use client';

import { useLessonStore } from '@/lib/store';
import type { Situation } from '@/lib/types';

export default function SituationCard({ situation }: { situation: Situation }) {
  const lang = useLessonStore((s) => s.lang);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">상황 SITUATION</p>
      <h1 className="mt-1 text-lg font-bold text-brand-dark sm:text-xl">
        {lang === 'ko' ? situation.titleKo : situation.titleEn}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        {lang === 'ko' ? situation.descriptionKo : situation.descriptionEn}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[situation.placeTag, situation.formalityTag, situation.difficultyTag].map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-dark"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
