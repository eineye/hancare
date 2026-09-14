'use client';

// 브라우저 내장 Web Speech API 래퍼. docs/PROGRAM_DESIGN.md §6에서 설계한
// 상용 TTS/STT/립싱크 파이프라인 대신, 프로토타입 단계에서는 브라우저 기능을
// 그대로 사용한다. 미지원 브라우저에서는 안전하게 기능을 꺼둔다(크래시 방지).

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

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
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

export function speak(text: string, options: SpeakOptions = {}): void {
  if (!isTtsSupported()) return;
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

export function stopSpeaking(): void {
  if (isTtsSupported()) window.speechSynthesis.cancel();
}
