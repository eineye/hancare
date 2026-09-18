import type { DisplayLang } from './store';

/** 상단바·설정 화면의 언어 드롭다운이 공유하는 언어 목록. 실제 뜻풀이 번역
 * 콘텐츠가 있는 건 한국어/영어뿐이다(SUPPORTED_DISPLAY_LANGS 참고). */
export const LANGS: { id: DisplayLang; native: string; ko: string }[] = [
  { id: 'ko', native: '한국어', ko: '한국어' },
  { id: 'en', native: 'English', ko: '영어' },
  { id: 'mn', native: 'Монгол', ko: '몽골어' },
  { id: 'vi', native: 'Tiếng Việt', ko: '베트남어' },
  { id: 'fil', native: 'Filipino', ko: '필리핀어' },
  { id: 'my', native: 'မြန်မာဘာသာ', ko: '미얀마어' },
  { id: 'id', native: 'Bahasa Indonesia', ko: '인도네시아어' },
];
