import { NextResponse, type NextRequest } from 'next/server';
import { deleteLibraryUnit, saveLibraryUnit, validateUnit } from '@/lib/contentStore';
import type { Unit } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// 실습내용 편집기 연동 — PUT {baseUrl}/units/:id (생성/수정)
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON 본문을 읽을 수 없습니다.' }, { status: 400 });
  }
  const problem = validateUnit(body, id);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  try {
    await saveLibraryUnit(body as Unit);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[hangul-library] 유닛 ${id} 저장 실패:`, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// 실습내용 편집기 연동 — DELETE {baseUrl}/units/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const found = await deleteLibraryUnit(id);
    return found ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not found' }, { status: 404 });
  } catch (err) {
    console.error(`[hangul-library] 유닛 ${id} 삭제 실패:`, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
