import type { FeedbackItem, ScoreResult, Sentence, SyllableScore } from './types';

/**
 * 실제 음성 신호(음소 정렬) 기반 발음 채점이 아니라, 브라우저 STT가 인식한
 * 텍스트와 목표 문장을 문자 단위로 비교하는 "텍스트 유사도 근사치" 채점기입니다.
 * docs/PROGRAM_DESIGN.md §6.2에서 설명한 실제 파이프라인(Forced Alignment,
 * 음소 단위 채점 모델)을 대체하는 프로토타입용 구현입니다.
 */

function toSyllables(text: string): string[] {
  return Array.from(text.replace(/\s+/g, ''));
}

/** 문자열 기반 결정론적(재현 가능한) 0~1 사이 지터 값. Math.random 대신 사용해
 * 같은 입력이면 항상 같은 점수가 나오도록 한다. */
function hashJitter(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

type AlignOp = 'match' | 'sub' | 'del' | 'ins';

/** target(목표)과 recognized(인식결과)를 표준 편집거리 DP로 정렬해
 * target의 각 글자가 match/치환/누락 중 무엇인지 반환한다. */
function alignSyllables(target: string[], recognized: string[]) {
  const m = target.length;
  const n = recognized.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (target[i - 1] === recognized[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const ops: AlignOp[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && target[i - 1] === recognized[j - 1]) {
      ops.unshift('match');
      i -= 1;
      j -= 1;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.unshift('sub');
      i -= 1;
      j -= 1;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.unshift('del');
      i -= 1;
    } else {
      ops.unshift('ins');
      j -= 1;
    }
  }
  // target 글자에 대응하는 op만 남긴다 (ins는 target에 없는 글자이므로 제외)
  return { ops: ops.filter((op) => op !== 'ins'), distance: dp[m][n] };
}

export function scoreSentence(sentence: Sentence, recognizedTextRaw: string): ScoreResult {
  // sentence.syllables(콘텐츠에 미리 정의된, 문장부호를 뺀 음절 배열)를 기준으로 삼아야
  // RepeatAfterMe/PronunciationScore가 같은 인덱스로 하이라이트를 맞출 수 있다.
  // textKo를 다시 음절 분해하면 마침표 등 구두점이 섞여 어긋난다.
  const target = sentence.syllables;
  const recognizedText = recognizedTextRaw.trim();
  const recognized = toSyllables(recognizedText);

  const { ops, distance } = alignSyllables(target, recognized);

  const perSyllable: SyllableScore[] = target.map((syllable, idx) => {
    const op = ops[idx] ?? 'del';
    const jitter = hashJitter(syllable + idx);
    let score: number;
    if (op === 'match') score = Math.round(90 + jitter * 10);
    else if (op === 'sub') score = Math.round(45 + jitter * 25);
    else score = Math.round(10 + jitter * 15); // del: 인식되지 않음
    return { syllable, score: Math.min(100, score) };
  });

  const accuracy = target.length
    ? Math.round((1 - distance / Math.max(target.length, recognized.length, 1)) * 100)
    : 0;

  const lengthRatio = recognized.length / Math.max(target.length, 1);
  const lengthPenalty = Math.min(40, Math.abs(1 - lengthRatio) * 40);
  const fluency = Math.max(0, Math.min(100, Math.round(accuracy - lengthPenalty + hashJitter(recognizedText) * 8)));

  const intonation = Math.max(
    0,
    Math.min(100, Math.round(accuracy * 0.6 + fluency * 0.3 + hashJitter(sentence.id) * 10)),
  );

  const overall = Math.round(accuracy * 0.5 + fluency * 0.3 + intonation * 0.2);

  return {
    overall: Math.max(0, Math.min(100, overall)),
    accuracy: Math.max(0, Math.min(100, accuracy)),
    fluency,
    intonation,
    perSyllable,
    recognizedText,
  };
}

// 한글 음절을 초성/중성/종성으로 분해해 모음(중성) 기반 발음 힌트를 생성한다.
const S_BASE = 0xac00;
const V_COUNT = 21;
const T_COUNT = 28;
const N_COUNT = V_COUNT * T_COUNT;
const VOWEL_HINTS: Record<number, string> = {
  1: "모음 'ㅐ' 발음을 확인하세요 — 입을 조금 더 벌리고 혀를 낮추세요.",
  4: "모음 'ㅓ' 발음을 확인하세요 — 입을 자연스럽게 벌리고 짧게 발음하세요.",
  5: "모음 'ㅔ' 발음을 확인하세요 — 'ㅐ'보다 입을 조금 덜 벌려보세요.",
  18: "모음 'ㅡ' 발음을 확인하세요 — 입을 옆으로 펴고 짧게 발음하세요.",
  20: "모음 'ㅣ' 발음을 확인하세요 — 입꼬리를 옆으로 당겨보세요.",
};

function vowelHintFor(syllable: string): string | undefined {
  const code = syllable.codePointAt(0);
  if (code === undefined) return undefined;
  const index = code - S_BASE;
  if (index < 0 || index >= 11172) return undefined;
  const vowelIndex = Math.floor((index % N_COUNT) / T_COUNT);
  return VOWEL_HINTS[vowelIndex];
}

const POLITE_ENDINGS = ['습니다', '세요', 'ㅂ니다'];

export function generateFeedback(sentence: Sentence, result: ScoreResult): FeedbackItem[] {
  const items: FeedbackItem[] = [];

  const weakest = [...result.perSyllable].sort((a, b) => a.score - b.score)[0];
  if (weakest && weakest.score < 75) {
    const hint = vowelHintFor(weakest.syllable) ?? '조금 더 또박또박, 천천히 발음해보세요.';
    items.push({
      id: `warn-${weakest.syllable}`,
      tone: 'warning',
      titleKo: `'${weakest.syllable}' 발음을 확인하세요`,
      detailKo: hint,
    });
  }

  const isPolite = POLITE_ENDINGS.some((ending) => sentence.textKo.includes(ending));
  if (isPolite && result.overall >= 80) {
    items.push({
      id: 'success-polite',
      tone: 'success',
      titleKo: '존댓말 어미를 정확하게 사용했습니다',
      detailKo: '환자 응대에 적합한 격식체를 잘 사용했습니다.',
    });
  }

  if (items.length === 0) {
    items.push({
      id: 'success-overall',
      tone: 'success',
      titleKo: '전체적으로 정확하게 발음했습니다',
      detailKo: '이 속도와 정확도를 유지하며 다음 문장으로 넘어가세요.',
    });
  }

  return items;
}
