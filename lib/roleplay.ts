import type { RoleplayScenario, Term } from './types';

// 서버·클라이언트 공용(순수 함수). 역할극 시나리오 키와 규칙 응답.
// hangulcare.html의 mockPatientReply()도 같은 규칙을 따른다.

export function roleplayKey(unitId: string, situationId: string): string {
  return `${unitId}/${situationId}`;
}

export const DEFAULT_FALLBACK_KO = '네, 알겠습니다.';

/** 규칙 응답: 편집기에서 정한 키워드 → 상황 용어 언급 → 통증/감사 → 기본 대사 순으로 고른다. */
export function ruleReply(scenario: RoleplayScenario | undefined, message: string, terms: Pick<Term, 'hangul'>[]): string {
  const text = message.trim();
  for (const rule of scenario?.replies ?? []) {
    if (rule.replyKo && rule.keywords.some((k) => k.trim() && text.includes(k.trim()))) return rule.replyKo;
  }
  const term = terms.find((t) => text.includes(t.hangul));
  if (term) return `네, ${term.hangul} 확인 감사합니다.`;
  if (text.includes('아프') || text.includes('통증')) return '네, 조금 아파요. 잘 부탁드립니다.';
  if (text.includes('감사')) return '저도 감사합니다.';
  return scenario?.fallbackKo?.trim() || DEFAULT_FALLBACK_KO;
}
