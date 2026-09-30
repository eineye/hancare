'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useLessonStore, useSettingsStore } from '@/lib/store';
import TeacherAvatar, { type TeacherAvatarHandle } from './TeacherAvatar';
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
  const displayLang = useSettingsStore((s) => s.displayLang);
  const speechRate = useSettingsStore((s) => s.speechRate);
  const [closeup, setCloseup] = useState(false);
  const teacherRef = useRef<TeacherAvatarHandle>(null);

  function handleReplay() {
    setCloseup(false);
    teacherRef.current?.speak(sentence.textKo, { rate: speechRate });
  }

  function handleCloseup() {
    setCloseup(true);
    teacherRef.current?.speak(sentence.textKo, { rate: speechRate * 0.5 });
  }

  return (
    <section className="rounded-2xl bg-brand p-4 text-white">
      <div className="mb-3.5 flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-wide text-white/80">AI 아바타 선생님</p>
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs">{STATE_LABEL[avatarState]}</span>
      </div>

      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-brand-dark/40 transition-transform duration-300 motion-reduce:transition-none ${closeup ? 'scale-125' : ''}`}
      >
        <TeacherAvatar
          ref={teacherRef}
          onStart={() => setAvatarState('speaking')}
          onEnd={() => setAvatarState('idle')}
        />
        {avatarState === 'listening' && (
          <div className="pointer-events-none absolute inset-2 rounded-lg ring-2 ring-white/50 motion-safe:animate-pulse" />
        )}
      </div>
      <p className="mt-1.5 text-[10px] text-white/50">
        * 실제 음성 파형을 분석한 것이 아니라, 문장을 초성·중성·종성으로 분해해 만든 입모양
        타임라인을 TTS 음성 재생에 맞춰 보여주는 방식입니다. 브라우저 TTS 특성상 완벽히
        일치하지 않을 수 있습니다.
      </p>

      <div className="mt-3.5 rounded-xl bg-white/10 p-3.5 text-sm">
        <p className="font-medium">{sentence.textKo}</p>
        {displayLang !== 'ko' && <p className="text-xs text-white/70">{sentence.textEn}</p>}
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
          {displayLang === 'ko' ? '이 화면에서 대화' : 'Chat here'}
        </button>
      </div>
    </section>
  );
}
