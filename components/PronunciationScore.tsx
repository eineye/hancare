'use client';

import { useLessonStore } from '@/lib/store';

function Bar({ label, value }: { label: string; value: number }) {
  const warn = value < 70;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <span className={`font-bold ${warn ? 'text-warn' : 'text-brand-dark'}`}>{value}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-panel">
        <div className={`h-1.5 rounded-full ${warn ? 'bg-warnAccent' : 'bg-brand'}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function PronunciationScore() {
  const lastScore = useLessonStore((s) => s.lastScore);
  const recordingState = useLessonStore((s) => s.recordingState);

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <p className="mb-3.5 text-[11px] font-bold tracking-wide text-brand">발음 정확도 PRONUNCIATION</p>

      {!lastScore ? (
        <p className="text-sm text-faint">
          {recordingState === 'scoring' ? '채점 중입니다…' : '따라 읽기를 완료하면 결과가 표시됩니다.'}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-brand text-lg font-bold text-brand-dark">
              {lastScore.overall}
              <span className="absolute -bottom-4 text-[10px] font-normal text-faint">점</span>
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
                s.score >= 80 ? 'bg-chip text-brand border-chipBorder' : 'bg-warnBg text-warn border-warnBorder';
              return (
                <span key={`${s.syllable}-${idx}`} className={`rounded-lg border px-2 py-1 text-center text-xs font-semibold ${color}`}>
                  {s.syllable}
                  <br />
                  <span className="font-normal">{s.score}</span>
                </span>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-faint">
            * 실제 음성 채점 모델이 아닌, 음성 인식 결과와 목표 문장을 비교한 텍스트 유사도 근사치입니다.
          </p>
        </>
      )}
    </section>
  );
}
