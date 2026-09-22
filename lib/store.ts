'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChatMessage, FeedbackItem, JournalEntry, ScoreResult } from './types';
import { safeLocalStorage } from './storage';

// 학습 사이클 상태머신. docs/PROGRAM_DESIGN.md §3.3 참고:
// 상황제시 -> 용어학습 -> 아바타시범 -> 녹음중 -> 채점중 -> 결과표시
// -> (집중연습 -> 녹음중) 또는 (대화학습 -> 결과표시)
export type RecordingState = 'idle' | 'recording' | 'scoring' | 'result';
export type AvatarState = 'idle' | 'speaking' | 'listening';

interface LessonState {
  sentenceIndex: number;
  recordingState: RecordingState;
  avatarState: AvatarState;
  lastScore?: ScoreResult;
  lastFeedback: FeedbackItem[];
  chatMessages: ChatMessage[];
  isChatStreaming: boolean;

  setSentenceIndex: (index: number) => void;
  setAvatarState: (state: AvatarState) => void;
  beginRecording: () => void;
  beginScoring: () => void;
  setResult: (score: ScoreResult, feedback: FeedbackItem[]) => void;
  resetRecording: () => void;
  addChatMessage: (message: ChatMessage) => void;
  appendToMessage: (id: string, chunk: string) => void;
  setChatStreaming: (streaming: boolean) => void;
  resetForSituation: () => void;
}

export const useLessonStore = create<LessonState>((set) => ({
  sentenceIndex: 0,
  recordingState: 'idle',
  avatarState: 'idle',
  lastScore: undefined,
  lastFeedback: [],
  chatMessages: [],
  isChatStreaming: false,

  setSentenceIndex: (index) => set({ sentenceIndex: index, recordingState: 'idle', lastScore: undefined, lastFeedback: [] }),
  setAvatarState: (avatarState) => set({ avatarState }),
  beginRecording: () => set({ recordingState: 'recording' }),
  beginScoring: () => set({ recordingState: 'scoring' }),
  setResult: (lastScore, lastFeedback) => set({ recordingState: 'result', lastScore, lastFeedback }),
  resetRecording: () => set({ recordingState: 'idle', lastScore: undefined, lastFeedback: [] }),
  addChatMessage: (message) => set((s) => ({ chatMessages: [...s.chatMessages, message] })),
  appendToMessage: (id, chunk) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((m) => (m.id === id ? { ...m, content: m.content + chunk } : m)),
    })),
  setChatStreaming: (isChatStreaming) => set({ isChatStreaming }),
  resetForSituation: () =>
    set({ sentenceIndex: 0, recordingState: 'idle', lastScore: undefined, lastFeedback: [], chatMessages: [] }),
}));

interface StatsState {
  wordsPracticed: number;
  accuracySum: number;
  accuracyCount: number;
  practiceSeconds: number;
  recordPractice: (accuracy: number) => void;
  addPracticeSeconds: (seconds: number) => void;
}

/** 사용자 정보/통계 패널(영역 5)용 누적 통계. 실제 백엔드 대신 이 브라우저에만
 * 저장되는 localStorage 기반 값이며, 다른 기기·사용자와 공유되지 않는다. */
export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      wordsPracticed: 0,
      accuracySum: 0,
      accuracyCount: 0,
      practiceSeconds: 0,
      recordPractice: (accuracy) =>
        set((s) => ({
          wordsPracticed: s.wordsPracticed + 1,
          accuracySum: s.accuracySum + accuracy,
          accuracyCount: s.accuracyCount + 1,
        })),
      addPracticeSeconds: (seconds) => set((s) => ({ practiceSeconds: s.practiceSeconds + seconds })),
    }),
    {
      name: 'hangulcare-stats',
      storage: createJSONStorage(safeLocalStorage),
    },
  ),
);

/** 표시 언어. 새 상단바 언어 드롭다운은 시안대로 7개 언어를 보여주지만, 실제
 * 뜻풀이 번역 콘텐츠가 있는 건 한국어/영어뿐이라 그 둘만 실제로 전환된다. */
export type DisplayLang = 'ko' | 'en' | 'mn' | 'vi' | 'fil' | 'my' | 'id';
export const SUPPORTED_DISPLAY_LANGS: DisplayLang[] = ['ko', 'en'];

export type ScoringStrictness = 'beginner' | 'intermediate';

