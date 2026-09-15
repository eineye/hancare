'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LessonHeader from './LessonHeader';
import SituationCard from './SituationCard';
import KeyTermsGrid from './KeyTermsGrid';
import RepeatAfterMe from './RepeatAfterMe';
import AvatarTeacher from './AvatarTeacher';
import UserStatsPanel from './UserStatsPanel';
import PronunciationScore from './PronunciationScore';
import AIFeedback from './AIFeedback';
import ChatPanel, { type ChatPanelHandle } from './ChatPanel';
import { useLessonStore } from '@/lib/store';
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

  useEffect(() => {
    resetForSituation();
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
    <div className="min-h-screen bg-surface pb-8">
      <LessonHeader
        unitTitleKo={unit.titleKo}
        unitTitleEn={unit.titleEn}
        current={progress.current}
        total={progress.total}
        onPrev={() => goToSituation(-1)}
        onNext={() => goToSituation(1)}
        canPrev={!!prevHref}
        canNext={!!nextHref}
      />

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <SituationCard situation={situation} />
          <KeyTermsGrid terms={situation.terms} />
          <RepeatAfterMe sentence={sentence} />
        </div>
        <div className="space-y-4">
          <AvatarTeacher sentence={sentence} onStartConversation={handleStartConversation} />
          <UserStatsPanel />
        </div>
      </main>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 lg:grid-cols-3">
        <PronunciationScore />
        <AIFeedback
          onFocusPractice={resetRecording}
          onNextSentence={handleNextSentence}
          hasNextSentence={sentenceIndex + 1 < situation.sentences.length}
        />
        <ChatPanel ref={chatRef} situationTitleKo={situation.titleKo} terms={situation.terms} />
      </section>
    </div>
  );
}
