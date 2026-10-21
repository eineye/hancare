import { createWriteStream } from 'node:fs';
import { access, mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { NextResponse, type NextRequest } from 'next/server';
import { DAY, HOUR, clientIp, getSessionUser, rateLimited } from '@/lib/apiAuth';
import { MAX_UPLOAD_BYTES, UPLOAD_DIR, UPLOAD_SRC_PREFIX, safeVideoName } from '@/lib/videoFiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

// 영상 에디터 업로드 — 요청 본문 = 영상 바이트, ?name=원래파일이름.mp4
// uploads/videos/에 저장하고 { src, size }를 돌려준다. docs/VIDEO_EDITOR_DESIGN.md §5.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  const limited = rateLimited(user?.id ?? clientIp(req) ?? 'anonymous', [
    { name: 'upload-hour', limit: 30, windowMs: HOUR },
    { name: 'upload-day', limit: 100, windowMs: DAY },
  ]);
  if (limited) return limited;
  const original = req.nextUrl.searchParams.get('name') ?? '';
  const name = safeVideoName(original);
  if (!name) return NextResponse.json({ error: 'MP4·WebM·MOV·M4V 영상만 올릴 수 있습니다.' }, { status: 400 });
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: `파일이 너무 큽니다(최대 ${MAX_UPLOAD_BYTES / 1024 / 1024}MB).` }, { status: 413 });
  }
  if (!req.body) return NextResponse.json({ error: '본문이 비어 있습니다.' }, { status: 400 });

  await mkdir(UPLOAD_DIR, { recursive: true });
  // 같은 이름이 있으면 -2, -3 … 을 붙인다.
  const ext = path.extname(name);
  const base = name.slice(0, -ext.length);
  let finalName = name;
  for (let n = 2; await exists(path.join(UPLOAD_DIR, finalName)); n++) finalName = `${base}-${n}${ext}`;
  const target = path.join(UPLOAD_DIR, finalName);
  const tmp = `${target}.${process.pid}.part`;

  let size = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      size += chunk.length;
      if (size > MAX_UPLOAD_BYTES) cb(new Error('too-large'));
      else cb(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(req.body as unknown as WebReadableStream), limiter, createWriteStream(tmp));
    if (size === 0) throw new Error('empty');
    await rename(tmp, target);
  } catch (err) {
    await unlink(tmp).catch(() => undefined);
    const msg = String((err as Error).message);
    if (msg === 'too-large') return NextResponse.json({ error: '파일이 너무 큽니다.' }, { status: 413 });
    if (msg === 'empty') return NextResponse.json({ error: '빈 파일입니다.' }, { status: 400 });
    console.error('[videos/upload] 저장 실패:', err);
    return NextResponse.json({ error: '업로드에 실패했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ src: UPLOAD_SRC_PREFIX + encodeURIComponent(finalName), size });
}
