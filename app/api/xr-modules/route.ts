import { NextResponse, type NextRequest } from 'next/server';
import { getXrModules } from '@/lib/content';
import { cleanXrModules, saveXrModules } from '@/lib/contentStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// XR실습 편집기(public/hancare-xr-editor.html) 연동.
// GET: content/xr-modules.json 모듈 목록 / PUT: 모듈 배열 전체 저장(순서대로 order 재부여)
export async function GET() {
  return NextResponse.json(await getXrModules());
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON 본문을 읽을 수 없습니다.' }, { status: 400 });
  }
  const modules = cleanXrModules(body);
  if (typeof modules === 'string') return NextResponse.json({ error: modules }, { status: 400 });
  try {
    await saveXrModules(modules);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[xr-modules] 저장 실패:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
