import { createWriteStream } from 'node:fs';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { NextResponse, type NextRequest } from 'next/server';
import { DAY, HOUR, clientIp, getSessionUser, rateLimited } from '@/lib/apiAuth';
import { MAX_XR_BUILD_UPLOAD_BYTES, extractXrBuild, isSafeModuleId } from '@/lib/xrBuilds';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// XR실습 편집기 — Unity WebGL 빌드(.zip) 업로드. ?id=모듈id. 본문 = zip 바이트.
// uploads/xr-builds/{id}/에 풀고 { buildUrl, fileCount }를 돌려준다. docs/XR_MODULE_DESIGN.md
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  const limited = rateLimited(user?.id ?? clientIp(req) ?? 'anonymous', [
    { name: 'xr-upload-hour', limit: 20, windowMs: HOUR },
    { name: 'xr-upload-day', limit: 60, windowMs: DAY },
  ]);
  if (limited) return limited;

  const moduleId = req.nextUrl.searchParams.get('id') ?? '';
  if (!isSafeModuleId(moduleId)) {
    return NextResponse.json({ error: '모듈 id 형식이 올바르지 않습니다(영문 소문자·숫자·하이픈만).' }, { status: 400 });
  }
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_XR_BUILD_UPLOAD_BYTES) {
    return NextResponse.json({ error: `파일이 너무 큽니다(최대 ${MAX_XR_BUILD_UPLOAD_BYTES / 1024 / 1024}MB).` }, { status: 413 });
  }
  if (!req.body) return NextResponse.json({ error: '본문이 비어 있습니다.' }, { status: 400 });

  await mkdir(os.tmpdir(), { recursive: true });
  const tmp = path.join(os.tmpdir(), `xr-upload-${moduleId}-${process.pid}-${Date.now()}.zip`);

  let size = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      size += chunk.length;
      if (size > MAX_XR_BUILD_UPLOAD_BYTES) cb(new Error('too-large'));
      else cb(null, chunk);
    },
  });
  try {
    try {
      await pipeline(Readable.fromWeb(req.body as unknown as WebReadableStream), limiter, createWriteStream(tmp));
    } catch (err) {
      const msg = String((err as Error).message);
      if (msg === 'too-large') return NextResponse.json({ error: '파일이 너무 큽니다.' }, { status: 413 });
      throw err;
    }
    if (size === 0) return NextResponse.json({ error: '빈 파일입니다.' }, { status: 400 });

    const zipBuffer = await readFile(tmp);
    try {
      const result = await extractXrBuild(moduleId, zipBuffer);
      return NextResponse.json(result);
    } catch (err) {
      // extractXrBuild는 사용자에게 보여줄 수 있는 한국어 오류 메시지만 던진다.
      return NextResponse.json({ error: String((err as Error).message) }, { status: 400 });
    }
  } catch (err) {
    console.error('[xr-modules/upload] 처리 실패:', err);
    return NextResponse.json({ error: '업로드 처리에 실패했습니다.' }, { status: 500 });
  } finally {
    await unlink(tmp).catch(() => undefined);
  }
}
