// docs/PROGRAM_DESIGN.md §5 데이터 모델(ER 다이어그램)을 프론트엔드 목데이터용으로 축약한 타입.

export interface Term {
  id: string;
  hangul: string;
  romanization: string;
  glossEn: string;
}

/** 단어장 전용으로 추가한 단어 (content/vocab.json의 custom). 학습 상황에는 속하지 않는다. */
export interface VocabEntry extends Term {
  /** 단어장 화면의 분류 필터에 쓰는 이름 (예: "활력징후"). */
  group?: string;
  note?: string;
}

/** 상황 용어(content/*.json의 terms)를 단어장에서 어떻게 보여줄지. 용어 자체는 실습내용 편집에서 고친다. */
export interface VocabLessonOverride {
  hidden?: boolean;
  group?: string;
  note?: string;
}

/** content/vocab.json — 단어장 편집기가 저장하는 설정. */
export interface VocabConfig {
  custom: VocabEntry[];
  /** 상황 용어 id → 단어장 표시 설정 */
  lessonOverrides: Record<string, VocabLessonOverride>;
}

/** content/ttsSettings.json — 관리자 설정(/admin/voice-settings)이 저장하는 학습 음성(TTS) 설정.
 * voiceId는 lib/ttsVoices.ts의 TTS_VOICE_OPTIONS 중 하나를 가리킨다. */
export interface TtsSettings {
  voiceId: string;
}

/** 역할극 규칙 응답 — 학습자 말에 키워드 중 하나가 들어 있으면 이 대사로 답한다. */
export interface RoleplayReplyRule {
  keywords: string[];
  replyKo: string;
}

/** 상황 하나의 역할극 시나리오 (content/roleplays.json). 모든 필드는 선택이며, 비어 있으면 기본 동작. */
export interface RoleplayScenario {
  /** false면 이 상황의 역할극을 열지 않는다. */
  enabled?: boolean;
  patientNameKo?: string;
  /** 예: "72세 남성, 고혈압으로 입원 3일째" */
  patientProfileKo?: string;
  /** 학습자에게 보여줄 목표 */
  goalKo?: string;
  /** 환자의 첫 대사 */
  openingKo?: string;
  /** AI(Gemini)에게 주는 환자 성격·말투·증상 설정 */
  personaKo?: string;
  /** Gemini를 쓸 수 없을 때(키 없음·단일 파일판) 쓰는 규칙 응답 */
  replies?: RoleplayReplyRule[];
  /** 규칙에 맞는 응답이 없을 때의 대사 */
  fallbackKo?: string;
  /** 학습자에게 보여줄 추천 표현 (누르면 입력창에 채워짐) */
  hintsKo?: string[];
}

export interface RoleplayConfig {
  /** 키: `${unitId}/${situationId}` */
  scenarios: Record<string, RoleplayScenario>;
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
  /** 개인 세부현황 팝업(주차별 점수 추이)용 예시 값 6개. 실제 주차별 이력을
   * 저장하는 백엔드가 없어 목데이터다. */
  weeklyScores: number[];
  /** 개인 세부현황 팝업의 "약한 발음 요소" 예시 값. 실제 음소 단위 분석은
   * 하지 않으므로 목데이터다. */
  weakSounds: { labelKo: string; value: number; warn: boolean }[];
  /** 이 학습자가 "완료"한 상황(situation) id 목록 — content/*.json의 실제
   * 유닛·상황 구조에 맞춰 진도표를 그리는 데 쓴다. 실제 다중 사용자 백엔드가
   * 없어 목데이터로 미리 채워 둔 값이다. */
  completedSituationIds: string[];
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

/** 영상학습 자막 한 줄에 달린 어휘 주석. 자막에서 강조 표시되고 탭하면 바로 질문 대상이 된다. */
export interface VideoCueTerm {
  hangul: string;
  glossEn: string;
}

/** 영상학습 자막 한 줄(초 단위 구간). docs/VIDEO_MODULE_DESIGN.md §5 참고. */
export interface VideoCue {
  id: string;
  start: number;
  end: number;
  /** 화자 표시(예: "간호조무사", "환자"). 없으면 생략. */
  speakerKo?: string;
  textKo: string;
  textEn: string;
  terms?: VideoCueTerm[];
}

/** 영상학습(/video) 한 편. 영상 파일은 public/videos/ 아래 자체 MP4를 쓴다. */
export interface VideoLesson {
  id: string;
  order: number;
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  /** public 기준 경로(/videos/xxx.mp4) 또는 절대 URL. 비었거나 재생 실패 시 자막 연습 모드로 대체된다. */
  src: string;
  poster?: string;
  durationSec: number;
  levelTag: string;
  /** 연결된 실습한글 상황(있으면 "관련 학습" 링크를 보여준다). */
  related?: { unitId: string; situationId: string; labelKo: string };
  cues: VideoCue[];
}
