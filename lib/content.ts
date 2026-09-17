import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Sentence, Situation, Unit, XrModule } from './types';

// 서버 전용 모듈(node:fs 사용) — 클라이언트 컴포넌트에서 import하면 안 된다.
// 실습내용(기초한글/실습한글)을 웹팩 번들에 정적으로 넣지 않고, content/ 아래
// JSON 파일을 매 요청마다 다시 읽는다. 그래서 운영 중에도 재빌드/재배포 없이
// 이 파일들만 교체하면 바로 반영된다 — content/README.md 참고.
const CONTENT_DIR = path.join(process.cwd(), 'content');
const CONTENT_FILES = ['practice-hangul.json', 'basic-hangul.json'];

async function readUnitsFile(filename: string): Promise<Unit[]> {
  try {
    const raw = await readFile(path.join(CONTENT_DIR, filename), 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('최상위 값은 유닛 배열(Unit[])이어야 합니다.');
    }
    return parsed as Unit[];
  } catch (err) {
    // 콘텐츠 파일을 수시로 손으로 편집하는 걸 전제로 하므로, JSON 문법 오류 등으로
    // 한 파일이 깨져도 앱 전체가 죽지 않고 그 파일만 빈 목록으로 취급한다.
    console.error(`[content] ${filename} 을(를) 읽는 데 실패했습니다:`, err);
    return [];
  }
}

/** content/ 아래 모든 유닛 파일을 읽어 합친다. 매 호출마다 디스크에서 새로 읽는다. */
export async function getUnits(): Promise<Unit[]> {
  const lists = await Promise.all(CONTENT_FILES.map(readUnitsFile));
  return lists.flat();
}

export async function getUnitsByCategory(category: Unit['category']): Promise<Unit[]> {
  const units = await getUnits();
  return units.filter((u) => u.category === category);
}

export async function getUnit(unitId: string): Promise<Unit | undefined> {
  const units = await getUnits();
  return units.find((u) => u.id === unitId);
}

export async function getSituation(
  unitId: string,
  situationId: string,
): Promise<{ unit: Unit; situation: Situation } | undefined> {
  const unit = await getUnit(unitId);
  const situation = unit?.situations.find((s) => s.id === situationId);
  if (!unit || !situation) return undefined;
  return { unit, situation };
}

export async function findAdjacentSituation(
  unitId: string,
  situationId: string,
  direction: 1 | -1,
): Promise<{ unitId: string; situationId: string } | undefined> {
  const unit = await getUnit(unitId);
  if (!unit) return undefined;
  const index = unit.situations.findIndex((s) => s.id === situationId);
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= unit.situations.length) return undefined;
  return { unitId: unit.id, situationId: unit.situations[nextIndex].id };
}

export function getFirstSentence(situation: Situation): Sentence {
  return situation.sentences[0];
}

export async function unitProgress(unitId: string, situationId: string) {
  const unit = await getUnit(unitId);
  if (!unit) return { current: 0, total: 0 };
  const index = unit.situations.findIndex((s) => s.id === situationId);
  return { current: index + 1, total: unit.situations.length };
}

/** XR실습(HnaCare XR) 5대 모듈. docs/XR_MODULE_DESIGN.md 참고. 다른 콘텐츠와 마찬가지로
 * content/xr-modules.json을 매 요청마다 새로 읽는다. */
export async function getXrModules(): Promise<XrModule[]> {
  try {
    const raw = await readFile(path.join(CONTENT_DIR, 'xr-modules.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('최상위 값은 모듈 배열(XrModule[])이어야 합니다.');
    return (parsed as XrModule[]).sort((a, b) => a.order - b.order);
  } catch (err) {
    console.error('[content] xr-modules.json 을(를) 읽는 데 실패했습니다:', err);
    return [];
  }
}

export async function getXrModule(moduleId: string): Promise<XrModule | undefined> {
  const modules = await getXrModules();
  return modules.find((m) => m.id === moduleId);
}
