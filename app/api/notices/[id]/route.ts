import { NextResponse, type NextRequest } from 'next/server';
import { deleteNotice } from '@/lib/notices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// 관리자 "알림 및 면담" 연동 — DELETE /api/notices/:id (관리자만 — middleware.ts)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const found = await deleteNotice(id);
    return found ? NextResponse.json({ ok: true }) : NextResponse.json({ error: '알림을 찾을 수 없습니다.' }, { status: 404 });
  } catch (err) {
    console.error(`[notices] ${id} 삭제 실패:`, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
