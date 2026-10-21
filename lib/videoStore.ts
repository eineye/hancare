'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeLocalStorage } from './storage';

export interface VideoWatchProgress {
  lastPositionSec: number;
  /** 지금까지 도달한 가장 먼 재생 위치. 완료율 계산에 쓴다. */
  maxPositionSec: number;
}

export interface VideoQuestionLog {
  cueId: string;
  question: string;
  at: number;
}

/** 영상 자막에서 "단어장에 담기"로 저장한 표현. /vocab 화면에 따로 모아 보여준다. */
export interface SavedVideoTerm {
  id: string;
  hangul: string;
  glossEn: string;
  sentenceKo: string;
  videoId: string;
  videoTitleKo: string;
  cueStart: number;
  savedAt: number;
}

interface VideoState {
  progress: Record<string, VideoWatchProgress>;
  questions: Record<string, VideoQuestionLog[]>;
  savedTerms: SavedVideoTerm[];
  savePosition: (videoId: string, sec: number) => void;
  logQuestion: (videoId: string, log: VideoQuestionLog) => void;
  saveTerm: (term: Omit<SavedVideoTerm, 'id' | 'savedAt'>) => void;
  removeTerm: (id: string) => void;
}

const EMPTY_PROGRESS: VideoWatchProgress = { lastPositionSec: 0, maxPositionSec: 0 };

/** 영상학습 시청 위치·질문 기록·저장 표현. docs/VIDEO_MODULE_DESIGN.md §7 참고.
 * 실제 백엔드 연동 전까지는 이 브라우저에만 저장된다. */
export const useVideoStore = create<VideoState>()(
  persist(
    (set) => ({
      progress: {},
      questions: {},
      savedTerms: [],
      savePosition: (videoId, sec) =>
        set((s) => {
          const existing = s.progress[videoId] ?? EMPTY_PROGRESS;
          return {
            progress: {
              ...s.progress,
              [videoId]: { lastPositionSec: sec, maxPositionSec: Math.max(existing.maxPositionSec, sec) },
            },
          };
        }),
      logQuestion: (videoId, log) =>
        set((s) => ({ questions: { ...s.questions, [videoId]: [...(s.questions[videoId] ?? []), log] } })),
      saveTerm: (term) =>
        set((s) => {
          if (s.savedTerms.some((t) => t.hangul === term.hangul && t.videoId === term.videoId)) return s;
          return {
            savedTerms: [{ ...term, id: `${term.videoId}:${term.hangul}`, savedAt: Date.now() }, ...s.savedTerms],
          };
        }),
      removeTerm: (id) => set((s) => ({ savedTerms: s.savedTerms.filter((t) => t.id !== id) })),
    }),
    {
      name: 'hangulcare-video',
      storage: createJSONStorage(safeLocalStorage),
    },
  ),
);

export function getVideoProgress(
  progress: Record<string, VideoWatchProgress>,
  videoId: string,
): VideoWatchProgress {
  return progress[videoId] ?? EMPTY_PROGRESS;
}

export function watchedPercent(p: VideoWatchProgress, durationSec: number): number {
  if (durationSec <= 0) return 0;
  return Math.min(100, Math.round((p.maxPositionSec / durationSec) * 100));
}
