'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar2D from './Avatar2D';
import { isSttSupported, startRecognition } from '@/lib/speech';
import { useSettingsStore, type AvatarState } from '@/lib/store';
import type { ChatMessage, Term } from '@/lib/types';

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
}: {
  unitId: string;
  situationId: string;
  situationTitleKo: string;
  terms: Term[];
  learnHref: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [recording, setRecording] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const stopFnRef = useRef<(() => void) | undefined>(undefined);
  const startedRef = useRef(false);
  const displayLang = useSettingsStore((s) => s.displayLang);

  useEffect(() => {
    setSttSupported(isSttSupported());
  }, []);

  async function send(text: string, historyOverride?: ChatMessage[]) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const history = historyOverride ?? messages;
    const userMessage: ChatMessage = { id: nextId(), role: 'user', content: trimmed };
    const assistantId = nextId();
    setMessages([...history, userMessage, { id: assistantId, role: 'assistant', content: '' }]);
    setDraft('');
    setStreaming(true);
    setAvatarState('speaking');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history, situationTitleKo, terms }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)));
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: '메시지를 가져오지 못했습니다.' } : m)),
      );
    } finally {
      setStreaming(false);
      setAvatarState('idle');
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
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
            <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs">환자 역: AI</span>
          </div>

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
            <p className="mb-3.5 text-[11px] font-bold tracking-wide text-white/80">AI 환자 아바타</p>
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-brand-dark/40">
              <Avatar2D state={avatarState} closeup={false} />
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-white/70">
              Gemini API로 실제 대화하는 역할극입니다. 환자 대사는 실시간 생성되며, 실제 임상 판단이 필요한 질문에는
              답하지 않도록 안내되어 있습니다.
            </p>
          </div>

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
