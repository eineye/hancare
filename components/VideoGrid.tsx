'use client';

import Link from 'next/link';
import { getVideoProgress, useVideoStore, watchedPercent } from '@/lib/videoStore';
import type { VideoLesson } from '@/lib/types';
import { formatTime } from './TranscriptList';

const STEPS = [
  { n: '1', title: '영상 보기', body: '자막과 함께 실습 장면 영상을 봅니다.' },
  { n: '2', title: '멈추고 누르기', body: '모르는 단어가 나오면 자막의 단어를 누르세요. 영상이 멈춥니다.' },
  { n: '3', title: 'AI에게 질문', body: '뜻·문법·예문을 바로 설명해 줍니다. 모국어로 물어봐도 돼요.' },
  { n: '4', title: '담고 이어보기', body: '단어장에 담고, 2초 전부터 이어서 봅니다.' },
];

export default function VideoGrid({ videos }: { videos: VideoLesson[] }) {
  const progress = useVideoStore((s) => s.progress);
  const questions = useVideoStore((s) => s.questions);
  const savedTerms = useVideoStore((s) => s.savedTerms);

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <p className="text-[11.5px] font-bold tracking-wide text-brand">영상학습 VIDEO</p>
        <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
          영상 보며 멈추고 질문하기
        </h1>
        <p className="mt-2 text-sm text-muted">
          실습 현장 영상을 보다가 궁금한 표현이 나오면 바로 멈추고 AI 선생님에게 물어보세요. 저장한 표현은 단어장에
          모입니다 ({savedTerms.length}개).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="rounded-2xl border border-line bg-white p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-chip font-mono text-xs font-bold text-brand">
              {s.n}
            </span>
            <p className="mt-2 text-sm font-bold text-brand-dark">{s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{s.body}</p>
          </div>
        ))}
      </div>

      {videos.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
          등록된 영상이 없습니다. <code>content/videos.json</code>을 확인하세요.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => {
            const pct = watchedPercent(getVideoProgress(progress, v.id), v.durationSec);
            const asked = questions[v.id]?.length ?? 0;
            return (
              <Link
                key={v.id}
                href={`/video/${v.id}`}
                className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-4 transition-transform hover:-translate-y-0.5 hover:border-brand"
              >
                <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-brand-dark">
                  {v.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.poster} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="px-4 text-center text-sm font-bold text-white/80">&ldquo;{v.cues[0]?.textKo}&rdquo;</span>
                  )}
                  <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[11px] text-white">
                    {formatTime(v.durationSec)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-faint">{String(v.order).padStart(2, '0')}</span>
                  <span className="rounded-full bg-panel px-2 py-0.5 text-[11px] text-muted">{v.levelTag}</span>
                  <span className="ml-auto text-[11px] text-faint">대사 {v.cues.length}줄</span>
                </div>
                <h3 className="text-sm font-bold leading-snug text-brand-dark">{v.titleKo}</h3>
                <p className="text-xs text-faint">{v.titleEn}</p>
                <div className="mt-auto pt-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-panel">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 flex justify-between text-[11px] text-muted">
                    <span>시청 {pct}%</span>
                    <span>질문 {asked}개</span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
