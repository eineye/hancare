'use client';

import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import TopBar from '@/components/TopBar';
import { useStatsStore } from '@/lib/store';
import type { CourseSection } from '@/lib/courses';

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-surface p-3 text-center">
      <p className="text-lg font-bold text-brand-dark">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

function CoursesContent({ sections }: { sections: CourseSection[] }) {
  const wordsPracticed = useStatsStore((s) => s.wordsPracticed);
  const accuracySum = useStatsStore((s) => s.accuracySum);
  const accuracyCount = useStatsStore((s) => s.accuracyCount);
  const avgAccuracy = accuracyCount > 0 ? Math.round(accuracySum / accuracyCount) : 0;

  return (
    <div className="min-h-screen bg-surface pb-10">
      <TopBar title="진도관리 · 학습 단계 선택" />

      <main className="mx-auto max-w-4xl space-y-4 p-4">
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand">나의 진도</p>
          <div className="grid grid-cols-3 gap-2">
            <StatTile value={String(wordsPracticed)} label="학습 문장 수" />
            <StatTile value={`${avgAccuracy}%`} label="평균 정확도" />
            <StatTile value={`${Math.round(wordsPracticed * 0.5)}분`} label="학습 시간(추정)" />
          </div>
        </section>

        <p className="px-1 text-sm text-gray-500">배우고 싶은 과정을 선택하세요.</p>

        {sections.map((section) => (
          <section key={section.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-brand-dark">{section.titleKo}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{section.descriptionKo}</p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {section.items.map((item) =>
                item.status === 'available' && item.href ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between rounded-xl border border-brand-dark/10 bg-white px-3 py-2.5 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-light"
                  >
                    {item.labelKo}
                    <span aria-hidden>→</span>
                  </Link>
                ) : (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-black/5 bg-surface px-3 py-2.5 text-sm text-gray-400"
                  >
                    {item.labelKo}
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px]">준비 중</span>
                  </div>
                ),
              )}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

export default function CoursesView({ sections }: { sections: CourseSection[] }) {
  return (
    <AuthGuard role="any">
      <CoursesContent sections={sections} />
    </AuthGuard>
  );
}
