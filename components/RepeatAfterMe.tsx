'use client';

import { useEffect, useRef, useState } from 'react';
import { useLessonStore, useSettingsStore, useStatsStore } from '@/lib/store';
import { generateFeedback, scoreSentence } from '@/lib/scoring';
import { isSttSupported, speak, startRecognition } from '@/lib/speech';
import type { Sentence } from '@/lib/types';

export default function RepeatAfterMe({ sentence }: { sentence: Sentence }) {
  const recordingState = useLessonStore((s) => s.recordingState);
  const lastScore = useLessonStore((s) => s.lastScore);
  const beginRecording = useLessonStore((s) => s.beginRecording);
  const beginScoring = useLessonStore((s) => s.beginScoring);
  const setResult = useLessonStore((s) => s.setResult);
  const resetRecording = useLessonStore((s) => s.resetRecording);
  const setAvatarState = useLessonStore((s) => s.setAvatarState);
  const recordPractice = useStatsStore((s) => s.recordPractice);
  const speechRate = useSettingsStore((s) => s.speechRate);
  const scoringStrictness = useSettingsStore((s) => s.scoringStrictness);

  const stopFnRef = useRef<(() => void) | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  // 서버 렌더링 시점에는 window가 없어 항상 false다. 하이드레이션 불일치를
  // 피하기 위해 최초 렌더는 false로 고정하고, 마운트 후에만 실제 지원 여부로 갱신한다.
  const [sttSupported, setSttSupported] = useState(false);
  useEffect(() => {
    setSttSupported(isSttSupported());
  }, []);

  function finishWithResult(recognizedText: string) {
    beginScoring();
    // 실제 서비스라면 서버의 발음 채점 API 호출에 해당하는 지연을 흉내낸다.
    setTimeout(() => {
      const score = scoreSentence(sentence, recognizedText);
      const feedback = generateFeedback(sentence, score, scoringStrictness);
      setResult(score, feedback);
      recordPractice(score.overall);
      setAvatarState('idle');
    }, 500);
  }

  function handleToggleRecording() {
    if (recordingState === 'recording') {
      stopFnRef.current?.();
      return;
    }
    setError(undefined);
    resetRecording();
    beginRecording();
    setAvatarState('listening');
    stopFnRef.current = startRecognition({
      onResult: (text) => finishWithResult(text),
      onError: (message) => {
        setError(message);
        resetRecording();
        setAvatarState('idle');
      },
    });
  }

  const highlightFor = (syllable: string, idx: number) => {
    if (recordingState !== 'result' || !lastScore) return undefined;
    return lastScore.perSyllable[idx];
  };

  return (
    <section className="rounded-2xl border border-brand-dark bg-brand-dark p-4 text-white shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-light/80">따라 읽기 · REPEAT AFTER ME</p>
        <div className="flex gap-3 text-xs text-white/60">
          <button
            type="button"
            className="hover:text-white"
            onClick={() => speak(sentence.textKo, { rate: speechRate })}
          >
            ▶ 원어민 발음
          </button>
          <button
            type="button"
            className="hover:text-white"
            onClick={() => speak(sentence.textKo, { rate: speechRate * 0.6 })}
          >
            느리게
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-2xl font-bold sm:text-3xl" aria-label={sentence.textKo}>
        {sentence.syllables.map((syllable, idx) => {
          const scoreInfo = highlightFor(syllable, idx);
          const color = scoreInfo
            ? scoreInfo.score >= 80
              ? 'text-emerald-300'
              : scoreInfo.score >= 60
                ? 'text-amber-300'
                : 'text-rose-300'
            : 'text-white';
          return (
            <span key={`${syllable}-${idx}`} className={`${color} transition-colors`}>
              {syllable}
            </span>
          );
        })}
      </div>
      <p className="mt-1 text-sm text-white/60">
        [{sentence.romanization}] — {sentence.textEn}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggleRecording}
          disabled={!sttSupported || recordingState === 'scoring'}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
            recordingState === 'recording' ? 'bg-rose-500 text-white' : 'bg-brand text-white hover:bg-brand/90'
          }`}
        >
          {recordingState === 'recording' ? '● 녹음 중지' : recordingState === 'scoring' ? '채점 중…' : '🎙 따라 말하기'}
        </button>
        {!sttSupported && (
          <p className="text-xs text-amber-300">이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해보세요.</p>
        )}
        {error && <p className="text-xs text-rose-300">{error}</p>}
      </div>
    </section>
  );
}
