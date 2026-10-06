'use client';

import { useRef, useState } from 'react';
import { pcm16ToWavBlob } from '@/lib/pcmAudio';
import { TTS_PREVIEW_TEXT_KO, type TtsVoiceOption } from '@/lib/ttsVoices';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function AdminVoiceSettings({
  voices,
  initialVoiceId,
  geminiConfigured,
}: {
  voices: TtsVoiceOption[];
  initialVoiceId: string;
  geminiConfigured: boolean;
}) {
  const [selectedId, setSelectedId] = useState(initialVoiceId);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [previewId, setPreviewId] = useState<string | undefined>(undefined);
  const [previewError, setPreviewError] = useState<string | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | undefined>(undefined);

  async function selectVoice(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    setSaveState('saving');
    try {
      const res = await fetch('/api/tts-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: id }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveState('saved');
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch {
      setSaveState('error');
    }
  }

  async function preview(voice: TtsVoiceOption) {
    if (!geminiConfigured) {
      setPreviewError('서버 환경변수 GEMINI_API_KEY가 설정되지 않아 미리듣기를 할 수 없습니다.');
      return;
    }
    setPreviewError(undefined);
    setPreviewId(voice.id);
    audioRef.current?.pause();
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: TTS_PREVIEW_TEXT_KO, voiceId: voice.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.audioBase64) throw new Error(json.error ?? '합성에 실패했습니다.');
      const blob = pcm16ToWavBlob(json.audioBase64, json.sampleRateHz ?? 24000);
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => setPreviewId(undefined);
      audio.onerror = () => setPreviewId(undefined);
      await audio.play();
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : '미리듣기에 실패했습니다.');
      setPreviewId(undefined);
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <p className="text-[11.5px] font-bold tracking-wide text-brand">관리자 설정 ADMIN SETTINGS</p>
        <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
          학습 음성(TTS) 설정
        </h1>
        <p className="mt-2 text-sm text-muted">
          학습 화면 전체(따라 읽기 · 단어 듣기 · 단어장 · 영상 자막)에서 재생되는 "원어민 발음"
          음색을 고릅니다. 고르면 바로 저장되어 모든 학습자 화면에 적용됩니다.
        </p>
      </div>

      {!geminiConfigured && (
        <div className="rounded-2xl border border-warnBorder bg-warnBg p-4 text-sm text-warn">
          서버 환경변수 <code className="font-mono">GEMINI_API_KEY</code>가 설정되지 않았습니다. 지금은
          아래에서 무엇을 고르고 저장해도, 학습 화면의 모든 음성이 브라우저 기본 음성(Web Speech
          API)으로 재생됩니다. <code className="font-mono">.env.local</code>에 키를 설정하면 이
          화면에서 고른 Gemini 음색이 바로 적용됩니다.
        </div>
      )}

      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold tracking-wide text-brand">음색 선택 VOICE</p>
          <p className="text-xs text-muted" aria-live="polite">
            {saveState === 'saving' && '저장 중…'}
            {saveState === 'saved' && '저장됨 ✓'}
            {saveState === 'error' && <span className="text-warn">저장 실패 — 다시 시도해주세요.</span>}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {voices.map((voice) => {
            const selected = voice.id === selectedId;
            const loading = previewId === voice.id;
            return (
              <div
                key={voice.id}
                role="button"
                tabIndex={0}
                onClick={() => selectVoice(voice.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectVoice(voice.id);
                  }
                }}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                  selected ? 'border-brand-dark bg-brand-dark text-white' : 'border-line bg-white hover:bg-panel'
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 text-[10px] ${
                    selected ? 'border-white bg-white text-brand-dark' : 'border-line text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{voice.labelKo}</span>
                  <span className={`mt-0.5 block text-xs ${selected ? 'text-white/70' : 'text-muted'}`}>
                    {voice.descKo}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    preview(voice);
                  }}
                  className={`flex-none whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                    selected
                      ? 'border-white/40 text-white hover:bg-white/10'
                      : 'border-line text-brand-dark hover:bg-chip'
                  }`}
                >
                  {loading ? '재생 중…' : '▶ 미리듣기'}
                </button>
              </div>
            );
          })}
        </div>

        {previewError && <p className="mt-3 text-xs text-warn">{previewError}</p>}

        <p className="mt-4 text-xs leading-relaxed text-muted">
          음색 미리듣기 예문: &ldquo;{TTS_PREVIEW_TEXT_KO}&rdquo;. 재생 속도(느리게 듣기 등)는 학습자의{' '}
          <span className="font-medium text-brand-dark">설정 → 말하기 속도</span>에서 조절됩니다. 역할극의
          &ldquo;AI 환자&rdquo;와 메디쌤 팝업은 입모양 연동을 위해 별도의 음성 엔진을 쓰므로 이 설정의
          영향을 받지 않습니다.
        </p>
      </section>
    </div>
  );
}
