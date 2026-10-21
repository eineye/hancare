import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import type { NextRequest } from 'next/server';
import { resolveXrBuildFile, xrBuildFileHeaders } from '@/lib/xrBuilds';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 관리자가 올린 Unity WebGL 빌드(uploads/xr-builds/{moduleId}/…) 정적 파일 제공.
// 학습 화면의 <iframe src="/api/xr-builds/{id}/index.html">이 index.html과 그 아래
// Build/TemplateData 등 모든 하위 파일을 이 라우트로 받는다. docs/XR_MODULE_DESIGN.md
export async function GET(_req: NextRequest, { params }: { params: Promise<{ moduleId: string; path: string[] }> }) {
  const { moduleId, path: segments } = await params;
  const file = resolveXrBuildFile(moduleId, segments);
  if (!file) return new Response('Not found', { status: 404 });

  let size: number;
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    size = info.size;
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const { contentType, contentEncoding } = xrBuildFileHeaders(segments[segments.length - 1]);
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Length': String(size),
    'Cache-Control': 'public, max-age=3600',
  };
  if (contentEncoding) headers['Content-Encoding'] = contentEncoding;

  const body = Readable.toWeb(createReadStream(file)) as unknown as ReadableStream;
  return new Response(body, { headers });
}
