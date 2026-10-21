'use client';

import { useEffect, useRef } from 'react';
import type { VideoCue } from '@/lib/types';

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function TranscriptList({
  cues,
  currentCueId,
  askedCueIds,
  loopCueId,
  onSeek,
}: {
  cues: VideoCue[];
  currentCueId?: string;
  askedCueIds: Set<string>;
  loopCueId?: string;
  onSeek: (cue: VideoCue) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);

  // 재생 중인 대사가 목록 밖으로 나가지 않게 목록 안에서만 스크롤한다(페이지 전체 스크롤 방지).
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-cue="${currentCueId}"]`);
    if (!list || !el) return;
    const top = el.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + el.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: top - list.clientHeight / 3, behavior: 'smooth' });
    }
  }, [currentCueId]);

  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[11.5px] font-bold tracking-wide text-brand">전체 대사 SCRIPT</p>
        <span className="text-[11px] text-faint">누르면 그 장면으로 이동</span>
      </div>
      <ol ref={listRef} className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
        {cues.map((cue) => {
          const active = cue.id === currentCueId;
          return (
            <li key={cue.id} data-cue={cue.id}>
              <button
                type="button"
                onClick={() => onSeek(cue)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-sm ${
                  active ? 'bg-chip' : 'hover:bg-panel'
                }`}
              >
                <span className="mt-0.5 w-10 flex-none font-mono text-[11px] text-faint">{formatTime(cue.start)}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block ${active ? 'font-bold text-brand-dark' : 'text-brand-dark'}`}>
                    {cue.speakerKo && <span className="mr-1.5 text-[11px] text-muted">{cue.speakerKo}</span>}
                    {cue.textKo}
                  </span>
                  <span className="block text-xs text-faint">{cue.textEn}</span>
                </span>
                <span className="flex flex-none flex-col items-end gap-1">
                  {askedCueIds.has(cue.id) && (
                    <span className="rounded-full bg-chip px-2 py-0.5 text-[10px] font-semibold text-brand">질문함</span>
                  )}
                  {loopCueId === cue.id && (
                    <span className="rounded-full bg-warnBg px-2 py-0.5 text-[10px] font-semibold text-warn">반복</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
