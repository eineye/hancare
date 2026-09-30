import { NextResponse, type NextRequest } from 'next/server';
import { cleanVocabConfig, getLessonTerms, getVocabConfig, saveVocabConfig } from '@/lib/vocab';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 단어장 편집기(public/hancare-vocab-editor.html) 연동.
// GET: 상황 용어 목록 + content/vocab.json 설정 / PUT: content/vocab.json 전체 저장
export async function GET() {
  try {
    const [lessonTerms, config] = await Promise.all([getLessonTerms(), getVocabConfig()]);
    return NextResponse.json({ lessonTerms, config });
  } catch (err) {
    console.error('[vocab] 읽기 실패:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// 편집기는 입력이 멈출 때마다 설정 전체를 보내므로, 마지막 요청이 이기도록 순서대로 쓴다.
let queue: Promise<unknown> = Promise.resolve();

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON 본문을 읽을 수 없습니다.' }, { status: 400 });
  }
  const config = cleanVocabConfig(body);
  if (typeof config === 'string') return NextResponse.json({ error: config }, { status: 400 });
  try {
    const run = queue.then(() => saveVocabConfig(config));
    queue = run.catch(() => undefined);
    await run;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[vocab] 저장 실패:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
