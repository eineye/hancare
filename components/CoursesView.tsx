'use client';

import Link from 'next/link';
import { useStatsStore } from '@/lib/store';
import type { CourseSection } from '@/lib/courses';

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-panel p-3.5 text-center">
      <p className="text-xl font-black text-brand-dark">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{label}</p>
    </div>
  );
}

export default function CoursesView({ sections }: { sections: CourseSection[] }) {
  const wordsPracticed = useStatsStore((s) => s.wordsPracticed);
  const accuracySum = useStatsStore((s) => s.accuracySum);
  const accuracyCount = useStatsStore((s) => s.accuracyCount);
  const avgAccuracy = accuracyCount > 0 ? Math.round(accuracySum / accuracyCount) : 0;

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const availableItems = sections.reduce((sum, s) => sum + s.items.filter((i) => i.status === 'available').length, 0);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11.5px] font-bold tracking-wide text-brand">커리큘럼 CURRICULUM</p>
          <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
            진도관리 · 학습 단계 선택
          </h1>
          <p className="mt-2 text-sm text-muted">기초한글 · 실습한글 · XR실습 순서로 구성했습니다.</p>
        </div>
        <div className="flex gap-1.5">
          <span className="rounded-full bg-brand-dark px-4 py-2 text-xs text-white">전체 {totalItems}</span>
          <span className="rounded-full border border-line bg-white px-4 py-2 text-xs text-brand-dark">
            이용 가능 {availableItems}
          </span>
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-white p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">나의 진도</p>
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile value={String(wordsPracticed)} label="학습 문장 수" />
          <StatTile value={`${avgAccuracy}%`} label="평균 정확도" />
          <StatTile value={`${Math.round(wordsPracticed * 0.5)}분`} label="학습 시간(추정)" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
        {sections.map((section) => (
          <section key={section.id} className="rounded-2xl border border-line bg-white p-4">
            <h2 className="text-lg font-bold text-brand-dark">{section.titleKo}</h2>
            <p className="mt-1 text-xs text-muted">{section.descriptionKo}</p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {section.items.map((item) =>
                item.status === 'available' && item.href ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-brand-dark transition-colors hover:bg-chip"
                  >
                    {item.labelKo}
                    <span aria-hidden className="text-brand">
                      →
                    </span>
                  </Link>
                ) : (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-panel px-4 py-3 text-sm text-faint"
                  >
                    {item.labelKo}
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-faint">준비 중</span>
                  </div>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
