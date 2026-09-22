'use client';

import { speak } from '@/lib/speech';
import { usePracticedTermsStore, useSettingsStore } from '@/lib/store';
import type { Term } from '@/lib/types';

function TermCard({ term }: { term: Term }) {
  const markPracticed = usePracticedTermsStore((s) => s.markPracticed);
  const displayLang = useSettingsStore((s) => s.displayLang);

  function handlePlay() {
    speak(term.hangul);
    markPracticed(term.id);
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-white p-3.5">
      <div>
        <p className="font-semibold text-brand-dark">{term.hangul}</p>
        <p className="text-xs text-muted">
          [{term.romanization}]{displayLang !== 'ko' && ` · ${term.glossEn}`}
        </p>
      </div>
      <button
        type="button"
        onClick={handlePlay}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-chip text-brand hover:bg-brand hover:text-white"
        aria-label={`${term.hangul} 발음 듣기`}
        title="발음 듣기"
      >
        ▶
      </button>
    </div>
  );
}

export default function KeyTermsGrid({ terms }: { terms: Term[] }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-wide text-brand">오늘의 의료 용어 KEY TERMS</p>
        <p className="text-xs text-faint">발음 듣기 · 따라 읽기</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {terms.map((term) => (
          <TermCard key={term.id} term={term} />
        ))}
      </div>
    </section>
  );
}
