import { stat } from 'node:fs/promises';
import path from 'node:path';

// 서버 전용 — 영상 에디터가 올린 영상 파일 관리. docs/VIDEO_EDITOR_DESIGN.md §5.
// Next.js 운영 서버는 빌드 시점에 있던 public/ 파일만 제공하므로, 런타임 업로드는
// uploads/videos/에 두고 /api/videos/file/:name 라우트로 제공한다(git 제외).
export const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'videos');
export const UPLOAD_SRC_PREFIX = '/api/videos/file/';
export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

export function videoMime(fileName: string): string | undefined {
  return MIME_BY_EXT[path.extname(fileName).toLowerCase()];
}

/** 원래 파일 이름을 URL·파일시스템에 안전한 이름으로 바꾼다. 허용하지 않는 확장자면 undefined. */
export function safeVideoName(original: string): string | undefined {
  const ext = path.extname(original).toLowerCase();
  if (!MIME_BY_EXT[ext]) return undefined;
  const base = path
    .basename(original, path.extname(original))
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
  // 한글 등으로만 된 이름은 남는 글자가 없으므로 올린 시각으로 이름을 만든다.
  return `${base || `video-${Date.now().toString(36)}`}${ext}`;
}

/** 업로드 라우트가 준 이름(경로 탐색 없는 단일 파일명)인지 확인한다. */
export function isPlainFileName(name: string): boolean {
  return /^[a-z0-9][a-z0-9_.-]*$/i.test(name) && !name.includes('..') && !!videoMime(name);
}

/** 영상 src를 서버 안의 실제 파일 경로로 바꾼다. 업로드 파일과 public/videos/ 파일만 허용. */
export async function resolveLocalVideo(src: string): Promise<string | undefined> {
  let file: string | undefined;
  if (src.startsWith(UPLOAD_SRC_PREFIX)) {
    const name = decodeURIComponent(src.slice(UPLOAD_SRC_PREFIX.length));
    if (isPlainFileName(name)) file = path.join(UPLOAD_DIR, name);
  } else if (src.startsWith('/videos/')) {
    const name = decodeURIComponent(src.slice('/videos/'.length));
    if (isPlainFileName(name)) file = path.join(process.cwd(), 'public', 'videos', name);
  }
  if (!file) return undefined;
  try {
    return (await stat(file)).isFile() ? file : undefined;
  } catch {
    return undefined;
  }
}
