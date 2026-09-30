import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RoleplayConfig, RoleplayScenario, Unit, VideoCue, VideoCueTerm, VideoLesson, XrInteraction, XrModule } from './types';

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

/* ---------------- XR실습 모듈 (content/xr-modules.json) ---------------- */

/** XR실습 편집기(public/hancare-xr-editor.html) 저장 — 모듈 배열 전체를 교체한다.
 * 배열 순서대로 order를 1부터 다시 매긴다. 문제가 있으면 오류 메시지를 돌려준다. */
export function cleanXrModules(body: unknown): XrModule[] | string {
  if (!Array.isArray(body)) return '본문은 모듈 배열이어야 합니다.';
  const ids = new Set<string>();
  const out: XrModule[] = [];
  for (const [i, raw] of body.entries()) {
    const m = raw as Partial<XrModule>;
    if (!m || typeof m.id !== 'string' || !m.id.trim()) return `${i + 1}번째 모듈의 id가 비어 있습니다.`;
    if (ids.has(m.id)) return `모듈 id가 중복됩니다: ${m.id}`;
    ids.add(m.id);
    if (!Array.isArray(m.interactions)) return `${m.id}: interactions는 배열이어야 합니다.`;
    const itIds = new Set<string>();
    const interactions: XrInteraction[] = [];
    for (const it of m.interactions) {
      if (!it || typeof it.id !== 'string' || !it.id.trim()) return `${m.id}: 인터랙션 id가 비어 있습니다.`;
      if (itIds.has(it.id)) return `${m.id}: 인터랙션 id가 중복됩니다: ${it.id}`;
      itIds.add(it.id);
      interactions.push({
        id: it.id,
        labelKo: String(it.labelKo ?? ''),
        labelEn: String(it.labelEn ?? ''),
        resultKo: String(it.resultKo ?? ''),
        resultEn: String(it.resultEn ?? ''),
      });
    }
    const hours = Number(m.legalHours);
    out.push({
      id: m.id,
      order: i + 1,
      titleKo: String(m.titleKo ?? ''),
      titleEn: String(m.titleEn ?? ''),
      legalHours: Number.isFinite(hours) && hours >= 0 ? hours : 0,
      patientNameKo: String(m.patientNameKo ?? ''),
      situationKo: String(m.situationKo ?? ''),
      situationEn: String(m.situationEn ?? ''),
      techNoteKo: String(m.techNoteKo ?? ''),
      interactions,
    });
  }
  return out;
}

