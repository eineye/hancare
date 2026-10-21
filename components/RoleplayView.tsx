'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import TeacherAvatar, { type TeacherAvatarHandle } from './TeacherAvatar';
import { ELDERLY_MAN_PALETTE } from '@/lib/teacher2d/palettes';
import { fetchGeminiAudio, isSttSupported, startRecognition } from '@/lib/speech';
import { useSettingsStore, type AvatarState } from '@/lib/store';
import type { ChatMessage, RoleplayScenario, Term } from '@/lib/types';
import { apiErrorMessage } from '@/lib/auth';

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `rp-${Date.now()}-${idCounter}`;
}

export default function RoleplayView({
  unitId,
  situationId,
  situationTitleKo,
  terms,
  learnHref,
  scenario,
}: {
  unitId: string;
  situationId: string;
  situationTitleKo: string;
  terms: Term[];
  learnHref: string;
  /** 관리자 "역할극 편집"(content/roleplays.json)에서 정한 시나리오. 비어 있으면 기본 역할극. */
  scenario: RoleplayScenario;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [recording, setRecording] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const stopFnRef = useRef<(() => void) | undefined>(undefined);
  const startedRef = useRef(false);
  const patientRef = useRef<TeacherAvatarHandle>(null);
  const displayLang = useSettingsStore((s) => s.displayLang);

  useEffect(() => {
    setSttSupported(isSttSupported());
  }, []);

  /** "AI 환자" 아바타 발화 — Gemini TTS 오디오 + 실제 음량 기반 립싱크(engine.speakAudio())를
   * 우선 쓰고, 키가 없거나 호출이 실패하면 아바타 엔진 자체의 Web Speech 폴백(engine.speak(),
   * 그마저 안 되면 무음 입모양만)으로 넘어간다. */
  async function speakPatient(text: string) {
    if (!text.trim()) return;
    const audio = await fetchGeminiAudio(text);
    if (audio) {
      patientRef.current?.speakAudio(audio.url, text);
    } else {
      patientRef.current?.speak(text);
    }
  }

  async function send(text: string, historyOverride?: ChatMessage[]) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const history = historyOverride ?? messages;
    const userMessage: ChatMessage = { id: nextId(), role: 'user', content: trimmed };
    const assistantId = nextId();
    setMessages([...history, userMessage, { id: assistantId, role: 'assistant', content: '' }]);
    setDraft('');
    setStreaming(true);

    let fullText = '';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history, situationTitleKo, terms, roleplay: scenario }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res));
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)));
        }
      }
    } catch (err) {
      fullText = '';
      const msg = err instanceof Error && err.message ? err.message : '메시지를 가져오지 못했습니다.';
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: msg } : m)));
    } finally {
      setStreaming(false);
      if (fullText.trim()) speakPatient(fullText);
    }
  }

  useEffect(() => {
    if (startedRef.current || scenario.enabled === false) return;
    startedRef.current = true;
    // 편집기에서 첫 대사를 정했으면 AI 호출 없이 그 대사로 시작한다.
    if (scenario.openingKo) {
      setMessages([{ id: nextId(), role: 'assistant', content: scenario.openingKo }]);
      setTimeout(() => speakPatient(scenario.openingKo ?? ''), 300);
      return;
    }
    send(
      `환자 역할을 맡아서 저와 역할극 대화를 시작해 주세요. 상황: ${situationTitleKo}. 짧은 인사말로 먼저 말을 걸어주세요.`,
      [],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, situationId]);

  function handleMicToggle() {
    if (recording) {
      stopFnRef.current?.();
      setRecording(false);
      return;
    }
    setRecording(true);
    setAvatarState('listening');
    stopFnRef.current = startRecognition({
      onResult: (text) => {
        setRecording(false);
        setAvatarState('idle');
        send(text);
      },
      onError: () => {
        setRecording(false);
        setAvatarState('idle');
      },
      onEnd: () => setRecording(false),
    });
  }

  if (scenario.enabled === false) {
    return (
      <div className="flex flex-col gap-3.5">
        <Link href={learnHref} className="inline-block w-fit text-xs font-medium text-brand hover:underline">
          ← 학습 화면으로
        </Link>
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <p className="text-lg font-bold text-brand-dark">{situationTitleKo}</p>
          <p className="mt-2 text-sm text-muted">이 상황은 아직 역할극이 준비되지 않았습니다.</p>
        </div>
      </div>
    );
  }

  const patientLabel = [scenario.patientNameKo, scenario.patientProfileKo].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-3.5">
      <Link href={learnHref} className="inline-block w-fit text-xs font-medium text-brand hover:underline">
        ← 학습 화면으로
      </Link>

      <div className="flex flex-wrap items-start gap-3.5">
        <div className="min-w-0 flex-[1_1_520px] rounded-[18px] bg-brand-dark p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <p className="text-[11px] font-bold tracking-wide text-brand-light">역할극 ROLE PLAY</p>
              <h1 className="mt-2.5 text-2xl font-black tracking-tight">{situationTitleKo}</h1>
            </div>
            <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs">환자 역: {patientLabel || 'AI'}</span>
          </div>
          {scenario.goalKo && (
            <p className="mt-3 rounded-xl bg-white/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-white/85">
              <b className="mr-1.5 text-brand-light">목표</b>
              {scenario.goalKo}
            </p>
          )}

          <div className="mt-5 flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                  m.role === 'user' ? 'self-end rounded-br-md bg-brand' : 'self-start rounded-bl-md bg-white/10'
                }`}
              >
                {m.content || (streaming ? '…' : '')}
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/5 p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send(draft);
              }}
              placeholder="직접 입력하거나 마이크로 말해보세요…"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
            {sttSupported && (
              <button
                type="button"
                onClick={handleMicToggle}
                className={`rounded-full px-4 py-2 text-xs font-bold ${
                  recording ? 'bg-warnAccent' : 'bg-white/15 hover:bg-white/25'
                }`}
              >
                🎙 {recording ? '듣는 중…' : '말하기'}
              </button>
            )}
            <button
              type="button"
              onClick={() => send(draft)}
              disabled={streaming || !draft.trim()}
              className="rounded-full bg-white px-4 py-2 text-xs font-bold text-brand disabled:opacity-40"
            >
              보내기
            </button>
          </div>
          {!sttSupported && (
            <p className="mt-2 text-[11px] text-warnAccent">이 브라우저는 음성 인식을 지원하지 않습니다.</p>
          )}
        </div>

        <div className="min-w-0 flex-[1_1_300px] max-w-[400px] space-y-4">
          <div className="rounded-2xl bg-brand p-4 text-white">
            <div className="mb-3.5 flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-wide text-white/80">AI 환자 아바타</p>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs">
                {avatarState === 'speaking' ? '● 말하는 중' : avatarState === 'listening' ? '● 듣는 중' : '대기 중'}
              </span>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-brand-dark/40">
              <TeacherAvatar
                ref={patientRef}
                options={{ palette: ELDERLY_MAN_PALETTE }}
                onStart={() => setAvatarState('speaking')}
                onEnd={() => setAvatarState('idle')}
              />
              {avatarState === 'listening' && (
                <div className="pointer-events-none absolute inset-2 rounded-lg ring-2 ring-white/50 motion-safe:animate-pulse" />
              )}
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-white/70">
              Gemini API로 실제 대화하는 역할극입니다(API 키가 없으면 관리자가 정한 규칙 응답으로 대화합니다). 환자
              대사는 실시간 생성되며, 실제 임상 판단이 필요한 질문에는 답하지 않도록 안내되어 있습니다. 아바타 음성도
              Gemini TTS(관리자가 고른 음색)로 실제로 재생되며, 키가 없거나 호출이 실패하면 브라우저 내장 음성으로
              대체됩니다.
            </p>
          </div>

          {scenario.hintsKo && scenario.hintsKo.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="mb-3.5 text-[11.5px] font-bold tracking-wide text-brand">추천 표현 · 눌러서 입력</p>
              <div className="flex flex-col gap-2">
                {scenario.hintsKo.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setDraft(h)}
                    className="rounded-xl bg-panel px-3.5 py-2.5 text-left text-sm text-brand-dark hover:bg-chip"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {terms.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="mb-3.5 text-[11.5px] font-bold tracking-wide text-brand">이 상황의 용어</p>
              <div className="flex flex-col gap-2">
                {terms.map((t) => (
                  <div key={t.id} className="rounded-xl bg-panel px-3.5 py-2.5">
                    <p className="text-sm font-medium text-brand-dark">{t.hangul}</p>
                    {displayLang !== 'ko' && <p className="mt-0.5 text-[11.5px] text-muted">{t.glossEn}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
