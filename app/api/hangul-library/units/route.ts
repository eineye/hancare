import { NextResponse } from 'next/server';
import { listLibraryUnits } from '@/lib/contentStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 실습내용 편집기(public/hancare-library-editor.html) 연동 — GET {baseUrl}/units
export async function GET() {
  try {
    return NextResponse.json(await listLibraryUnits());
  } catch (err) {
    console.error('[hangul-library] 유닛 목록을 읽지 못했습니다:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