interface SettingsState {
  displayLang: DisplayLang;
  /** 아바타/원어민 발음 재생 속도 배수 (0.5~1.5). RepeatAfterMe·AvatarTeacher가 참조한다. */
  speechRate: number;
  scoringStrictness: ScoringStrictness;
  autoPlayRecording: boolean;
  setDisplayLang: (lang: DisplayLang) => void;
  setSpeechRate: (rate: number) => void;
  setScoringStrictness: (level: ScoringStrictness) => void;
  setAutoPlayRecording: (on: boolean) => void;
}

/** 설정(/settings) 화면의 실제 동작하는 값들. 언어/말하기 속도/채점 엄격도는
 * 실제로 다른 화면에 반영된다 — 알림 토글 등 백엔드가 필요한 항목은 이 스토어에
 * 없고 /settings에서 시각적으로만(목데이터) 표시한다. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      displayLang: 'ko',
      speechRate: 1,
      scoringStrictness: 'beginner',
      autoPlayRecording: true,
      setDisplayLang: (displayLang) => set({ displayLang }),
      setSpeechRate: (speechRate) => set({ speechRate }),
      setScoringStrictness: (scoringStrictness) => set({ scoringStrictness }),
      setAutoPlayRecording: (autoPlayRecording) => set({ autoPlayRecording }),
    }),
    {
      name: 'hangulcare-settings',
      storage: createJSONStorage(safeLocalStorage),
    },
  ),
);

interface JournalState {
  entries: JournalEntry[];
  addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
}

/** 실습 일지(/journal). 이 브라우저에만 저장되는 실제 기록 — 다른 기기·사용자와
 * 공유되지 않는다(실제 서버 저장은 백엔드 도입 후). */
export const useJournalStore = create<JournalState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((s) => ({
          entries: [{ ...entry, id: `journal-${Date.now()}`, createdAt: Date.now() }, ...s.entries],
        })),
    }),
    {
      name: 'hangulcare-journal',
      storage: createJSONStorage(safeLocalStorage),
    },
  ),
);

interface ProgressState {
  lastUnitId?: string;
  lastSituationId?: string;
  setLastSituation: (unitId: string, situationId: string) => void;
}

/** 가장 최근에 연 학습 상황. 사이드바 "이어서 학습"/"역할극 연습" 링크와
 * 홈 화면이 참조한다 — LessonScreen이 마운트될 때 실제로 갱신된다. */
export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      lastUnitId: undefined,
      lastSituationId: undefined,
      setLastSituation: (lastUnitId, lastSituationId) => set({ lastUnitId, lastSituationId }),
    }),
    {
      name: 'hangulcare-progress',
      storage: createJSONStorage(safeLocalStorage),
    },
  ),
);

interface NoticesReadState {
  readIds: string[];
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
}

/** 알림(/notices) 읽음 상태. 알림 목록 자체(lib/noticesMock.ts)는 목데이터지만,
 * "읽었는지"는 이 브라우저에서 실제로 클릭한 결과를 반영한다. */
export const useNoticesReadStore = create<NoticesReadState>()(
  persist(
    (set) => ({
      readIds: [],
      markRead: (id) => set((s) => (s.readIds.includes(id) ? s : { readIds: [...s.readIds, id] })),
      markAllRead: (ids) => set({ readIds: ids }),
    }),
    {
      name: 'hangulcare-notices-read',
      storage: createJSONStorage(safeLocalStorage),
    },
  ),
);

interface PracticedTermsState {
  practicedTermIds: string[];
  markPracticed: (termId: string) => void;
}

/** 단어장(/vocab)의 "학습함" 구분에 쓰는 실제 기록 — 학습 화면에서 용어 발음을
 * 들으면 그 용어 id가 여기 쌓인다. 점수화된 숙련도가 아니라 "들어봤는지"만
 * 구분하는 단순한 실제 신호다. */
export const usePracticedTermsStore = create<PracticedTermsState>()(
  persist(
    (set) => ({
      practicedTermIds: [],
      markPracticed: (termId) =>
        set((s) => (s.practicedTermIds.includes(termId) ? s : { practicedTermIds: [...s.practicedTermIds, termId] })),
    }),
    {
      name: 'hangulcare-practiced-terms',
      storage: createJSONStorage(safeLocalStorage),
    },
  ),
);
