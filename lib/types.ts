// docs/PROGRAM_DESIGN.md §5 데이터 모델(ER 다이어그램)을 프론트엔드 목데이터용으로 축약한 타입.

export interface Term {
  id: string;
  hangul: string;
  romanization: string;
  glossEn: string;
}

export interface Sentence {
  id: string;
  textKo: string;
  textEn: string;
  romanization: string;
  /** 음절 단위로 쪼갠 배열. RepeatAfterMe/PronunciationScore가 하이라이트에 사용. */
  syllables: string[];
}

export interface Situation {
  id: string;
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  descriptionEn: string;
  placeTag: string;
  formalityTag: string;
  difficultyTag: string;
  terms: Term[];
  sentences: Sentence[];
}

export interface Unit {
  id: string;
  titleKo: string;
  titleEn: string;
  situations: Situation[];
}

export interface SyllableScore {
  syllable: string;
  score: number;
}

export interface ScoreResult {
  overall: number;
  accuracy: number;
  fluency: number;
  intonation: number;
  perSyllable: SyllableScore[];
  /** 텍스트 유사도 기반 근사치임을 명시하기 위한 recognizedText 보관 */
  recognizedText: string;
}

export interface FeedbackItem {
  id: string;
  tone: 'warning' | 'success';
  titleKo: string;
  detailKo: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export type Lang = 'ko' | 'en';
