import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';

// 서버 전용 — 관리자가 "XR실습 편집"에서 올린 Unity WebGL 빌드(.zip)를 압축 해제해
// uploads/xr-builds/{moduleId}/ 에 둔다(영상 업로드와 같은 이유로 public/이 아니다 —
// 운영 서버는 빌드 시점에 있던 public/ 파일만 제공하므로 런타임에 올린 파일은
// uploads/에 두고 /api/xr-builds/[moduleId]/[...path] 라우트로 제공한다. docs/VIDEO_EDITOR_DESIGN.md §5와
// 같은 패턴). 학습 화면(components/XrPracticeScreen.tsx)은 그 라우트의 index.html을
// <iframe>으로 띄운다. docs/XR_MODULE_DESIGN.md 참고.

export const XR_BUILDS_DIR = path.join(process.cwd(), 'uploads', 'xr-builds');
export const XR_BUILD_URL_PREFIX = '/api/xr-builds/';
/** zip 업로드 자체의 최대 크기(스트리밍 수신 단계에서 검사). */
export const MAX_XR_BUILD_UPLOAD_BYTES = 400 * 1024 * 1024;
/** 압축 해제 후 합계 용량 한도(zip 폭탄 방지). */
const MAX_UNCOMPRESSED_BYTES = 800 * 1024 * 1024;
const MAX_ENTRY_COUNT = 8000;

const SAFE_MODULE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** XrModule.id가 `uploads/xr-builds/{id}/` 폴더명으로 안전하게 쓰일 수 있는지. */
export function isSafeModuleId(id: string): boolean {
  return SAFE_MODULE_ID.test(id);
}

const MIME_BY_EXT: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.mem': 'application/octet-stream',
  '.symbols': 'application/octet-stream',
  '.unityweb': 'application/octet-stream',
  '.bin': 'application/octet-stream',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

/** Unity WebGL 압축 빌드(.data.gz/.wasm.br 등)는 .gz·.br를 뗀 나머지 확장자로 Content-Type을
 * 정하고, 뗀 확장자를 Content-Encoding으로 붙여야 브라우저가 올바르게 풀어서 쓴다. */
export function xrBuildFileHeaders(fileName: string): { contentType: string; contentEncoding?: string } {
  let name = fileName;
  let contentEncoding: string | undefined;
  if (name.toLowerCase().endsWith('.gz')) {
    contentEncoding = 'gzip';
    name = name.slice(0, -3);
  } else if (name.toLowerCase().endsWith('.br')) {
    contentEncoding = 'br';
    name = name.slice(0, -3);
  }
  const contentType = MIME_BY_EXT[path.extname(name).toLowerCase()] ?? 'application/octet-stream';
  return contentEncoding ? { contentType, contentEncoding } : { contentType };
}

/** moduleId의 빌드 폴더 밑에서 상대경로(요청 URL의 나머지 부분)가 가리키는 실제 파일 경로.
 * `..`·절대경로 등으로 폴더를 벗어나려 하면 undefined. */
