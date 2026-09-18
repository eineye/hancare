'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLessonStore, useSettingsStore } from '@/lib/store';
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
  roleplayHref,
}: {
  sentence: Sentence;
  onStartConversation: () => void;
  roleplayHref: string;
}) {
  const avatarState = useLessonStore((s) => s.avatarState);
  const setAvatarState = useLessonStore((s) => s.setAvatarState);
  const lang = useLessonStore((s) => s.lang);
  const speechRate = useSettingsStore((s) => s.speechRate);
  const [closeup, setCloseup] = useState(false);

  function handleReplay() {
    speak(sentence.textKo, {
      rate: speechRate,
      onStart: () => setAvatarState('speaking'),
      onEnd: () => setAvatarState('idle'),
    });
  }

  function handleCloseup() {
    setCloseup(true);
    speak(sentence.textKo, {
      rate: speechRate * 0.5,
      onStart: () => setAvatarState('speaking'),
      onEnd: () => {
        setAvatarState('idle');
        setCloseup(false);
      },
    });
  }

  return (
    <section className="rounded-2xl bg-brand p-5 text-white">
      <div className="mb-3.5 flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-wide text-white/80">AI 아바타 선생님</p>
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs">{STATE_LABEL[avatarState]}</span>
      </div>

      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-brand-dark/40">
        <Avatar2D state={avatarState} closeup={closeup} />
      </div>
      <p className="mt-1.5 text-[10px] text-white/50">
        * 실제 발음 분석이 아닌, 말하는 동안 일정한 리듬으로 음소 그룹별 입모양 중
        하나를 무작위로 보여주는 근사치입니다.
      </p>

      <div className="mt-3.5 rounded-xl bg-white/10 p-3.5 text-sm">
        <p className="font-medium">{sentence.textKo}</p>
        <p className="text-xs text-white/70">{sentence.textEn}</p>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2 text-xs">
        <button type="button" onClick={handleReplay} className="rounded-[10px] bg-white/15 px-3.5 py-2 hover:bg-white/25">
          🔁 다시 듣기
        </button>
        <button type="button" onClick={handleCloseup} className="rounded-[10px] bg-white/15 px-3.5 py-2 hover:bg-white/25">
          👄 입모양 보기
        </button>
        <Link
          href={roleplayHref}
          className="rounded-[10px] bg-white px-3.5 py-2 font-semibold text-brand hover:bg-white/90"
        >
          💬 역할극
        </Link>
        <button
          type="button"
          onClick={onStartConversation}
          className="rounded-[10px] border border-white/25 px-3.5 py-2 hover:bg-white/10"
        >
          {lang === 'ko' ? '이 화면에서 대화' : 'Chat here'}
        </button>
      </div>
    </section>
  );
}
