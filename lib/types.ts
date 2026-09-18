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
  /** 진도관리(코스 선택) 화면 메뉴에 쓰는 짧은 이름. titleKo/En은 상황 설명 문장이라 메뉴에는 부적합. */
  menuLabelKo: string;
  menuLabelEn: string;
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
  /** 진도관리 화면에서 이 유닛을 기초한글/실습한글 중 어디에 넣을지 결정한다. */
  category: 'basic' | 'practice';
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

/** XR실습(HnaCare XR) 모듈 내 하나의 3D 인터랙션. 실제 3D/물리 연산 결과 대신
 * 목데이터 결과 문구를 보여주는 프로토타입 단계 스키마다. */
export interface XrInteraction {
  id: string;
  labelKo: string;
  labelEn: string;
  resultKo: string;
  resultEn: string;
}

/** XR실습 5대 모듈. docs/XR_MODULE_DESIGN.md 참고. */
export interface XrModule {
  id: string;
  order: number;
  titleKo: string;
  titleEn: string;
  /** 국가 자격 기준 법정 실습시간(시간 단위) */
  legalHours: number;
  patientNameKo: string;
  situationKo: string;
  situationEn: string;
  /** 실제 적용 예정 기술 스택(참고용 표시 문구, PDF 스펙 그대로) */
  techNoteKo: string;
  interactions: XrInteraction[];
}

/** 관리자 진도관리 화면용 학습자 요약. 실제 다중 사용자 백엔드가 없어 목데이터다. */
export interface Learner {
  id: string;
  name: string;
  nationality: string;
  level: string;
  department: string;
  wordsPracticed: number;
  avgAccuracy: number;
  lastActiveKo: string;
  needsAttentionKo?: string;
}

/** 실습 일지(진도관리 > 실습일지) 한 건. 이 브라우저의 localStorage에 실제로
 * 저장/조회된다 — 지도자 확인·의견은 실제 멘토 계정이 없어 예시 1건만 보여준다. */
export interface JournalEntry {
  id: string;
  dateKo: string;
  department: string;
  notesKo: string;
  tags: string[];
  createdAt: number;
}
