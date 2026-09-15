'use client';

import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import TopBar from '@/components/TopBar';
import learnersData from '@/data/learners.json';
import type { Learner } from '@/lib/types';
import type { CourseSection } from '@/lib/courses';

const learners = learnersData as Learner[];

function AdminContent({ sections }: { sections: CourseSection[] }) {
  const totalLearners = learners.length;
  const avgAccuracy = Math.round(learners.reduce((sum, l) => sum + l.avgAccuracy, 0) / totalLearners);
  const totalWords = learners.reduce((sum, l) => sum + l.wordsPracticed, 0);

  return (
    <div className="min-h-screen bg-surface pb-10">
      <TopBar title="관리자 · 진도관리" />

      <main className="mx-auto max-w-5xl space-y-4 p-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          아래 학습자 목록은 실제 사용자 데이터가 아닌 데모용 목데이터입니다. 실제 다중 사용자 진도 관리는
          백엔드(docs/PROGRAM_DESIGN.md §4 User/Session Service) 구축 후 연동됩니다.
        </div>

        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-brand-dark">{totalLearners}</p>
            <p className="text-xs text-gray-500">전체 학습자</p>
          </div>
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-brand-dark">{avgAccuracy}%</p>
            <p className="text-xs text-gray-500">평균 정확도</p>
          </div>
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-brand-dark">{totalWords}</p>
            <p className="text-xs text-gray-500">누적 학습 문장 수</p>
          </div>
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand">학습자 목록</p>
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs text-gray-400">
                <th className="py-2 font-medium">이름</th>
                <th className="py-2 font-medium">국적</th>
                <th className="py-2 font-medium">TOPIK</th>
                <th className="py-2 font-medium">학습 문장 수</th>
                <th className="py-2 font-medium">평균 정확도</th>
                <th className="py-2 font-medium">최근 학습</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((l) => (
                <tr key={l.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2 font-medium text-brand-dark">{l.name}</td>
                  <td className="py-2 text-gray-600">{l.nationality}</td>
                  <td className="py-2 text-gray-600">{l.level}</td>
                  <td className="py-2 text-gray-600">{l.wordsPracticed}</td>
                  <td className="py-2 text-gray-600">{l.avgAccuracy}%</td>
                  <td className="py-2 text-gray-600">{l.lastActiveKo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">코스 구성</p>
            <Link href="/courses" className="text-xs font-medium text-brand hover:underline">
              학습자 화면 미리보기 →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {sections.map((section) => (
              <div key={section.id} className="rounded-xl border border-black/5 p-3">
                <p className="text-sm font-semibold text-brand-dark">{section.titleKo}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {section.items.filter((i) => i.status === 'available').length}/{section.items.length}개 콘텐츠 준비됨
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function AdminView({ sections }: { sections: CourseSection[] }) {
  return (
    <AuthGuard role="admin">
      <AdminContent sections={sections} />
    </AuthGuard>
  );
}
