'use client';

import { pcm16ToWavBlob } from './pcmAudio';

// 학습 음성(TTS): 기본값은 Gemini 2.5 TTS(서버 /api/tts, 관리자가
// /admin/voice-settings에서 고른 음색)로 실제 합성 음성을 재생한다. 서버에
// GEMINI_API_KEY가 없거나 호출이 실패하면 브라우저 내장 Web Speech API로 자동
// 대체된다 — docs/PROGRAM_DESIGN.md §6 보강 참고.
// 음성 인식(STT)은 여전히 브라우저 Web Speech API 그대로 쓴다(미지원 브라우저에서는
// 안전하게 기능을 꺼둔다 — 크래시 방지).

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isSttSupported(): boolean {
  return getRecognitionCtor() !== undefined;
}

function isWebSpeechTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** 이 환경에서 학습 음성을 재생할 수 있는지 — Gemini 음성은 서버 호출이라 브라우저와
 * 무관하므로, <audio> 재생이 되거나 Web Speech API 폴백이 되면(둘 중 하나만 있어도) true. */
export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && (typeof Audio !== 'undefined' || isWebSpeechTtsSupported());
}

export interface RecognizeHandlers {
  onResult: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}

/** 한 번의 발화를 인식해 텍스트로 반환한다. 반환값은 recognition 인스턴스의 stop() 함수. */
export function startRecognition(handlers: RecognizeHandlers): (() => void) | undefined {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    handlers.onError?.('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해보세요.');
    return undefined;
  }

  const recognition = new Ctor();
  recognition.lang = 'ko-KR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const text = event.results[0]?.[0]?.transcript ?? '';
    handlers.onResult(text);
  };
  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    handlers.onError?.(`음성 인식 오류: ${event.error}`);
  };
  recognition.onend = () => {
    handlers.onEnd?.();
  };

  recognition.start();
  return () => recognition.stop();
}

export interface SpeakOptions {
  rate?: number; // 0.1(느림) ~ 2.0(빠름), 기본 1
  onStart?: () => void;
  onBoundary?: () => void;
  onEnd?: () => void;
}

let cachedKoreanVoice: SpeechSynthesisVoice | undefined;

function pickKoreanVoice(): SpeechSynthesisVoice | undefined {
  if (cachedKoreanVoice) return cachedKoreanVoice;
  const voices = window.speechSynthesis.getVoices();
  cachedKoreanVoice = voices.find((v) => v.lang.startsWith('ko'));
  return cachedKoreanVoice;
}

/** Gemini 음성을 쓸 수 없을 때(키 없음·호출 실패)의 자리표시자 — 기존 브라우저 내장 음성. */
function speakWithWebSpeech(text: string, options: SpeakOptions): void {
  if (!isWebSpeechTtsSupported()) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = options.rate ?? 1;
  const voice = pickKoreanVoice();
  if (voice) utterance.voice = voice;

  utterance.onstart = () => options.onStart?.();
  utterance.onboundary = () => options.onBoundary?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onEnd?.();

  window.speechSynthesis.speak(utterance);
}

let currentAudio: HTMLAudioElement | undefined;

// 같은 문장을 "다시 듣기"로 반복 재생할 때마다 서버를 다시 부르지 않도록, 이 탭이 살아있는
// 동안만 재생 URL을 기억해둔다(관리자가 음색을 바꾸면 새로고침해야 반영되는 것도 이 때문).
const CACHE_LIMIT = 60;
const audioCache = new Map<string, { url: string; sampleRateHz: number }>();

function cacheAudio(text: string, entry: { url: string; sampleRateHz: number }): void {
  if (!audioCache.has(text) && audioCache.size >= CACHE_LIMIT) {
    const oldestKey = audioCache.keys().next().value;
    if (oldestKey !== undefined) {
      const old = audioCache.get(oldestKey);
      if (old) URL.revokeObjectURL(old.url);
      audioCache.delete(oldestKey);
    }
  }
  audioCache.set(text, entry);
}

async function fetchGeminiAudio(text: string): Promise<{ url: string; sampleRateHz: number } | undefined> {
  const cached = audioCache.get(text);
  if (cached) return cached;
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const json = await res.json();
    if (!res.ok || !json.audioBase64) return undefined; // fallback:true(키 없음/합성 실패) 포함
    const blob = pcm16ToWavBlob(json.audioBase64, json.sampleRateHz ?? 24000);
    const entry = { url: URL.createObjectURL(blob), sampleRateHz: json.sampleRateHz ?? 24000 };
    cacheAudio(text, entry);
    return entry;
  } catch {
    return undefined; // 네트워크 오류 — 브라우저 음성으로 대체
  }
}

// speak()가 끝나기 전에 다시 speak()가 불리는 경우(버튼 연타 등), 먼저 시작한 호출의
// 서버 응답이 나중에 와서 겹쳐 재생되지 않도록 "가장 최근 호출만 재생" 토큰을 둔다.
let speakToken = 0;

/** 한글케어의 기본 발화 함수 — Gemini 2.5 TTS로 합성한 음성(관리자가
 * /admin/voice-settings에서 고른 음색)을 재생한다. 서버 호출이 실패하면(키 없음·네트워크
 * 오류 등) 브라우저 내장 음성(Web Speech API)으로 자동 대체된다. */
export function speak(text: string, options: SpeakOptions = {}): void {
  if (typeof window === 'undefined' || !text.trim()) return;
  stopSpeaking();
  const token = ++speakToken;

  fetchGeminiAudio(text).then((entry) => {
    if (token !== speakToken) return; // 그 사이 새 speak() 호출이 있었음 — 이건 버린다
    if (!entry) {
      speakWithWebSpeech(text, options);
      return;
    }
    const audio = new Audio(entry.url);
    audio.playbackRate = options.rate ?? 1;
    currentAudio = audio;
    audio.onplay = () => options.onStart?.();
    audio.onended = () => options.onEnd?.();
    audio.onerror = () => speakWithWebSpeech(text, options);
    audio.play().catch(() => speakWithWebSpeech(text, options));
  });
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = undefined;
  }
  if (isWebSpeechTtsSupported()) window.speechSynthesis.cancel();
}
