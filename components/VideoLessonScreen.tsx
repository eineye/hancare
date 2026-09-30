'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { VideoCue, VideoLesson } from '@/lib/types';
import { getVideoProgress, useVideoStore } from '@/lib/videoStore';
import VideoPlayer, { type VideoPlayerHandle } from './VideoPlayer';
import CaptionBar from './CaptionBar';
import TranscriptList, { formatTime } from './TranscriptList';
import VideoQaPanel, { type AskContext } from './VideoQaPanel';

const RATES = [0.75, 1, 1.25];
const SAVE_INTERVAL_SEC = 2;

function findCueIndex(cues: VideoCue[], t: number): number {
  // 대사 사이 공백 구간에서는 직전 대사를 계속 보여준다(멈췄을 때 "방금 나온 말"을 질문할 수 있게).
  let idx = -1;
  for (let i = 0; i < cues.length; i += 1) {
    if (cues[i].start <= t + 0.05) idx = i;
    else break;
  }
  return idx;
}

export default function VideoLessonScreen({
  video,
  initialTimeSec,
  prevHref,
  nextHref,
}: {
  video: VideoLesson;
  /** /video/[id]?t=12 처럼 특정 시점으로 들어온 경우(단어장 → 영상 장면). 없으면 마지막 시청 위치. */
  initialTimeSec?: number;
  prevHref?: string;
  nextHref?: string;
}) {
  const playerRef = useRef<VideoPlayerHandle>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(video.durationSec);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [loopCueId, setLoopCueId] = useState<string | undefined>();
  const [selected, setSelected] = useState<{ term: string; gloss?: string; cueId?: string } | undefined>();
  const [resumeNotice, setResumeNotice] = useState<string | undefined>();
  const pausedAt = useRef<number | undefined>(undefined);
  const lastSaved = useRef(0);

  const progress = useVideoStore((s) => s.progress);
  const questions = useVideoStore((s) => s.questions[video.id]);
  const savedTerms = useVideoStore((s) => s.savedTerms);
  const savePosition = useVideoStore((s) => s.savePosition);
  const logQuestion = useVideoStore((s) => s.logQuestion);
  const saveTerm = useVideoStore((s) => s.saveTerm);

  const cueIndex = findCueIndex(video.cues, time);
  const currentCue = cueIndex >= 0 ? video.cues[cueIndex] : undefined;
  const askedCueIds = useMemo(() => new Set((questions ?? []).map((q) => q.cueId)), [questions]);

  // 처음 열 때 마지막 시청 위치(또는 ?t=)에서 이어보기
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const start = initialTimeSec ?? getVideoProgress(progress, video.id).lastPositionSec;
    if (start > 1 && start < video.durationSec - 1) {
      playerRef.current?.seek(start);
      setResumeNotice(
        initialTimeSec !== undefined ? `${formatTime(start)} 장면부터 봅니다.` : `지난번 본 ${formatTime(start)}부터 이어봅니다.`,
      );
    }
  }, [initialTimeSec, progress, video.id, video.durationSec]);

  const handleTime = useCallback(
    (t: number) => {
      setTime(t);
      if (Math.abs(t - lastSaved.current) >= SAVE_INTERVAL_SEC) {
        lastSaved.current = t;
        savePosition(video.id, t);
      }
    },
    [savePosition, video.id],
  );

  const handlePlayingChange = useCallback(
    (p: boolean) => {
      setPlaying(p);
      if (p) setResumeNotice(undefined);
      else if (playerRef.current) savePosition(video.id, playerRef.current.getTime());
    },
    [savePosition, video.id],
  );

  // 구간 반복: 선택한 대사 끝에 닿으면 대사 시작으로 되돌린다.
  useEffect(() => {
    if (!loopCueId || !playing) return;
    const cue = video.cues.find((c) => c.id === loopCueId);
    if (cue && time >= cue.end) playerRef.current?.seek(cue.start);
  }, [loopCueId, playing, time, video.cues]);

  // 스페이스바 = 재생/정지 (입력창에서는 무시)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      if (e.code === 'Space') {
        e.preventDefault();
        playerRef.current?.toggle();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function pauseForQuestion() {
    const player = playerRef.current;
    if (!player) return;
    player.pause();
    pausedAt.current = player.getTime();
  }

  function handlePick(term: string, gloss?: string) {
    pauseForQuestion();
    setSelected({ term, gloss, cueId: currentCue?.id });
  }

  function handleAsk(question: string): AskContext {
    pauseForQuestion();
    const atSec = pausedAt.current ?? time;
    const idx = findCueIndex(video.cues, atSec);
    const cue = idx >= 0 ? video.cues[idx] : undefined;
    if (cue) logQuestion(video.id, { cueId: cue.id, question, at: Date.now() });
    return {
      atSec,
      currentCue: cue,
      prevCue: idx > 0 ? video.cues[idx - 1] : undefined,
      nextCue: idx >= 0 && idx < video.cues.length - 1 ? video.cues[idx + 1] : undefined,
    };
  }

  function handleResume() {
    const player = playerRef.current;
    if (!player) return;
    player.seek((pausedAt.current ?? player.getTime()) - 2);
    player.play();
  }

  const selectedCue = video.cues.find((c) => c.id === selected?.cueId) ?? currentCue;
  const termSaved = !!selected && savedTerms.some((t) => t.videoId === video.id && t.hangul === selected.term);

  function handleSaveTerm() {
    if (!selected) return;
    saveTerm({
      hangul: selected.term,
      glossEn: selected.gloss ?? '',
      sentenceKo: selectedCue?.textKo ?? '',
      videoId: video.id,
      videoTitleKo: video.titleKo,
      cueStart: selectedCue?.start ?? 0,
    });
  }

  function seekToCue(cue: VideoCue) {
    playerRef.current?.seek(cue.start);
    setTime(cue.start);
  }

  const shownDuration = duration || video.durationSec;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/video" className="text-xs text-brand hover:underline">
            ← 영상 목록
          </Link>
          <p className="mt-2 text-[11.5px] font-bold tracking-wide text-brand">영상학습 VIDEO · {video.levelTag}</p>
          <h1 className="mt-1.5 text-[24px] font-black tracking-tight text-brand-dark sm:text-[28px]">{video.titleKo}</h1>
          <p className="mt-1 text-sm text-muted">{video.descriptionKo}</p>
        </div>
        <div className="flex gap-2 text-xs">
          {prevHref && (
            <Link href={prevHref} className="rounded-full border border-line bg-white px-3 py-1.5 text-brand-dark hover:bg-panel">
              ← 이전 영상
            </Link>
          )}
          {nextHref && (
            <Link href={nextHref} className="rounded-full border border-line bg-white px-3 py-1.5 text-brand-dark hover:bg-panel">
              다음 영상 →
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-3">
          <VideoPlayer
            ref={playerRef}
            src={video.src}
            poster={video.poster}
            fallbackDurationSec={video.durationSec}
            currentCue={currentCue}
            rate={rate}
            onTime={handleTime}
            onPlayingChange={handlePlayingChange}
            onDuration={setDuration}
          />

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => playerRef.current?.toggle()}
              className="rounded-[10px] bg-brand-dark px-4 py-2 text-sm font-bold text-white"
            >
              {playing ? '⏸ 정지' : '▶ 재생'}
            </button>
            <button
              type="button"
              onClick={() => playerRef.current?.seek(time - 5)}
              className="rounded-[10px] border border-line px-3 py-2 text-xs text-brand-dark hover:bg-panel"
            >
              ⟲ 5초
            </button>
            <button
              type="button"
              onClick={() => currentCue && seekToCue(currentCue)}
              className="rounded-[10px] border border-line px-3 py-2 text-xs text-brand-dark hover:bg-panel"
            >
              이 대사 다시
            </button>
            <button
              type="button"
              onClick={() => setLoopCueId((id) => (id ? undefined : currentCue?.id))}
              className={`rounded-[10px] border px-3 py-2 text-xs ${
                loopCueId ? 'border-warnAccent bg-warnBg text-warn' : 'border-line text-brand-dark hover:bg-panel'
              }`}
            >
              {loopCueId ? '구간 반복 끄기' : '구간 반복'}
            </button>
            <div className="flex overflow-hidden rounded-[10px] border border-line text-xs">
              {RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRate(r)}
                  className={`px-2.5 py-2 ${rate === r ? 'bg-brand-dark text-white' : 'text-brand-dark hover:bg-panel'}`}
                >
                  {r}x
                </button>
              ))}
            </div>
            <span className="ml-auto font-mono text-xs text-muted">
              {formatTime(time)} / {formatTime(shownDuration)}
            </span>
            <input
              type="range"
              min={0}
              max={shownDuration}
              step={0.1}
              value={Math.min(time, shownDuration)}
              onChange={(e) => playerRef.current?.seek(Number(e.target.value))}
              className="w-full accent-[#0E7C66]"
              aria-label="재생 위치"
            />
          </div>

          {resumeNotice && <p className="rounded-xl bg-chip px-4 py-2 text-xs text-brand">{resumeNotice}</p>}

          <CaptionBar cue={currentCue} selectedTerm={selected?.term} onPick={handlePick} />

        </div>

        {/* 모바일에서는 질문 패널이 방금 누른 자막 바로 아래에 오고, 데스크톱에서는 오른쪽 열에 고정된다. */}
        <div className="lg:sticky lg:top-[76px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[calc(100vh-100px)] lg:self-start">
          <VideoQaPanel
            videoTitleKo={video.titleKo}
            selectedTerm={selected?.term}
            selectedGloss={selected?.gloss}
            termSaved={termSaved}
            paused={!playing}
            onClearTerm={() => setSelected(undefined)}
            onAsk={handleAsk}
            onResume={handleResume}
            onSaveTerm={handleSaveTerm}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:col-start-1">
          <TranscriptList
            cues={video.cues}
            currentCueId={currentCue?.id}
            askedCueIds={askedCueIds}
            loopCueId={loopCueId}
            onSeek={seekToCue}
          />

          {video.related && (
            <Link
              href={`/learn/${video.related.unitId}/${video.related.situationId}`}
              className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-brand-dark hover:border-brand"
            >
              관련 학습 · <b>{video.related.labelKo}</b> 에서 발음 연습하기 →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