export function resolveXrBuildFile(moduleId: string, relPathSegments: string[]): string | undefined {
  if (!isSafeModuleId(moduleId)) return undefined;
  if (relPathSegments.length === 0) return undefined;
  if (relPathSegments.some((seg) => !seg || seg === '.' || seg === '..')) return undefined;
  const dir = path.join(XR_BUILDS_DIR, moduleId);
  const resolved = path.join(dir, ...relPathSegments);
  const rel = path.relative(dir, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return undefined;
  return resolved;
}

/** 압축을 푼 파일들 중 index.html이 공통으로 한 단계 안에 있으면(Unity 빌드 폴더 전체를
 * 그대로 압축한 경우) 그 폴더 이름을 벗겨 zip 바로 밑에 쓴 것처럼 맞춘다. */
function findCommonRootDir(names: string[]): string {
  if (names.length === 0) return '';
  const firstSlash = names[0].indexOf('/');
  if (firstSlash === -1) return '';
  const candidate = names[0].slice(0, firstSlash + 1);
  return names.every((n) => n.startsWith(candidate)) ? candidate : '';
}

export interface ExtractResult {
  /** 학습 화면이 그대로 iframe에 넣을 수 있는 공개 URL. */
  buildUrl: string;
  fileCount: number;
}

/**
 * 업로드된 zip 버퍼를 검증 후 `uploads/xr-builds/{moduleId}/`에 푼다.
 * 경로 탈출(zip-slip)·zip 폭탄·index.html 누락을 먼저 전부 확인하고, 문제가 없을 때만
 * 디스크에 쓴다(기존 빌드가 있었으면 통째로 지우고 새로 쓴다).
 */
export async function extractXrBuild(moduleId: string, zipBuffer: Buffer): Promise<ExtractResult> {
  if (!isSafeModuleId(moduleId)) throw new Error('모듈 id 형식이 올바르지 않습니다(영문 소문자·숫자·하이픈만).');

  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch {
    throw new Error('zip 파일을 열 수 없습니다. 올바른 zip 파일인지 확인해주세요.');
  }
  const entries = zip.getEntries();
  if (entries.length === 0) throw new Error('빈 zip 파일입니다.');
  if (entries.length > MAX_ENTRY_COUNT) throw new Error(`파일이 너무 많습니다(최대 ${MAX_ENTRY_COUNT}개).`);

  const fileNames = entries.filter((e) => !e.isDirectory).map((e) => e.entryName.replace(/\\/g, '/'));
  const commonPrefix = findCommonRootDir(fileNames);

  let totalSize = 0;
  const safeEntries: { data: () => Buffer; relPath: string }[] = [];
  for (const entry of entries) {
    const rawName = entry.entryName.replace(/\\/g, '/');
    const stripped = commonPrefix && rawName.startsWith(commonPrefix) ? rawName.slice(commonPrefix.length) : rawName;
    if (!stripped) continue;
    const normalized = path.normalize(stripped);
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      throw new Error(`허용되지 않는 경로가 포함되어 있습니다: ${entry.entryName}`);
    }
    if (entry.isDirectory) continue;
    totalSize += entry.header.size;
    if (totalSize > MAX_UNCOMPRESSED_BYTES) {
      throw new Error(`압축 해제 용량이 너무 큽니다(최대 ${MAX_UNCOMPRESSED_BYTES / 1024 / 1024}MB).`);
    }
    safeEntries.push({ data: () => entry.getData(), relPath: normalized });
  }
  if (safeEntries.length === 0) throw new Error('zip 안에 파일이 없습니다.');

  const indexRel =
    safeEntries.map((s) => s.relPath).find((p) => p.toLowerCase() === 'index.html') ??
    safeEntries.map((s) => s.relPath).find((p) => p.toLowerCase().endsWith('/index.html'));
  if (!indexRel) {
    throw new Error('압축 파일 안에서 index.html을 찾지 못했습니다. Unity WebGL 빌드 결과물(Build/TemplateData/index.html)을 통째로 압축했는지 확인해주세요.');
  }

  const targetDir = path.join(XR_BUILDS_DIR, moduleId);
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });
  for (const { data, relPath } of safeEntries) {
    const dest = path.join(targetDir, relPath);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, data());
  }

  return {
    buildUrl: XR_BUILD_URL_PREFIX + moduleId + '/' + indexRel.split(path.sep).join('/'),
    fileCount: safeEntries.length,
  };
}

/** 모듈이 삭제되거나 빌드가 교체될 때 이전 빌드 폴더를 통째로 지운다. */
export async function deleteXrBuild(moduleId: string): Promise<void> {
  if (!isSafeModuleId(moduleId)) return;
  await rm(path.join(XR_BUILDS_DIR, moduleId), { recursive: true, force: true });
}
