'use client';

import { speak } from '@/lib/speech';
import type { Term } from '@/lib/types';

function TermCard({ term }: { term: Term }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-black/5 bg-white p-3">
      <div>
        <p className="font-semibold text-brand-dark">{term.hangul}</p>
        <p className="text-xs text-gray-500">
          [{term.romanization}] · {term.glossEn}
        </p>
      </div>
      <button
        type="button"
        onClick={() => speak(term.hangul)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-brand hover:bg-brand hover:text-white"
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
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">오늘의 의료 용어 KEY TERMS</p>
        <p className="text-xs text-gray-400">발음 듣기 · 따라 읽기</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {terms.map((term) => (
          <TermCard key={term.id} term={term} />
        ))}
      </div>
    </section>
  );
}
