import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Unit } from './types';

// 서버 전용 모듈 — 실습내용 편집기(public/hancare-library-editor.html)가 쓰는
// /api/hangul-library 라우트에서 content/*.json 파일을 직접 고쳐 쓴다.
// lib/content.ts가 매 요청마다 같은 파일을 다시 읽으므로, 여기서 저장하면
// 학습자 화면에도 재빌드 없이 바로 반영된다.
const CONTENT_DIR = path.join(process.cwd(), 'content');

/** 유닛 category → 저장할 파일. lib/content.ts의 CONTENT_FILES와 맞춰야 한다. */
const FILE_BY_CATEGORY: Record<Unit['category'], string> = {
  practice: 'practice-hangul.json',
  basic: 'basic-hangul.json',
};
const FILES = Object.values(FILE_BY_CATEGORY);

async function readUnits(filename: string): Promise<Unit[]> {
  const raw = await readFile(path.join(CONTENT_DIR, filename), 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`${filename}: 최상위 값은 유닛 배열이어야 합니다.`);
  return parsed as Unit[];
}

async function writeUnits(filename: string, units: Unit[]): Promise<void> {
  // 쓰는 도중 서버가 같은 파일을 읽어도 반쯤 쓴 JSON을 보지 않도록 임시 파일에 쓰고 교체한다.
  const target = path.join(CONTENT_DIR, filename);
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(units, null, 2) + '\n', 'utf-8');
  await rename(tmp, target);
}

// 편집기는 유닛마다 PUT을 동시에 여러 개 보낼 수 있으므로(엑셀/JSON 불러오기),
// 읽기-수정-쓰기가 서로 덮어쓰지 않게 모든 쓰기를 한 줄로 직렬화한다.
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/** 편집기용 전체 유닛 목록. 기초한글·실습한글 파일을 합쳐 파일 순서대로 돌려준다. */
export async function listLibraryUnits(): Promise<(Unit & { order: number })[]> {
  const lists = await Promise.all(FILES.map(readUnits));
  return lists.flat().map((u, i) => ({ ...u, order: i }));
}

/** 유닛 하나를 생성/수정한다. category가 바뀌면 다른 파일로 옮긴다. */
export function saveLibraryUnit(unit: Unit): Promise<void> {
  return serialize(async () => {
    const clean: Unit = {
      id: unit.id,
      category: unit.category,
      titleKo: unit.titleKo,
      titleEn: unit.titleEn,
      situations: unit.situations,
    };
    const targetFile = FILE_BY_CATEGORY[unit.category];
    for (const file of FILES) {
      const units = await readUnits(file);
      const index = units.findIndex((u) => u.id === unit.id);
      if (file === targetFile) {
        if (index >= 0) units[index] = clean;
        else units.push(clean);
        await writeUnits(file, units);
      } else if (index >= 0) {
        units.splice(index, 1);
        await writeUnits(file, units);
      }
    }
  });
}

/** 유닛을 삭제한다. 없으면 false. */
export function deleteLibraryUnit(unitId: string): Promise<boolean> {
  return serialize(async () => {
    let found = false;
    for (const file of FILES) {
      const units = await readUnits(file);
      const next = units.filter((u) => u.id !== unitId);
      if (next.length !== units.length) {
        found = true;
        await writeUnits(file, next);
      }
    }
    return found;
  });
}

/** PUT 본문 최소 검증. 문제가 있으면 오류 메시지, 없으면 undefined. */
export function validateUnit(body: unknown, idFromPath: string): string | undefined {
  if (!body || typeof body !== 'object') return '본문이 유닛 JSON 객체가 아닙니다.';
  const u = body as Partial<Unit>;
  if (typeof u.id !== 'string' || !u.id.trim()) return 'id가 비어 있습니다.';
  if (u.id !== idFromPath) return `경로의 id(${idFromPath})와 본문의 id(${u.id})가 다릅니다.`;
  if (u.category !== 'basic' && u.category !== 'practice') return 'category는 "basic" 또는 "practice"여야 합니다.';
  if (!Array.isArray(u.situations)) return 'situations는 배열이어야 합니다.';
  return undefined;
}
