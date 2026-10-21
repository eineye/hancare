import { NextResponse, type NextRequest } from 'next/server';
import { DAY, MINUTE, clientIp, getSessionUser, rateLimited } from '@/lib/apiAuth';
import { synthesizeSpeech } from '@/lib/geminiTts';
import { getTtsSettings } from '@/lib/ttsSettings';
import { getTtsVoiceOption, isTtsVoiceId } from '@/lib/ttsVoices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TtsRequestBody {
  text?: unknown;
  /** 있으면 저장된 기본 음색 대신 이 음색으로 미리 들어본다(관리자 설정 화면 미리듣기 전용). */
  voiceId?: unknown;
}

// 서버 인스턴스 메모리에만 두는 짧은 캐시 — 같은 문장을 반복해서 누르는 "다시 듣기"
// 버튼 때문에 매번 Gemini를 다시 호출하지 않도록 한다(비용·지연 절감). 서버가
// 재시작되면 비워지며, 운영 공유 저장소가 아니다.
const CACHE_LIMIT = 200;
const CACHE_TTL_MS = 30 * MINUTE;
const cache = new Map<string, { audioBase64: string; sampleRateHz: number; at: number }>();

function cacheGet(key: string) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return hit;
}

function cacheSet(key: string, value: { audioBase64: string; sampleRateHz: number }) {
  if (!cache.has(key) && cache.size >= CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { ...value, at: Date.now() });
}

// 학습 화면 전역(따라 읽기·단어 듣기·단어장·영상 자막)의 "원어민 발음" 음성 —
// Gemini 2.5 TTS로 실제 음성을 합성한다(관리자가 /admin/voice-settings에서 고른 음색).
// 키가 없거나 합성이 실패하면 fallback:true로 응답해, 클라이언트(lib/speech.ts)가
// 브라우저 내장 음성(Web Speech API)으로 자연스럽게 넘어가게 한다.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  const limited = rateLimited(user?.id ?? clientIp(req) ?? 'anonymous', [
    { name: 'tts-min', limit: 40, windowMs: MINUTE },
    { name: 'tts-day', limit: 2000, windowMs: DAY },
  ]);
  if (limited) return limited;

  let body: TtsRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }
  const text = String(body.text ?? '').trim().slice(0, 400);
  if (!text) return NextResponse.json({ error: '읽을 텍스트가 없습니다.' }, { status: 400 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY_MISSING', fallback: true }, { status: 200 });
  }

  const voice = isTtsVoiceId(body.voiceId) ? getTtsVoiceOption(body.voiceId) : getTtsVoiceOption((await getTtsSettings()).voiceId);
  const cacheKey = `${voice.voiceName}::${text}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json({ audioBase64: cached.audioBase64, sampleRateHz: cached.sampleRateHz, voiceId: voice.id });
  }

  try {
    const audio = await synthesizeSpeech(text, voice.voiceName);
    cacheSet(cacheKey, audio);
    return NextResponse.json({ audioBase64: audio.audioBase64, sampleRateHz: audio.sampleRateHz, voiceId: voice.id });
  } catch (err) {
    console.error('[tts] 합성 실패:', err);
    return NextResponse.json({ error: String(err), fallback: true }, { status: 200 });
  }
}
