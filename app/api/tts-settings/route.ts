import { NextResponse, type NextRequest } from 'next/server';
import { cleanTtsSettings, getTtsSettings, saveTtsSettings } from '@/lib/ttsSettings';
import { TTS_VOICE_OPTIONS } from '@/lib/ttsVoices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 관리자 설정(/admin/voice-settings) 연동. GET: 현재 설정 + 선택 가능한 음색 목록(누구나,
// 로그인만 하면 됨) / PUT: 설정 저장(관리자만 — middleware.ts의 ADMIN_WRITE_PREFIXES)
export async function GET() {
  const settings = await getTtsSettings();
  return NextResponse.json({ settings, voices: TTS_VOICE_OPTIONS });
}

// 설정 화면은 고를 때마다(입력 대기 없이) 바로 저장을 보내므로, 마지막 요청이 이기도록 순서대로 쓴다.
let queue: Promise<unknown> = Promise.resolve();

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON 본문을 읽을 수 없습니다.' }, { status: 400 });
  }
  const settings = cleanTtsSettings(body);
  if (typeof settings === 'string') return NextResponse.json({ error: settings }, { status: 400 });
  try {
    const run = queue.then(() => saveTtsSettings(settings));
    queue = run.catch(() => undefined);
    await run;
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error('[tts-settings] 저장 실패:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
