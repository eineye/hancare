'use client';

import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '@/lib/store';
import { startRecognition, isSttSupported } from '@/lib/speech';
import type { ChatMessage, VideoCue } from '@/lib/types';
import { formatTime } from './TranscriptList';
import { apiErrorMessage } from '@/lib/auth';

/** 질문 순간의 장면 정보. 부모(VideoLessonScreen)가 영상을 멈추면서 만들어 준다. */
export interface AskContext {
  atSec: number;
  currentCue?: VideoCue;
  prevCue?: VideoCue;
  nextCue?: VideoCue;
}

interface QaMessage extends ChatMessage {
  /** 사용자 질문이면 질문한 장면 정보 */
  context?: AskContext;
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `vqa-${Date.now()}-${idCounter}`;
}

function cueForApi(cue?: VideoCue) {
  return cue ? { textKo: cue.textKo, textEn: cue.textEn, speakerKo: cue.speakerKo } : undefined;
}

export default function VideoQaPanel({
  videoTitleKo,
  selectedTerm,
  selectedGloss,
  termSaved,
  paused,
  onClearTerm,
  onAsk,
  onResume,
  onSaveTerm,
}: {
  videoTitleKo: string;
  selectedTerm?: string;
  selectedGloss?: string;
  termSaved: boolean;
  paused: boolean;
  onClearTerm: () => void;
  /** 영상을 멈추고 질문 기록을 남긴 뒤, 질문한 장면 정보를 돌려준다. */
  onAsk: (question: string) => AskContext;
  onResume: () => void;
  onSaveTerm: () => void;
}) {
  const displayLang = useSettingsStore((s) => s.displayLang);
  const [messages, setMessages] = useState<QaMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSttSupported(isSttSupported()), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming) return;

    const context = onAsk(question);
    const history: ChatMessage[] = messages.map(({ id, role, content }) => ({ id, role, content }));
    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', content: question, context },
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    setInput('');
    setStreaming(true);

    const append = (chunk: string) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)));

    try {
      const res = await fetch('/api/video-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history,
          videoTitleKo,
          currentCue: cueForApi(context.currentCue),
          prevCue: cueForApi(context.prevCue),
          nextCue: cueForApi(context.nextCue),
          selectedTerm,
          displayLang,
        }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res));
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          append(decoder.decode(value, { stream: true }));
        }
      }
    } catch (err) {
      append(err instanceof Error && err.message ? err.message : '답변을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setStreaming(false);
    }
  }

  function handleMic() {
    if (listening) return;
    setListening(true);
    startRecognition({
      onResult: (text) => setInput(text),
      onError: () => setListening(false),
      onEnd: () => setListening(false),
    });
  }

  const quickQuestions = selectedTerm
    ? [
        { label: '뜻 알려줘', q: `"${selectedTerm}" 무슨 뜻이에요? 이 장면에서는 어떤 의미예요?` },
        { label: '문법 설명', q: `"${selectedTerm}"에 쓰인 문법(어미·존댓말)을 설명해 주세요.` },
        { label: '예문 더 보기', q: `"${selectedTerm}"을 병원에서 쓰는 예문을 더 알려 주세요.` },
        { label: '비슷한 표현', q: `"${selectedTerm}"와 비슷한 표현이나 더 공손한 표현을 알려 주세요.` },
      ]
    : [
        { label: '뜻 알려줘', q: '방금 이 문장은 무슨 뜻이에요?' },
        { label: '문법 설명', q: '이 문장에 쓰인 문법을 설명해 주세요.' },
        { label: '예문 더 보기', q: '이 문장과 같은 형식으로 병원에서 쓰는 예문을 더 알려 주세요.' },
        { label: '비슷한 표현', q: '이 문장을 다르게 말하는 방법이나 더 공손한 표현을 알려 주세요.' },
      ];

  return (
    <section className="flex h-full min-h-[420px] flex-col rounded-2xl border border-line bg-white p-5">
      <p className="text-[11.5px] font-bold tracking-wide text-brand">멈추고 질문하기 ASK</p>
      <p className="mb-3 mt-1 text-[11px] text-faint">질문하면 영상이 자동으로 멈춥니다 · 모국어로 물어봐도 돼요</p>

      {selectedTerm ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-chip px-3 py-2.5">
          <span className="text-[11px] text-muted">선택한 표현</span>
          <span className="text-base font-bold text-brand-dark">{selectedTerm}</span>
          {selectedGloss && <span className="text-xs text-muted">· {selectedGloss}</span>}
          <span className="flex-1" />
          <button
            type="button"
            onClick={onSaveTerm}
            disabled={termSaved}
            className="rounded-full border border-brand/40 px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-white disabled:opacity-60"
          >
            {termSaved ? '단어장에 담김 ✓' : '+ 단어장에 담기'}
          </button>
          <button type="button" onClick={onClearTerm} className="text-xs text-faint hover:text-brand-dark" aria-label="선택 해제">
            ✕
          </button>
        </div>
      ) : (
        <p className="mb-3 rounded-xl bg-panel px-3 py-2.5 text-xs text-muted">
          자막의 단어를 누르면 그 단어를 골라서 질문할 수 있어요. 아무것도 고르지 않으면 지금 장면의 문장 전체에 대해 질문합니다.
        </p>
      )}

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-faint">예) &ldquo;재겠습니다는 왜 겠이 붙어요?&rdquo;, &ldquo;What does 주무셨어요 mean?&rdquo;</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'ml-auto max-w-[88%]' : 'max-w-[92%]'}>
            {m.context && (
              <p className="mb-1 text-right text-[10.5px] text-faint">
                ⏸ {formatTime(m.context.atSec)}
                {m.context.currentCue ? ` · "${m.context.currentCue.textKo}"` : ''}
              </p>
            )}
            <div
              className={`whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed ${
                m.role === 'user' ? 'bg-brand-dark text-white' : 'bg-panel text-brand-dark'
              }`}
            >
              {m.content || (streaming ? '…' : '')}
            </div>
          </div>
        ))}
      </div>

      {paused && messages.length > 0 && !streaming && (
        <button
          type="button"
          onClick={onResume}
          className="mt-2 w-full rounded-[11px] bg-brand px-4 py-2.5 text-sm font-bold text-white"
        >
          ▶ 이해했어요, 이어보기 (2초 전부터)
        </button>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        {quickQuestions.map((qq) => (
          <button
            key={qq.label}
            type="button"
            disabled={streaming}
            onClick={() => send(qq.q)}
            className="rounded-full border border-brand-dark/20 px-2.5 py-1 text-brand-dark hover:bg-chip disabled:opacity-40"
          >
            {qq.label}
          </button>
        ))}
      </div>

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectedTerm ? `"${selectedTerm}"에 대해 질문…` : '궁금한 표현을 질문하세요…'}
          className="min-w-0 flex-1 rounded-[10px] border border-line px-3 py-2 text-sm outline-none focus:border-brand"
        />
        {sttSupported && (
          <button
            type="button"
            onClick={handleMic}
            className={`rounded-lg border px-2.5 py-2 text-sm ${listening ? 'border-warnAccent text-warn' : 'border-line text-brand-dark'}`}
            aria-label="음성으로 질문"
          >
            🎤
          </button>
        )}
        <button
          type="submit"
          disabled={streaming}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          ↑
        </button>
      </form>
    </section>
  );
}
