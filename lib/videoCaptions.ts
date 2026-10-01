import type { VideoCue } from './types';

// 영상 에디터 AI 자동 자막(/api/videos/transcribe) 응답 정리. docs/VIDEO_EDITOR_DESIGN.md §4.
export interface RawCue {
  start?: number;
  end?: number;
  speakerKo?: string;
  textKo?: string;
  textEn?: string;
  terms?: { hangul?: string; glossEn?: string }[];
}

/** Gemini 응답을 정리한다: 정렬, 0~길이로 자르기, 끝≤시작 보정, 대사에 없는 학습 단어 제거, id 부여. */
export function normalizeCues(raw: RawCue[], idPrefix: string, durationSec?: number): VideoCue[] {
  const limit = durationSec && durationSec > 0 ? durationSec : Infinity;
  const round = (n: number) => Math.round(n * 10) / 10;
  const cues = raw
    .map((c) => {
      const textKo = String(c.textKo ?? '').trim();
      let start = Math.max(0, Number(c.start) || 0);
      let end = Number(c.end) || 0;
      start = Math.min(start, limit);
      end = Math.min(end, limit);
      if (!(end > start)) end = Math.min(start + 2, limit);
      const terms = (c.terms ?? [])
        .map((t) => ({ hangul: String(t.hangul ?? '').trim(), glossEn: String(t.glossEn ?? '').trim() }))
        .filter((t) => t.hangul && textKo.includes(t.hangul))
        .slice(0, 3);
      return {
        start: round(start),
        end: round(end),
        speakerKo: String(c.speakerKo ?? '').trim(),
        textKo,
        textEn: String(c.textEn ?? '').trim(),
        terms,
      };
    })
    .filter((c) => c.textKo && c.end > c.start)
    .sort((a, b) => a.start - b.start);
  return cues.map((c, i) => ({
    id: `${idPrefix}-${i + 1}`,
    start: c.start,
    end: c.end,
    ...(c.speakerKo ? { speakerKo: c.speakerKo } : {}),
    textKo: c.textKo,
    textEn: c.textEn,
    ...(c.terms.length ? { terms: c.terms } : {}),
  }));
}
