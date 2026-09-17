'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';
import { useLessonStore } from '@/lib/store';
import type { ChatMessage } from '@/lib/types';

export interface ChatPanelHandle {
  startRoleplay: () => void;
}

interface ChatPanelProps {
  situationTitleKo: string;
  terms: { hangul: string; glossEn: string }[];
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `msg-${Date.now()}-${idCounter}`;
}

const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(({ situationTitleKo, terms }, ref) => {
  const chatMessages = useLessonStore((s) => s.chatMessages);
  const addChatMessage = useLessonStore((s) => s.addChatMessage);
  const appendToMessage = useLessonStore((s) => s.appendToMessage);
  const isChatStreaming = useLessonStore((s) => s.isChatStreaming);
  const setChatStreaming = useLessonStore((s) => s.setChatStreaming);
  const [input, setInput] = useState('');

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isChatStreaming) return;

    const historySnapshot = chatMessages;
    const userMessage: ChatMessage = { id: nextId(), role: 'user', content: trimmed };
    const assistantId = nextId();
    addChatMessage(userMessage);
    addChatMessage({ id: assistantId, role: 'assistant', content: '' });
    setInput('');
    setChatStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historySnapshot,
          situationTitleKo,
          terms,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          appendToMessage(assistantId, decoder.decode(value, { stream: true }));
        }
      }
    } catch {
      appendToMessage(assistantId, '메시지를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setChatStreaming(false);
    }
  }

  useImperativeHandle(ref, () => ({
    startRoleplay: () => send('환자 역할을 맡아서 저와 대화를 시작해 주세요.'),
  }));

  return (
    <section id="chat-panel" className="flex h-full min-h-[320px] flex-col rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand">AI 대화 CHAT</p>
      <p className="mb-2 text-[11px] text-gray-400">질문은 모국어로 해도 됩니다</p>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {chatMessages.length === 0 && (
          <p className="text-sm text-gray-400">궁금한 표현을 물어보거나, 역할극으로 대화를 연습해보세요.</p>
        )}
        {chatMessages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.role === 'user' ? 'ml-auto bg-brand text-white' : 'bg-surface text-gray-800'
            }`}
          >
            {m.content || (isChatStreaming ? '…' : '')}
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => send('이 상황에서 쓸 수 있는 다른 예문을 알려주세요.')}
          className="rounded-full border border-brand-dark/20 px-2.5 py-1 text-brand-dark hover:bg-brand-light"
        >
          예문 더 보기
        </button>
        <button
          type="button"
          onClick={() => send('환자 역할을 맡아서 저와 대화를 시작해 주세요.')}
          className="rounded-full border border-brand-dark/20 px-2.5 py-1 text-brand-dark hover:bg-brand-light"
        >
          역할극 시작
        </button>
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
          placeholder="메시지를 입력하세요…"
          className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={isChatStreaming}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          ↑
        </button>
      </form>
    </section>
  );
});

ChatPanel.displayName = 'ChatPanel';

export default ChatPanel;