export function saveXrModules(modules: XrModule[]): Promise<void> {
  return serialize(async () => {
    const target = path.join(CONTENT_DIR, 'xr-modules.json');
    const tmp = `${target}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(modules, null, 2) + '\n', 'utf-8');
    await rename(tmp, target);
  });
}

/* ---------------- 역할극 시나리오 (content/roleplays.json) ---------------- */

const ROLEPLAY_FILE = path.join(CONTENT_DIR, 'roleplays.json');

/** 매번 새로 읽는다. 없거나 깨졌으면 빈 설정(= 모든 상황 기본 역할극). */
export async function getRoleplayConfig(): Promise<RoleplayConfig> {
  try {
    const parsed = JSON.parse(await readFile(ROLEPLAY_FILE, 'utf-8'));
    return { scenarios: parsed?.scenarios && typeof parsed.scenarios === 'object' ? parsed.scenarios : {} };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[content] roleplays.json 을(를) 읽는 데 실패했습니다:', err);
    }
    return { scenarios: {} };
  }
}

export async function getRoleplayScenario(unitId: string, situationId: string): Promise<RoleplayScenario | undefined> {
  const config = await getRoleplayConfig();
  return config.scenarios[`${unitId}/${situationId}`];
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

/** PUT 본문 정리 — 빈 필드는 빼고, 내용이 하나도 없는 시나리오는 저장하지 않는다. */
export function cleanRoleplayConfig(body: unknown): RoleplayConfig | string {
  if (!body || typeof body !== 'object') return '본문이 JSON 객체가 아닙니다.';
  const raw = (body as Partial<RoleplayConfig>).scenarios;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'scenarios는 객체여야 합니다.';
  const scenarios: RoleplayConfig['scenarios'] = {};
  for (const [key, s] of Object.entries(raw)) {
    if (!s || typeof s !== 'object') continue;
    const replies = (Array.isArray(s.replies) ? s.replies : [])
      .map((r) => ({
        keywords: (Array.isArray(r?.keywords) ? r.keywords : []).map(String).map((k) => k.trim()).filter(Boolean),
        replyKo: String(r?.replyKo ?? '').trim(),
      }))
      .filter((r) => r.keywords.length && r.replyKo);
    const hintsKo = (Array.isArray(s.hintsKo) ? s.hintsKo : []).map(String).map((h) => h.trim()).filter(Boolean);
    const clean: RoleplayScenario = {
      ...(s.enabled === false ? { enabled: false } : {}),
      ...(str(s.patientNameKo) ? { patientNameKo: str(s.patientNameKo) } : {}),
      ...(str(s.patientProfileKo) ? { patientProfileKo: str(s.patientProfileKo) } : {}),
      ...(str(s.goalKo) ? { goalKo: str(s.goalKo) } : {}),
      ...(str(s.openingKo) ? { openingKo: str(s.openingKo) } : {}),
      ...(str(s.personaKo) ? { personaKo: str(s.personaKo) } : {}),
      ...(replies.length ? { replies } : {}),
      ...(str(s.fallbackKo) ? { fallbackKo: str(s.fallbackKo) } : {}),
      ...(hintsKo.length ? { hintsKo } : {}),
    };
    if (Object.keys(clean).length) scenarios[key] = clean;
  }
  return { scenarios };
}

export function saveRoleplayConfig(config: RoleplayConfig): Promise<void> {
  return serialize(async () => {
    const tmp = `${ROLEPLAY_FILE}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    await rename(tmp, ROLEPLAY_FILE);
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

/* ---------------- 영상학습 (content/videos.json) ---------------- */

const VIDEOS_FILE = path.join(CONTENT_DIR, 'videos.json');
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** 영상 에디터(라이브러리 에디터 "영상" 메뉴) 저장 본문 검증·정리. 배열 순서대로 order를 1부터
 * 다시 매긴다. 문제가 있으면 오류 메시지를 돌려준다. docs/VIDEO_EDITOR_DESIGN.md §5. */
export function cleanVideos(body: unknown): VideoLesson[] | string {
  if (!Array.isArray(body)) return '본문은 영상 배열이어야 합니다.';
  const ids = new Set<string>();
  const out: VideoLesson[] = [];
  for (const [i, raw] of body.entries()) {
    const v = raw as Partial<VideoLesson>;
    if (!v || typeof v.id !== 'string' || !ID_PATTERN.test(v.id)) {
      return `${i + 1}번째 영상의 id는 영문 소문자·숫자·-만 쓸 수 있습니다.`;
    }
    if (ids.has(v.id)) return `영상 id가 중복됩니다: ${v.id}`;
    ids.add(v.id);
    if (!Array.isArray(v.cues)) return `${v.id}: cues는 배열이어야 합니다.`;
    const cueIds = new Set<string>();
    const cues: VideoCue[] = [];
    for (const [ci, c] of v.cues.entries()) {
      const start = num(c?.start);
      const end = num(c?.end);
      if (!c || typeof c.id !== 'string' || !c.id.trim()) return `${v.id}: ${ci + 1}번째 자막의 id가 비어 있습니다.`;
      if (cueIds.has(c.id)) return `${v.id}: 자막 id가 중복됩니다: ${c.id}`;
      cueIds.add(c.id);
      if (!(start >= 0) || !(end > start)) return `${v.id}: ${ci + 1}번째 자막의 시간이 올바르지 않습니다(끝이 시작보다 커야 함).`;
      const terms: VideoCueTerm[] = Array.isArray(c.terms)
        ? c.terms
            .filter((t) => t && typeof t.hangul === 'string' && t.hangul.trim())
            .map((t) => ({ hangul: t.hangul.trim(), glossEn: String(t.glossEn ?? '').trim() }))
        : [];
      cues.push({
        id: c.id,
        start: Math.round(start * 10) / 10,
        end: Math.round(end * 10) / 10,
        ...(typeof c.speakerKo === 'string' && c.speakerKo.trim() ? { speakerKo: c.speakerKo.trim() } : {}),
        textKo: String(c.textKo ?? ''),
        textEn: String(c.textEn ?? ''),
        ...(terms.length ? { terms } : {}),
      });
    }
    cues.sort((a, b) => a.start - b.start);
    const duration = num(v.durationSec);
    const related = v.related;
    out.push({
      id: v.id,
      order: out.length + 1,
      titleKo: String(v.titleKo ?? ''),
      titleEn: String(v.titleEn ?? ''),
      descriptionKo: String(v.descriptionKo ?? ''),
      src: String(v.src ?? ''),
      poster: String(v.poster ?? ''),
      durationSec: duration > 0 ? Math.ceil(duration) : Math.ceil(cues.length ? cues[cues.length - 1].end : 0),
      levelTag: String(v.levelTag ?? ''),
      ...(related && related.unitId && related.situationId
        ? { related: { unitId: String(related.unitId), situationId: String(related.situationId), labelKo: String(related.labelKo ?? '') } }
        : {}),
      cues,
    });
  }
  return out;
}

export function saveVideos(videos: VideoLesson[]): Promise<void> {
  return serialize(async () => {
    const tmp = `${VIDEOS_FILE}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(videos, null, 2) + '\n', 'utf-8');
    await rename(tmp, VIDEOS_FILE);
  });
}
