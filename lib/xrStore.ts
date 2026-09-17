'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeLocalStorage } from './storage';

export interface XrModuleProgress {
  completed: string[];
  submitted: boolean;
}

interface XrProgressState {
  progress: Record<string, XrModuleProgress>;
  markCompleted: (moduleId: string, interactionId: string) => void;
  markSubmitted: (moduleId: string) => void;
}

const EMPTY_PROGRESS: XrModuleProgress = { completed: [], submitted: false };

/** XR실습 완료 현황. docs/XR_MODULE_DESIGN.md §5 상태머신의 completedInteractions/
 * reportSubmitted에 해당. 실제 백엔드 진도관리 전까지는 이 브라우저에만 저장된다. */
export const useXrProgressStore = create<XrProgressState>()(
  persist(
    (set) => ({
      progress: {},
      markCompleted: (moduleId, interactionId) =>
        set((s) => {
          const existing = s.progress[moduleId] ?? EMPTY_PROGRESS;
          if (existing.completed.includes(interactionId)) return s;
          return {
            progress: {
              ...s.progress,
              [moduleId]: { ...existing, completed: [...existing.completed, interactionId] },
            },
          };
        }),
      markSubmitted: (moduleId) =>
        set((s) => ({
          progress: {
            ...s.progress,
            [moduleId]: { ...(s.progress[moduleId] ?? EMPTY_PROGRESS), submitted: true },
          },
        })),
    }),
    {
      name: 'hangulcare-xr-progress',
      storage: createJSONStorage(safeLocalStorage),
    },
  ),
);

export function getModuleProgress(
  progress: Record<string, XrModuleProgress>,
  moduleId: string,
): XrModuleProgress {
  return progress[moduleId] ?? EMPTY_PROGRESS;
}
