'use client';

import { useState } from 'react';
import { useLessonStore } from '@/lib/store';
import { speak } from '@/lib/speech';
import Avatar2D from './Avatar2D';
import type { Sentence } from '@/lib/types';

const STATE_LABEL: Record<string, string> = {
  idle: '대기 중',
  speaking: '● 말하는 중',
  listening: '● 듣는 중',
};

export default function AvatarTeacher({
  sentence,
  onStartConversation,
}: {
  sentence: Sentence;
  onStartConversation: () => void;
}) {
  const avatarState = useLessonStore((s) => s.avatarState);
  const setAvatarState = useLessonStore((s) => s.setAvatarState);
  const lang = useLessonStore((s) => s.lang);
  const [closeup, setCloseup] = useState(false);

  function handleReplay() {
    speak(sentence.textKo, {
      rate: 1,
      onStart: () => setAvatarState('speaking'),
      onEnd: () => setAvatarState('idle'),
    });
  }

  function handleCloseup() {
    setCloseup(true);
    speak(sentence.textKo, {
      rate: 0.5,
      onStart: () => setAvatarState('speaking'),
      onEnd: () => {
        setAvatarState('idle');
        setCloseup(false);
      },
    });
  }

  return (
    <section className="rounded-2xl bg-brand p-4 text-white shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">AI 아바타 선생님</p>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{STATE_LABEL[avatarState]}</span>
      </div>

      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-brand-dark/40">
        <Avatar2D state={avatarState} closeup={closeup} />
      </div>
      <p className="mt-1 text-[10px] text-white/50">
        * 실제 발음 분석이 아닌, 말하는 동안 일정한 리듬으로 음소 그룹별 입모양 중
        하나를 무작위로 보여주는 근사치입니다.
      </p>

      <div className="mt-3 rounded-lg bg-white/10 p-3 text-sm">
        <p className="font-medium">{sentence.textKo}</p>
        <p className="text-xs text-white/70">{sentence.textEn}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button type="button" onClick={handleReplay} className="rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25">
          다시 듣기
        </button>
        <button type="button" onClick={handleCloseup} className="rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25">
          입모양 보기
        </button>
        <button
          type="button"
          onClick={onStartConversation}
          className="rounded-lg bg-white px-3 py-1.5 font-semibold text-brand-dark hover:bg-white/90"
        >
          {lang === 'ko' ? '대화 시작' : 'Start conversation'}
        </button>
      </div>
    </section>
  );
}
