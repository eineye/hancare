'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SituationCard from './SituationCard';
import KeyTermsGrid from './KeyTermsGrid';
import RepeatAfterMe from './RepeatAfterMe';
import AvatarTeacher from './AvatarTeacher';
import PronunciationScore from './PronunciationScore';
import AIFeedback from './AIFeedback';
import ChatPanel, { type ChatPanelHandle } from './ChatPanel';
import { useLessonStore, useProgressStore } from '@/lib/store';
import type { Situation, Unit } from '@/lib/types';

interface LessonScreenProps {
  unit: Unit;
  situation: Situation;
  /** 이전/다음 상황 경로. 서버(app/learn/.../page.tsx)에서 콘텐츠를 읽어 미리 계산해 넘겨준다. */
  prevHref?: string;
  nextHref?: string;
  progress: { current: number; total: number };
}

export default function LessonScreen({ unit, situation, prevHref, nextHref, progress }: LessonScreenProps) {
  const router = useRouter();
  const chatRef = useRef<ChatPanelHandle>(null);

  const sentenceIndex = useLessonStore((s) => s.sentenceIndex);
  const setSentenceIndex = useLessonStore((s) => s.setSentenceIndex);
  const resetRecording = useLessonStore((s) => s.resetRecording);
  const resetForSituation = useLessonStore((s) => s.resetForSituation);
  const setLastSituation = useProgressStore((s) => s.setLastSituation);

  useEffect(() => {
    resetForSituation();
    setLastSituation(unit.id, situation.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [situation.id]);

  const sentence = situation.sentences[Math.min(sentenceIndex, situation.sentences.length - 1)];

  function goToSituation(direction: 1 | -1) {
    const href = direction === 1 ? nextHref : prevHref;
    if (href) router.push(href);
  }

  function handleStartConversation() {
    document.getElementById('chat-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    chatRef.current?.startRoleplay();
  }

  function handleNextSentence() {
    if (sentenceIndex + 1 < situation.sentences.length) {
      setSentenceIndex(sentenceIndex + 1);
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <Link href="/courses" className="inline-block w-fit text-xs font-medium text-brand hover:underline">
        ← 커리큘럼으로
      </Link>

      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="min-w-0 flex-[1_1_520px] space-y-4">
          <SituationCard
            situation={situation}
            current={progress.current}
            total={progress.total}
            onPrev={() => goToSituation(-1)}
            onNext={() => goToSituation(1)}
            canPrev={!!prevHref}
            canNext={!!nextHref}
          />
          <KeyTermsGrid terms={situation.terms} />
          <RepeatAfterMe sentence={sentence} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PronunciationScore />
            <AIFeedback
              onFocusPractice={resetRecording}
              onNextSentence={handleNextSentence}
              hasNextSentence={sentenceIndex + 1 < situation.sentences.length}
            />
          </div>
        </div>

        <div className="min-w-0 flex-[1_1_320px] max-w-[400px] space-y-4">
          <AvatarTeacher
            sentence={sentence}
            onStartConversation={handleStartConversation}
            roleplayHref={`/roleplay/${unit.id}/${situation.id}`}
          />
          <ChatPanel ref={chatRef} situationTitleKo={situation.titleKo} terms={situation.terms} />
        </div>
      </div>
    </div>
  );
}
