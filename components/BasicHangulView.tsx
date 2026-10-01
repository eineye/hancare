'use client';

import { useState } from 'react';
import Link from 'next/link';
import { speak } from '@/lib/speech';
import { usePracticedTermsStore, useSettingsStore } from '@/lib/store';
import type { Unit, Term } from '@/lib/types';

function TermRow({ term }: { term: Term }) {
  const practicedTermIds = usePracticedTermsStore((s) => s.practicedTermIds);
  const markPracticed = usePracticedTermsStore((s) => s.markPracticed);
  const displayLang = useSettingsStore((s) => s.displayLang);
  const learned = practicedTermIds.includes(term.id);

  return (
    <div className="flex items-center justify-between gap-2.5 rounded-xl bg-panel px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-brand-dark">{term.hangul}</p>
        <p className="mt-0.5 text-xs text-muted">
          [{term.romanization}]{displayLang !== 'ko' && ` · ${term.glossEn}`}
        </p>
      </div>
      <div className="flex flex-none items-center gap-2">
        <span className={`text-[11px] ${learned ? 'text-brand' : 'text-faint'}`}>{learned ? '학습함' : '아직'}</span>
        <button
          type="button"
          onClick={() => {
            speak(term.hangul);
            markPracticed(term.id);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-chip text-xs text-brand hover:bg-brand hover:text-white"
          aria-label={`${term.hangul} 발음 듣기`}
        >
          ▶
        </button>
      </div>
    </div>
  );
}

export default function BasicHangulView({ units }: { units: Unit[] }) {
  const situations = units.flatMap((unit) => unit.situations.map((situation) => ({ unit, situation })));
  const [mediOpen, setMediOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11.5px] font-bold tracking-wide text-brand">기초한글 BASIC HANGUL</p>
          <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
            한글 자체를 처음부터 배우기
          </h1>
          <p className="mt-2 text-sm text-muted">
            자음·모음, 받침, 기초 낱말 등 한글 자체를 처음부터 배웁니다. 각 상황에 등장하는 용어는 바로 듣고
            연습할 수 있고, 전체 용어는 단어장 메뉴에서 모아볼 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMediOpen(true)}
          className="flex-none whitespace-nowrap rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-medium text-brand-dark hover:bg-panel"
        >
          메디쌤과 발화 연습 ↗
        </button>
      </div>

      {mediOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-3 sm:p-6"
          onClick={() => setMediOpen(false)}
        >
          <div
            className="flex h-[94vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-none items-center justify-between border-b border-line px-4 py-2.5">
              <p className="text-sm font-bold text-brand-dark">메디쌤과 발화 연습</p>
              <button
                type="button"
                onClick={() => setMediOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-panel"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <iframe src="/medi-ssam.html" title="메디쌤과 발화 연습" className="w-full flex-1 border-0" />
          </div>
        </div>
      )}

      {situations.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
          아직 등록된 기초한글 콘텐츠가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {situations.map(({ unit, situation }) => (
            <section key={situation.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-brand-dark">{situation.menuLabelKo}</h2>
                  <p className="mt-1 text-sm text-muted">{situation.titleKo}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-chipBorder bg-chip px-3 py-1 text-xs font-medium text-brand">
                      {situation.placeTag}
                    </span>
                    <span className="rounded-full border border-chipBorder bg-chip px-3 py-1 text-xs font-medium text-brand">
                      {situation.formalityTag}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/learn/${unit.id}/${situation.id}`}
                  className="flex-none whitespace-nowrap rounded-[10px] bg-brand-dark px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-dark/90"
                >
                  학습하기 →
                </Link>
              </div>

              <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {situation.terms.map((term) => (
                  <TermRow key={term.id} term={term} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
