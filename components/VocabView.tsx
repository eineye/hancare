'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { speak } from '@/lib/speech';
import { usePracticedTermsStore } from '@/lib/store';
import type { VocabCard } from '@/lib/vocab';
import { useVideoStore } from '@/lib/videoStore';

type Tab = '전체' | '학습함' | '아직';

export default function VocabView({ cards }: { cards: VocabCard[] }) {
  const practicedTermIds = usePracticedTermsStore((s) => s.practicedTermIds);
  const markPracticed = usePracticedTermsStore((s) => s.markPracticed);
  const savedVideoTerms = useVideoStore((s) => s.savedTerms);
  const removeVideoTerm = useVideoStore((s) => s.removeTerm);
  const [tab, setTab] = useState<Tab>('전체');
  const [query, setQuery] = useState('');

  const practicedCount = cards.filter((c) => practicedTermIds.includes(c.id)).length;

  const shown = useMemo(() => {
    return cards.filter((c) => {
      const isPracticed = practicedTermIds.includes(c.id);
      if (tab === '학습함' && !isPracticed) return false;
      if (tab === '아직' && isPracticed) return false;
      if (query.trim() && !c.hangul.includes(query) && !c.glossEn.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [cards, practicedTermIds, tab, query]);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11.5px] font-bold tracking-wide text-brand">단어장 VOCABULARY</p>
          <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
            내 의료 용어 {cards.length}개
          </h1>
          <p className="mt-2 text-sm text-muted">
            학습 화면에서 용어 듣기 버튼을 누르면 &ldquo;학습함&rdquo;으로 표시됩니다 ({practicedCount}/{cards.length}).
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="용어 검색 · Search"
          className="min-w-[220px] rounded-[11px] border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>

      {savedVideoTerms.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-[11.5px] font-bold tracking-wide text-brand">영상에서 담은 표현 {savedVideoTerms.length}개</p>
            <Link href="/video" className="text-xs text-brand hover:underline">
              영상학습 →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {savedVideoTerms.map((t) => (
              <div key={t.id} className="rounded-xl bg-panel px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-brand-dark">
                      {t.hangul}
                      {t.glossEn && <span className="ml-1.5 text-xs font-normal text-muted">{t.glossEn}</span>}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">&ldquo;{t.sentenceKo}&rdquo;</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => speak(t.hangul)}
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-chip text-xs text-brand hover:bg-brand hover:text-white"
                    aria-label={`${t.hangul} 발음 듣기`}
                  >
                    ▶
                  </button>
                </div>
                <div className="mt-1.5 flex justify-between text-[11px]">
                  <Link href={`/video/${t.videoId}?t=${Math.floor(t.cueStart)}`} className="text-brand hover:underline">
                    {t.videoTitleKo} 장면 보기 →
                  </Link>
                  <button type="button" onClick={() => removeVideoTerm(t.id)} className="text-faint hover:text-warn">
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(['전체', '학습함', '아직'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-2 text-[12.5px] ${
              tab === t ? 'border-brand-dark bg-brand-dark text-white' : 'border-line bg-white text-brand-dark'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
          조건에 맞는 용어가 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => {
            const learned = practicedTermIds.includes(c.id);
            return (
              <div key={c.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-brand-dark">{c.hangul}</p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      [{c.romanization}] · {c.glossEn}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      speak(c.hangul);
                      markPracticed(c.id);
                    }}
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-chip text-xs text-brand hover:bg-brand hover:text-white"
                    aria-label={`${c.hangul} 발음 듣기`}
                  >
                    ▶
                  </button>
                </div>
                <div className="mt-3.5 flex items-center justify-between">
                  <span className={`text-[11px] ${learned ? 'text-brand' : 'text-faint'}`}>
                    {learned ? '학습함' : '아직'}
                  </span>
                  <Link href={c.situationHref} className="text-xs text-brand hover:underline">
                    {c.situationLabelKo} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
