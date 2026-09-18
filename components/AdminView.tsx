'use client';

import Link from 'next/link';
import learnersData from '@/data/learners.json';
import type { Learner } from '@/lib/types';
import type { CourseSection } from '@/lib/courses';

const learners = learnersData as Learner[];

function StatTile({ value, label, hint, warn }: { value: string; label: string; hint?: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-[28px] font-black text-brand-dark">{value}</p>
      {hint && <p className={`mt-1.5 text-xs ${warn ? 'text-warn' : 'text-muted'}`}>{hint}</p>}
    </div>
  );
}

export default function AdminView({ sections }: { sections: CourseSection[] }) {
  const totalLearners = learners.length;
  const avgAccuracy = Math.round(learners.reduce((sum, l) => sum + l.avgAccuracy, 0) / totalLearners);
  const totalWords = learners.reduce((sum, l) => sum + l.wordsPracticed, 0);
  const attentionNeeded = learners.filter((l) => l.needsAttentionKo);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11.5px] font-bold tracking-wide text-brand">기관 관리자 ADMIN</p>
          <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
            실습생 {totalLearners}명 진도관리
          </h1>
          <p className="mt-2 text-sm text-muted">
            아래 학습자 목록은 실제 사용자 데이터가 아닌 데모용 목데이터입니다.
          </p>
        </div>
        <Link
          href="/admin/alerts"
          className="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium text-brand-dark hover:bg-panel"
        >
          알림 및 면담
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatTile value={String(totalLearners)} label="전체 실습생" />
        <StatTile value={`${avgAccuracy}%`} label="평균 발음 정확도" />
        <StatTile value={String(totalWords)} label="누적 학습 문장 수" />
        <StatTile value={String(attentionNeeded.length)} label="주의가 필요한 실습생" warn hint="확인 필요" />
      </div>

      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="min-w-0 flex-[1_1_520px] overflow-x-auto rounded-2xl border border-line bg-white p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-brand">실습생 현황</p>
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11.5px] text-faint">
                <th className="py-2 font-medium">실습생</th>
                <th className="py-2 font-medium">부서</th>
                <th className="py-2 font-medium">평균 발음</th>
                <th className="py-2 font-medium">최근 학습</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="py-3 font-medium text-brand-dark">
                    {l.name}
                    <div className="text-[11.5px] font-normal text-muted">
                      {l.nationality} · {l.level}
                    </div>
                  </td>
                  <td className="py-3 text-muted">{l.department}</td>
                  <td className={`py-3 font-bold ${l.avgAccuracy < 70 ? 'text-warn' : 'text-brand-dark'}`}>
                    {l.avgAccuracy}
                  </td>
                  <td className={`py-3 ${l.lastActiveKo.includes('일 전') ? 'text-warn' : 'text-muted'}`}>
                    {l.lastActiveKo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] max-w-[360px] flex-col gap-4">
          <div className="rounded-2xl bg-brand-dark p-5 text-white">
            <p className="text-[11px] font-bold tracking-wide text-brand-light">주의가 필요한 실습생</p>
            <div className="mt-4 flex flex-col gap-3">
              {attentionNeeded.length === 0 && <p className="text-[12.5px] text-white/70">현재 없습니다.</p>}
              {attentionNeeded.map((l) => (
                <div key={l.id} className="rounded-xl bg-white/10 p-3.5">
                  <p className="text-sm font-bold">{l.name}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/70">{l.needsAttentionKo}</p>
                </div>
              ))}
            </div>
            <Link
              href="/admin/alerts"
              className="mt-4 block rounded-[10px] bg-white py-2.5 text-center text-[13px] font-bold text-brand"
            >
              면담 예약하기
            </Link>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">코스 구성</p>
            <div className="flex flex-col gap-2.5">
              {sections.map((section) => (
                <div key={section.id} className="rounded-xl border border-line p-3">
                  <p className="text-sm font-semibold text-brand-dark">{section.titleKo}</p>
                  <p className="mt-1 text-xs text-muted">
                    {section.items.filter((i) => i.status === 'available').length}/{section.items.length}개 콘텐츠 준비됨
                  </p>
                </div>
              ))}
            </div>
            <Link href="/courses" className="mt-3 block text-xs font-medium text-brand hover:underline">
              학습자 화면 미리보기 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
