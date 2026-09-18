'use client';

import { useLessonStore } from '@/lib/store';

export default function AIFeedback({
  onFocusPractice,
  onNextSentence,
  hasNextSentence,
}: {
  onFocusPractice: () => void;
  onNextSentence: () => void;
  hasNextSentence: boolean;
}) {
  const lastFeedback = useLessonStore((s) => s.lastFeedback);
  const recordingState = useLessonStore((s) => s.recordingState);

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <p className="mb-3.5 text-[11px] font-bold tracking-wide text-brand">AI 피드백 FEEDBACK</p>

      {recordingState !== 'result' ? (
        <p className="text-sm text-faint">따라 읽기를 완료하면 피드백이 표시됩니다.</p>
      ) : (
        <div className="space-y-2">
          {lastFeedback.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-3.5 text-sm ${
                item.tone === 'warning' ? 'border-warnBorder bg-warnBg text-warn' : 'border-chipBorder bg-chip text-brand'
              }`}
            >
              <p className="font-semibold">{item.titleKo}</p>
              <p className="mt-0.5 text-xs opacity-80">{item.detailKo}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onFocusPractice}
          disabled={recordingState !== 'result'}
          className="flex-1 rounded-[10px] bg-brand-dark px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-30"
        >
          집중 연습
        </button>
        <button
          type="button"
          onClick={onNextSentence}
          disabled={recordingState !== 'result' || !hasNextSentence}
          className="flex-1 rounded-[10px] border border-brand-dark px-3 py-2.5 text-sm font-semibold text-brand-dark disabled:opacity-30"
        >
          다음 문장 →
        </button>
      </div>
    </section>
  );
}
