'use client';

import type { Learner, Unit } from '@/lib/types';

const WEEKDAYS = ['1주', '2주', '3주', '4주', '5주', '6주'];

function StatTile({ value, label, warn }: { value: string; label: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3.5">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1.5 text-xl font-black ${warn ? 'text-warn' : 'text-brand-dark'}`}>{value}</p>
    </div>
  );
}

export default function LearnerDetailModal({
  learner,
  units,
  onClose,
}: {
  learner: Learner;
  units: Unit[];
  onClose: () => void;
}) {
  const totalSituations = units.reduce((sum, u) => sum + u.situations.length, 0);
  const completedCount = learner.completedSituationIds.length;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-brand">실습생 세부현황</p>
            <h2 className="mt-1.5 text-xl font-black text-brand-dark">{learner.name}</h2>
            <p className="mt-1 text-xs text-muted">
              {learner.nationality} · {learner.level} · {learner.department} · 최근 학습 {learner.lastActiveKo}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-muted hover:bg-panel"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="rounded-xl bg-panel px-3.5 py-2.5 text-xs leading-relaxed text-muted">
            이 세부현황은 실제 다중 사용자 백엔드가 없어 데모용 목데이터입니다(진도관리 화면 전체와 동일). 실제
            서비스에서는 이 실습생 본인 계정에 쌓인 실제 학습 기록을 표시합니다.
          </p>

          {learner.needsAttentionKo && (
            <div className="mt-3.5 rounded-xl border border-warnBorder bg-warnBg p-3.5">
              <p className="text-xs font-bold text-warn">⚠ 주의가 필요합니다</p>
              <p className="mt-1 text-xs leading-relaxed text-warn">{learner.needsAttentionKo}</p>
            </div>
          )}

          <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatTile value={String(learner.avgAccuracy)} label="평균 발음 정확도" warn={learner.avgAccuracy < 70} />
            <StatTile value={String(learner.wordsPracticed)} label="누적 학습 문장 수" />
            <StatTile value={`${Math.round(learner.wordsPracticed * 0.5)}분`} label="학습 시간(추정)" />
            <StatTile value={`${completedCount}/${totalSituations}`} label="완료 상황" />
          </div>

          <div className="mt-3.5 rounded-2xl border border-line p-4">
            <p className="mb-4 text-[11px] font-bold tracking-wide text-brand">주차별 평균 점수 (예시)</p>
            <div className="flex h-[110px] items-end gap-2.5">
              {learner.weeklyScores.map((v, i) => (
                <div key={WEEKDAYS[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <div
                    className={`w-full rounded-t-[5px] ${v >= 85 ? 'bg-brand' : 'bg-chipBorder'}`}
                    style={{ height: `${v}%` }}
                  />
                  <span className="text-[10.5px] text-faint">{WEEKDAYS[i]}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10.5px] text-faint">* 주차별 이력은 저장하지 않아 예시 그래프입니다.</p>
          </div>

          <div className="mt-3.5 rounded-2xl border border-line p-4">
            <p className="mb-4 text-[11px] font-bold tracking-wide text-brand">약한 발음 요소 (예시)</p>
            <div className="flex flex-col gap-3">
              {learner.weakSounds.map((s) => (
                <div key={s.labelKo}>
                  <div className="mb-1.5 flex justify-between text-[12.5px]">
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
            <p className="mt-3 text-[10.5px] text-faint">* 음소 단위 분석은 하지 않아 예시 값입니다.</p>
          </div>

          <div className="mt-3.5 rounded-2xl border border-line p-4">
            <p className="mb-3.5 text-[11px] font-bold tracking-wide text-brand">학습한 내용</p>
            <div className="flex flex-col gap-3.5">
              {units.map((unit) => (
                <div key={unit.id}>
                  <p className="text-xs font-bold text-brand-dark">{unit.titleKo}</p>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {unit.situations.map((situation) => {
                      const done = learner.completedSituationIds.includes(situation.id);
                      return (
                        <div
                          key={situation.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-panel px-3 py-2 text-[12.5px]"
                        >
                          <span className={done ? 'text-brand-dark' : 'text-muted'}>{situation.menuLabelKo}</span>
                          <span className={`text-[11px] font-bold ${done ? 'text-brand' : 'text-faint'}`}>
                            {done ? '완료' : '미완료'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
