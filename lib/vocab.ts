import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getUnits } from './content';
import type { Term, VocabConfig, VocabEntry } from './types';

// 서버 전용 모듈(node:fs 사용).
const VOCAB_FILE = path.join(process.cwd(), 'content', 'vocab.json');

export interface VocabCard extends Term {
  /** 'lesson': 학습 상황의 용어, 'custom': 단어장 편집에서 추가한 단어장 전용 단어 */
  source: 'lesson' | 'custom';
  /** 이 용어가 속한 상황(학습 화면)으로 돌아가기 위한 경로. 단어장 전용 단어는 없음. */
  situationHref?: string;
  situationLabelKo?: string;
  group?: string;
  note?: string;
}

/** 단어장 편집기에 보여줄 상황 용어 한 줄 (용어 + 어느 상황에서 나왔는지). */
export interface LessonTerm extends Term {
  unitId: string;
  situationId: string;
  situationLabelKo: string;
  category: 'basic' | 'practice';
}

export const EMPTY_VOCAB_CONFIG: VocabConfig = { custom: [], lessonOverrides: {} };

/** content/vocab.json을 매번 새로 읽는다. 없거나 깨졌으면 빈 설정(= 상황 용어만 표시). */
export async function getVocabConfig(): Promise<VocabConfig> {
  try {
    const parsed = JSON.parse(await readFile(VOCAB_FILE, 'utf-8'));
    return {
      custom: Array.isArray(parsed?.custom) ? parsed.custom : [],
      lessonOverrides:
        parsed?.lessonOverrides && typeof parsed.lessonOverrides === 'object' ? parsed.lessonOverrides : {},
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[content] vocab.json 을(를) 읽는 데 실패했습니다:', err);
    }
    return EMPTY_VOCAB_CONFIG;
  }
}

export async function saveVocabConfig(config: VocabConfig): Promise<void> {
  const tmp = `${VOCAB_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  await rename(tmp, VOCAB_FILE);
}

/** PUT 본문 검증 + 정리. 문제가 있으면 문자열(오류), 아니면 정리된 설정. */
export function cleanVocabConfig(body: unknown): VocabConfig | string {
  if (!body || typeof body !== 'object') return '본문이 JSON 객체가 아닙니다.';
  const b = body as Partial<VocabConfig>;
  if (!Array.isArray(b.custom)) return 'custom은 배열이어야 합니다.';
  const custom: VocabEntry[] = [];
  const ids = new Set<string>();
  for (const e of b.custom) {
    if (!e || typeof e.id !== 'string' || !e.id.trim()) return '단어의 id가 비어 있습니다.';
    if (ids.has(e.id)) return `단어 id가 중복됩니다: ${e.id}`;
    ids.add(e.id);
    if (typeof e.hangul !== 'string' || !e.hangul.trim()) continue; // 한글이 빈 줄은 저장하지 않는다
    custom.push({
      id: e.id,
      hangul: e.hangul.trim(),
      romanization: String(e.romanization ?? ''),
      glossEn: String(e.glossEn ?? ''),
      ...(e.group ? { group: String(e.group) } : {}),
      ...(e.note ? { note: String(e.note) } : {}),
    });
  }
  const lessonOverrides: VocabConfig['lessonOverrides'] = {};
  for (const [id, o] of Object.entries(b.lessonOverrides ?? {})) {
    if (!o || typeof o !== 'object') continue;
    const clean = {
      ...(o.hidden ? { hidden: true } : {}),
      ...(o.group ? { group: String(o.group) } : {}),
      ...(o.note ? { note: String(o.note) } : {}),
    };
    if (Object.keys(clean).length) lessonOverrides[id] = clean;
  }
  return { custom, lessonOverrides };
}

/** 모든 유닛·상황(기초한글+실습한글)의 용어를 한글 기준으로 중복 제거해 모은다. */
export async function getLessonTerms(): Promise<LessonTerm[]> {
  const units = await getUnits();
  const seen = new Map<string, LessonTerm>();
  for (const unit of units) {
    for (const situation of unit.situations) {
      for (const term of situation.terms) {
        if (seen.has(term.hangul)) continue;
        seen.set(term.hangul, {
          ...term,
          unitId: unit.id,
          situationId: situation.id,
          situationLabelKo: situation.menuLabelKo,
          category: unit.category,
        });
      }
    }
  }
  return Array.from(seen.values());
}

/**
 * 단어장(/vocab) 화면용 데이터 = 상황 용어(숨김 처리한 것 제외) + 단어장 전용 단어.
 * 시안의 "발음 점수"는 실제로 측정한 적 없는 수치라 만들어 넣지 않고, 대신 실제로
 * 들어본 적 있는지(usePracticedTermsStore)로 "학습함/아직"만 구분한다.
 */
export async function getVocabCards(): Promise<VocabCard[]> {
  const [lessonTerms, config] = await Promise.all([getLessonTerms(), getVocabConfig()]);
  const cards: VocabCard[] = [];
  const hanguls = new Set<string>();

  for (const t of lessonTerms) {
    const o = config.lessonOverrides[t.id] ?? {};
    if (o.hidden) continue;
    hanguls.add(t.hangul);
    cards.push({
      id: t.id,
      hangul: t.hangul,
      romanization: t.romanization,
      glossEn: t.glossEn,
      source: 'lesson',
      situationHref: `/learn/${t.unitId}/${t.situationId}`,
      situationLabelKo: t.situationLabelKo,
      group: o.group,
      note: o.note,
    });
  }
  for (const e of config.custom) {
    if (hanguls.has(e.hangul)) continue; // 상황 용어와 같은 단어는 상황 쪽을 우선
    hanguls.add(e.hangul);
    cards.push({ ...e, source: 'custom' });
  }

  return cards.sort((a, b) => a.hangul.localeCompare(b.hangul, 'ko'));
}
