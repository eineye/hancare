'use client';

import { useLessonStore } from '@/lib/store';

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="font-semibold text-brand-dark">{value}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-surface">
        <div className="h-1.5 rounded-full bg-brand" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function PronunciationScore() {
  const lastScore = useLessonStore((s) => s.lastScore);
  const recordingState = useLessonStore((s) => s.recordingState);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand">발음 정확도 PRONUNCIATION</p>

      {!lastScore ? (
        <p className="text-sm text-gray-400">
          {recordingState === 'scoring' ? '채점 중입니다…' : '따라 읽기를 완료하면 결과가 표시됩니다.'}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-brand text-lg font-bold text-brand-dark">
              {lastScore.overall}
              <span className="absolute -bottom-4 text-[10px] font-normal text-gray-400">점</span>
            </div>
            <div className="flex-1 space-y-2">
              <Bar label="정확도 Accuracy" value={lastScore.accuracy} />
              <Bar label="유창성 Fluency" value={lastScore.fluency} />
              <Bar label="억양 Intonation" value={lastScore.intonation} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {lastScore.perSyllable.map((s, idx) => {
              const color =
                s.score >= 80
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : s.score >= 60
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200';
              return (
                <span key={`${s.syllable}-${idx}`} className={`rounded-lg border px-2 py-1 text-center text-xs font-semibold ${color}`}>
                  {s.syllable}
                  <br />
                  <span className="font-normal">{s.score}</span>
                </span>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">
            * 실제 음성 채점 모델이 아닌, 음성 인식 결과와 목표 문장을 비교한 텍스트 유사도 근사치입니다.
          </p>
        </>
      )}
    </section>
  );
}
