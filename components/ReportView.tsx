'use client';

import { usePracticedTermsStore, useStatsStore } from '@/lib/store';

interface UnitSummary {
  id: string;
  titleKo: string;
  termIds: string[];
}

const WEEKDAYS = ['1주', '2주', '3주', '4주', '5주', '6주'];
// 요일·주차별 이력은 아직 저장하지 않아(누적치만 있음) 시안과 같은 형태의 예시 막대다.
const MOCK_WEEKLY_SCORES = [58, 64, 68, 73, 79, 87];
const MOCK_WEAK_SOUNDS = [
  { labelKo: '모음 ㅐ / ㅔ 구분', value: 61, warn: true },
  { labelKo: '받침 ㄺ / ㄼ', value: 64, warn: true },
  { labelKo: '경음 ㄲ / ㄸ', value: 78, warn: false },
  { labelKo: '문장 억양', value: 72, warn: false },
];

function StatTile({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-brand-dark">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-brand">{hint}</p>}
    </div>
  );
}

export default function ReportView({ units }: { units: UnitSummary[] }) {
  const wordsPracticed = useStatsStore((s) => s.wordsPracticed);
  const accuracySum = useStatsStore((s) => s.accuracySum);
  const accuracyCount = useStatsStore((s) => s.accuracyCount);
  const practicedTermIds = usePracticedTermsStore((s) => s.practicedTermIds);

  const avgAccuracy = accuracyCount > 0 ? Math.round(accuracySum / accuracyCount) : 0;
  const estimatedMinutes = Math.round(wordsPracticed * 0.5);

  const unitRows = units.map((unit) => {
    const total = unit.termIds.length;
    const learned = unit.termIds.filter((id) => practicedTermIds.includes(id)).length;
    return { ...unit, total, learned, pct: total > 0 ? Math.round((learned / total) * 100) : 0 };
  });
  const completedUnits = unitRows.filter((u) => u.total > 0 && u.learned === u.total).length;

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <p className="text-[11.5px] font-bold tracking-wide text-brand">발음 리포트 REPORT</p>
        <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
          내 학습 기록
        </h1>
        <p className="mt-2 text-sm text-muted">이 브라우저에 쌓인 실제 연습 기록을 기준으로 계산합니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatTile value={`${avgAccuracy}`} label="평균 발음 점수" hint="/ 100" />
        <StatTile value={`${completedUnits}/${units.length}`} label="완료 유닛" hint="모든 용어를 들어본 유닛" />
        <StatTile value={`${estimatedMinutes}분`} label="학습 시간(추정)" />
        <StatTile value={String(wordsPracticed)} label="연습 문장 수" />
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="mb-5 text-[11.5px] font-bold tracking-wide text-brand">주차별 평균 점수 (예시)</p>
          <div className="flex h-[150px] items-end gap-3">
            {MOCK_WEEKLY_SCORES.map((v, i) => (
              <div key={WEEKDAYS[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className={`w-full rounded-t-[6px] ${v >= 85 ? 'bg-brand' : 'bg-chipBorder'}`} style={{ height: `${v}%` }} />
                <span className="text-[11px] text-faint">{WEEKDAYS[i]}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-faint">* 주차별 이력은 아직 저장하지 않아 예시 그래프입니다.</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="mb-5 text-[11.5px] font-bold tracking-wide text-brand">약한 발음 요소 (예시)</p>
          <div className="flex flex-col gap-3.5">
            {MOCK_WEAK_SOUNDS.map((s) => (
              <div key={s.labelKo}>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="text-brand-dark">{s.labelKo}</span>
                  <span className={`font-bold ${s.warn ? 'text-warn' : 'text-brand-dark'}`}>{s.value}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-panel">
                  <div
                    className={`h-1.5 rounded-full ${s.warn ? 'bg-warnAccent' : 'bg-brand'}`}
                    style={{ width: `${s.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-faint">
            * 음소 단위 분석은 아직 하지 않아 예시 값입니다. 실제 채점은 텍스트 유사도 근사치입니다.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="mb-4 text-[11.5px] font-bold tracking-wide text-brand">유닛별 용어 학습 현황</p>
        <div className="flex flex-col">
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 border-b border-line py-2.5 text-[11.5px] text-faint">
            <span>유닛</span>
            <span>학습한 용어</span>
            <span>진행률</span>
          </div>
          {unitRows.map((u) => (
            <div key={u.id} className="grid grid-cols-[2fr_1fr_1fr] items-center gap-3 border-b border-line py-3.5 text-sm last:border-0">
              <span className="text-brand-dark">{u.titleKo}</span>
              <span className="text-muted">
                {u.learned}/{u.total}
              </span>
              <span className={`font-bold ${u.pct === 100 ? 'text-brand' : 'text-brand-dark'}`}>{u.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
