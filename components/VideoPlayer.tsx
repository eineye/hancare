'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { VideoCue } from '@/lib/types';

export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (sec: number) => void;
  getTime: () => number;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  /** content/videos.json의 durationSec. 영상 파일이 없을 때(자막 연습 모드) 재생 길이로 쓴다. */
  fallbackDurationSec: number;
  currentCue?: VideoCue;
  rate: number;
  onTime: (sec: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onDuration: (sec: number) => void;
}

const TICK_MS = 100;

/** 자체 MP4를 HTML5 <video>로 재생한다. src가 비었거나 파일을 불러오지 못하면
 * "자막 연습 모드"로 바꿔 가상 타이머로 자막만 흘려보낸다 — 영상 파일이 아직
 * 준비되지 않아도 멈추고 질문하기 흐름 전체를 쓸 수 있게 하기 위함이다. */
const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ src, poster, fallbackDurationSec, currentCue, rate, onTime, onPlayingChange, onDuration }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [captionMode, setCaptionMode] = useState(!src);
    const [clockPlaying, setClockPlaying] = useState(false);
    const clockTime = useRef(0);
    // 영상 모드에서 마지막으로 알려진 위치. 재생 실패로 자막 연습 모드로 바뀔 때 이어받는다.
    const lastKnownTime = useRef(0);

    // 자막 연습 모드용 가상 시계
    useEffect(() => {
      if (!captionMode || !clockPlaying) return;
      const id = setInterval(() => {
        const next = Math.min(fallbackDurationSec, clockTime.current + (TICK_MS / 1000) * rate);
        clockTime.current = next;
        onTime(next);
        if (next >= fallbackDurationSec) {
          setClockPlaying(false);
          onPlayingChange(false);
        }
      }, TICK_MS);
      return () => clearInterval(id);
    }, [captionMode, clockPlaying, fallbackDurationSec, rate, onTime, onPlayingChange]);

    useEffect(() => {
      if (captionMode) onDuration(fallbackDurationSec);
    }, [captionMode, fallbackDurationSec, onDuration]);

    useEffect(() => {
      if (videoRef.current) videoRef.current.playbackRate = rate;
    }, [rate, captionMode]);

    const play = useCallback(() => {
      if (captionMode) {
        if (clockTime.current >= fallbackDurationSec) clockTime.current = 0;
        setClockPlaying(true);
        onPlayingChange(true);
      } else {
        void videoRef.current?.play().catch(() => undefined);
      }
    }, [captionMode, fallbackDurationSec, onPlayingChange]);

    const pause = useCallback(() => {
      if (captionMode) {
        setClockPlaying(false);
        onPlayingChange(false);
      } else {
        videoRef.current?.pause();
      }
    }, [captionMode, onPlayingChange]);

    const getTime = useCallback(
      () => (captionMode ? clockTime.current : (videoRef.current?.currentTime ?? 0)),
      [captionMode],
    );

    const seek = useCallback(
      (sec: number) => {
        const t = Math.max(0, sec);
        if (captionMode) {
          clockTime.current = Math.min(t, fallbackDurationSec);
          onTime(clockTime.current);
        } else if (videoRef.current) {
          videoRef.current.currentTime = t;
          lastKnownTime.current = t;
          onTime(t);
        }
      },
      [captionMode, fallbackDurationSec, onTime],
    );

    const isPlaying = useCallback(
      () => (captionMode ? clockPlaying : !!videoRef.current && !videoRef.current.paused),
      [captionMode, clockPlaying],
    );

    useImperativeHandle(
      ref,
      () => ({
        play,
        pause,
        seek,
        getTime,
        toggle: () => (isPlaying() ? pause() : play()),
      }),
      [play, pause, seek, getTime, isPlaying],
    );

    if (captionMode) {
      return (
        <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-brand-dark p-6 text-center text-white">
          <span className="absolute left-3 top-3 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/70">
            자막 연습 모드 · 영상 파일 없음
          </span>
          {currentCue ? (
            <>
              {currentCue.speakerKo && <p className="text-xs text-brand-light">{currentCue.speakerKo}</p>}
              <p className="mt-2 text-xl font-bold leading-snug sm:text-2xl">{currentCue.textKo}</p>
              <p className="mt-2 text-sm text-white/60">{currentCue.textEn}</p>
            </>
          ) : (
            <p className="text-sm text-white/60">▶ 재생을 누르면 대사가 시간에 맞춰 흘러갑니다.</p>
          )}
          <p className="absolute bottom-3 left-0 right-0 text-[11px] text-white/40">
            {src ? `${src} 파일을 불러오지 못했습니다.` : '영상 경로(src)가 비어 있습니다.'} public/videos/README.md 참고
          </p>
        </div>
      );
    }

    return (
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        playsInline
        preload="metadata"
        className="aspect-video w-full rounded-2xl bg-black"
        onTimeUpdate={(e) => {
          lastKnownTime.current = e.currentTarget.currentTime;
          onTime(e.currentTarget.currentTime);
        }}
        onPlay={() => onPlayingChange(true)}
        onPause={() => onPlayingChange(false)}
        onEnded={() => onPlayingChange(false)}
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = rate;
          if (Number.isFinite(e.currentTarget.duration)) onDuration(e.currentTarget.duration);
        }}
        onError={() => {
          clockTime.current = Math.min(lastKnownTime.current, fallbackDurationSec);
          setCaptionMode(true);
          onPlayingChange(false);
        }}
        onClick={() => (isPlaying() ? pause() : play())}
      />
    );
  },
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
