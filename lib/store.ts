'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChatMessage, FeedbackItem, Lang, ScoreResult } from './types';

// 학습 사이클 상태머신. docs/PROGRAM_DESIGN.md §3.3 참고:
// 상황제시 -> 용어학습 -> 아바타시범 -> 녹음중 -> 채점중 -> 결과표시
// -> (집중연습 -> 녹음중) 또는 (대화학습 -> 결과표시)
export type RecordingState = 'idle' | 'recording' | 'scoring' | 'result';
export type AvatarState = 'idle' | 'speaking' | 'listening';

interface LessonState {
  lang: Lang;
  sentenceIndex: number;
  recordingState: RecordingState;
  avatarState: AvatarState;
  lastScore?: ScoreResult;
  lastFeedback: FeedbackItem[];
  chatMessages: ChatMessage[];
  isChatStreaming: boolean;

  setLang: (lang: Lang) => void;
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
  lang: 'ko',
  sentenceIndex: 0,
  recordingState: 'idle',
  avatarState: 'idle',
  lastScore: undefined,
  lastFeedback: [],
  chatMessages: [],
  isChatStreaming: false,

  setLang: (lang) => set({ lang }),
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
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          // 접근 불가(프라이빗 모드 등) 시 메모리로 대체해 크래시를 막는다.
          const memory = new Map<string, string>();
          return {
            getItem: (key: string) => memory.get(key) ?? null,
            setItem: (key: string, value: string) => {
              memory.set(key, value);
            },
            removeItem: (key: string) => {
              memory.delete(key);
            },
          };
        }
      }),
    },
  ),
);
