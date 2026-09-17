'use client';

import { useStatsStore } from '@/lib/store';

// 실제 로그인/실습기관 연동 전 단계의 프로토타입이므로 프로필은 데모용 고정값을
// 사용하고, 학습 통계(단어 수·정확도)만 이 브라우저의 실제 연습 기록을 반영한다.
const DEMO_PROFILE = {
  name: 'Maria Santos',
  meta: '필리핀 · 간호조무 실습 3기 · TOPIK 2급',
};

export default function UserStatsPanel() {
  const wordsPracticed = useStatsStore((s) => s.wordsPracticed);
  const accuracySum = useStatsStore((s) => s.accuracySum);
  const accuracyCount = useStatsStore((s) => s.accuracyCount);

  const avgAccuracy = accuracyCount > 0 ? Math.round(accuracySum / accuracyCount) : 0;
  const estimatedMinutes = Math.round(wordsPracticed * 0.5);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-light text-sm font-bold text-brand-dark">
          {DEMO_PROFILE.name
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-dark">{DEMO_PROFILE.name}</p>
          <p className="text-xs text-gray-500">{DEMO_PROFILE.meta}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface p-2">
          <p className="text-lg font-bold text-brand-dark">{wordsPracticed}</p>
          <p className="text-[11px] text-gray-500">학습 문장 수</p>
        </div>
        <div className="rounded-lg bg-surface p-2">
          <p className="text-lg font-bold text-brand-dark">{avgAccuracy}%</p>
          <p className="text-[11px] text-gray-500">평균 정확도</p>
        </div>
        <div className="rounded-lg bg-surface p-2">
          <p className="text-lg font-bold text-brand-dark">{estimatedMinutes}분</p>
          <p className="text-[11px] text-gray-500">학습 시간(추정)</p>
        </div>
      </div>
    </section>
  );
}
