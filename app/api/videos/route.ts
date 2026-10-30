import { NextResponse, type NextRequest } from 'next/server';
import { getVideos } from '@/lib/content';
import { cleanVideos, saveVideos } from '@/lib/contentStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 영상 에디터(라이브러리 에디터 "영상" 메뉴) 연동. docs/VIDEO_EDITOR_DESIGN.md §5.
// GET: content/videos.json 영상 목록 / PUT: 영상 배열 전체 저장(순서대로 order 재부여)
export async function GET() {
  return NextResponse.json(await getVideos());
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON 본문을 읽을 수 없습니다.' }, { status: 400 });
  }
  const videos = cleanVideos(body);
  if (typeof videos === 'string') return NextResponse.json({ error: videos }, { status: 400 });
  try {
    await saveVideos(videos);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[videos] 저장 실패:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
