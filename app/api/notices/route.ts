import { NextResponse, type NextRequest } from 'next/server';
import { cleanNoticeInput, createNotice, getNotices } from '@/lib/notices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 관리자 "알림 및 면담"(/admin/alerts) 연동. GET: 전체 알림 목록(최신순, 학습자 /notices·
// 상단바 알림 벨도 같은 목록을 읽는다) / POST: 알림 작성(관리자만 — middleware.ts의
// ADMIN_WRITE_PREFIXES)
export async function GET() {
  return NextResponse.json({ notices: await getNotices() });
}

// 작성은 빠르게 연달아 보낼 일이 거의 없지만, 다른 콘텐츠 API와 같은 순서 보장 패턴을 맞춘다.
let queue: Promise<unknown> = Promise.resolve();

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON 본문을 읽을 수 없습니다.' }, { status: 400 });
  }
  const input = cleanNoticeInput(body);
  if (typeof input === 'string') return NextResponse.json({ error: input }, { status: 400 });
  try {
    const run = queue.then(() => createNotice(input));
    queue = run.catch(() => undefined);
    const notice = await run;
    return NextResponse.json({ ok: true, notice });
  } catch (err) {
    console.error('[notices] 작성 실패:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
