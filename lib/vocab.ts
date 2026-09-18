import { getUnits } from './content';
import type { Term } from './types';

export interface VocabCard extends Term {
  /** 이 용어가 속한 상황(학습 화면)으로 돌아가기 위한 경로. */
  situationHref: string;
  situationLabelKo: string;
}

/**
 * 단어장(/vocab)용 데이터. content/*.json의 모든 유닛·상황에 등장하는 용어를
 * 모아 중복 제거한다. 시안의 "발음 점수"는 실제로 측정한 적 없는 수치라 만들어
 * 넣지 않고, 대신 학습 화면에서 실제로 들어본 적 있는지(usePracticedTermsStore)로
 * "학습함/아직"만 구분한다.
 */
export async function getVocabCards(): Promise<VocabCard[]> {
  const units = await getUnits();
  const seen = new Map<string, VocabCard>();

  for (const unit of units) {
    for (const situation of unit.situations) {
      for (const term of situation.terms) {
        if (seen.has(term.hangul)) continue;
        seen.set(term.hangul, {
          ...term,
          situationHref: `/learn/${unit.id}/${situation.id}`,
          situationLabelKo: situation.menuLabelKo,
        });
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.hangul.localeCompare(b.hangul, 'ko'));
}
