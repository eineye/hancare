'use client';

import { speak } from '@/lib/speech';
import type { VideoCue } from '@/lib/types';

interface Segment {
  text: string;
  /** 주석 단어면 뜻, 일반 어절이면 undefined */
  gloss?: string;
  /** 탭했을 때 질문 대상으로 넘길 표현(문장부호 제거) */
  pick?: string;
}

const PUNCT = /[.,!?…"'“”‘’()]/g;

/** 자막 문장을 "주석 단어" 구간과 일반 어절로 나눈다. 여러 어절짜리 주석
 * (예: "올려 주세요")도 한 덩어리로 강조되도록 긴 주석부터 매칭한다. */
function segmentCue(cue: VideoCue): Segment[] {
  const terms = [...(cue.terms ?? [])].sort((a, b) => b.hangul.length - a.hangul.length);
  const text = cue.textKo;
  const out: Segment[] = [];
  let i = 0;
  while (i < text.length) {
    const term = terms.find((t) => text.startsWith(t.hangul, i));
    if (term) {
      out.push({ text: term.hangul, gloss: term.glossEn, pick: term.hangul });
      i += term.hangul.length;
      continue;
    }
    if (text[i] === ' ') {
      out.push({ text: ' ' });
      i += 1;
      continue;
    }
    let j = i;
    while (j < text.length && text[j] !== ' ' && !terms.some((t) => text.startsWith(t.hangul, j))) j += 1;
    const word = text.slice(i, j);
    const clean = word.replace(PUNCT, '');
    out.push({ text: word, pick: clean || undefined });
    i = j;
  }
  return out;
}

export default function CaptionBar({
  cue,
  selectedTerm,
  onPick,
}: {
  cue?: VideoCue;
  selectedTerm?: string;
  onPick: (term: string, gloss?: string) => void;
}) {
  if (!cue) {
    return (
      <div className="rounded-2xl border border-line bg-white px-5 py-4 text-sm text-faint">
        자막이 여기에 표시됩니다. 모르는 단어가 나오면 단어를 눌러 보세요.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white px-5 py-4">
      <div className="flex items-center gap-2">
        {cue.speakerKo && (
          <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] font-semibold text-brand">{cue.speakerKo}</span>
        )}
        <span className="text-[11px] text-faint">단어를 누르면 영상이 멈추고 질문할 수 있어요</span>
        <button
          type="button"
          onClick={() => speak(cue.textKo)}
          className="ml-auto flex h-7 w-7 flex-none items-center justify-center rounded-full bg-chip text-xs text-brand hover:bg-brand hover:text-white"
          aria-label="자막 문장 듣기"
        >
          🔊
        </button>
      </div>
      <p className="mt-2 text-xl font-bold leading-relaxed text-brand-dark">
        {segmentCue(cue).map((seg, idx) => {
          if (!seg.pick) return <span key={idx}>{seg.text}</span>;
          const active = selectedTerm === seg.pick;
          return (
            <button
              key={idx}
              type="button"
              title={seg.gloss}
              onClick={() => onPick(seg.pick!, seg.gloss)}
              className={`rounded-md px-0.5 transition-colors ${
                active
                  ? 'bg-brand text-white'
                  : seg.gloss
                    ? 'underline decoration-brand decoration-2 underline-offset-4 hover:bg-chip'
                    : 'hover:bg-panel'
              }`}
            >
              {seg.text}
            </button>
          );
        })}
      </p>
      <p className="mt-1.5 text-sm text-muted">{cue.textEn}</p>
    </div>
  );
}
