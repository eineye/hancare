// Gemini 2.5 TTS 음색 카탈로그. 서버(app/api/tts*)와 클라이언트(관리자 설정 화면)
// 양쪽에서 쓰는 순수 데이터 모듈이라 node:fs 등 서버 전용 모듈은 import하지 않는다.
//
// Gemini의 사전 설정 음색은 공식적으로 성별을 표시하지 않지만(이름 + 짧은 스타일
// 태그만 제공), 관리자가 "남/녀, 표준 아나운서, 친근한 대화체, 안내방송톤, 또박또박한
// 스타일"처럼 바로 고를 수 있는 목록을 요청했으므로, 공식 문서가 설명하는 각 음색의
// 스타일(Firm/Informative/Upbeat/Breezy/Bright/Youthful 등)을 참고해 아래처럼
// 8종으로 선별·분류했다. 느낌표로 단정할 수 없는 "성별감"은 참고용 라벨이니, 관리자
// 설정 화면의 미리듣기로 직접 들어보고 고르는 것을 권장한다.
export interface TtsVoiceOption {
  id: string;
  /** Gemini TTS 사전 설정 음색 이름(speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName). */
  voiceName: string;
  labelKo: string;
  descKo: string;
}

export const TTS_VOICE_OPTIONS: TtsVoiceOption[] = [
  { id: 'kore-announcer-f', voiceName: 'Kore', labelKo: '여성 · 표준 아나운서', descKo: '또렷하고 안정적인 기본 여성 음색' },
  { id: 'charon-announcer-m', voiceName: 'Charon', labelKo: '남성 · 표준 아나운서', descKo: '차분하고 신뢰감 있는 기본 남성 음색' },
  { id: 'aoede-friendly-f', voiceName: 'Aoede', labelKo: '여성 · 친근한 대화체', descKo: '가볍고 편안하게 대화하듯 말하는 음색' },
  { id: 'puck-friendly-m', voiceName: 'Puck', labelKo: '남성 · 친근한 대화체', descKo: '밝고 경쾌하게 대화하듯 말하는 음색' },
  { id: 'zephyr-announcement-f', voiceName: 'Zephyr', labelKo: '여성 · 안내방송톤', descKo: '밝고 또렷하게 알려주는 안내방송 음색' },
  { id: 'orus-announcement-m', voiceName: 'Orus', labelKo: '남성 · 안내방송톤', descKo: '단단하고 또렷하게 알려주는 안내방송 음색' },
  { id: 'leda-clear-f', voiceName: 'Leda', labelKo: '여성 · 또박또박한 스타일', descKo: '젊고 또렷하게 음절을 끊어 말하는 음색' },
  { id: 'fenrir-clear-m', voiceName: 'Fenrir', labelKo: '남성 · 또박또박한 스타일', descKo: '힘있고 또렷하게 음절을 끊어 말하는 음색' },
];

export const DEFAULT_TTS_VOICE_ID = 'kore-announcer-f';

/** 관리자 설정 화면·학습 화면 미리듣기에 쓰는 공통 예문(간호조무 실습 맥락 문장). */
export const TTS_PREVIEW_TEXT_KO = '안녕하세요, 혈압 좀 재겠습니다.';

export function isTtsVoiceId(id: unknown): id is string {
  return typeof id === 'string' && TTS_VOICE_OPTIONS.some((v) => v.id === id);
}

export function getTtsVoiceOption(id: string | undefined): TtsVoiceOption {
  return (
    TTS_VOICE_OPTIONS.find((v) => v.id === id) ??
    TTS_VOICE_OPTIONS.find((v) => v.id === DEFAULT_TTS_VOICE_ID) ??
    TTS_VOICE_OPTIONS[0]
  );
}
