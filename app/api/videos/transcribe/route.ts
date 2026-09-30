import { readFile, stat } from 'node:fs/promises';
import { GoogleGenerativeAI, SchemaType, type Part, type ResponseSchema } from '@google/generative-ai';
import { FileState, GoogleAIFileManager } from '@google/generative-ai/server';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeCues, type RawCue } from '@/lib/videoCaptions';
import { resolveLocalVideo, videoMime } from '@/lib/videoFiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// 영상 에디터 "AI 자동 자막 만들기" — 영상을 Gemini에 보내 대사·시간·영어 뜻·학습 단어 초안을
// 한 번에 받는다. 결과는 초안이며 관리자가 에디터에서 검토한다. docs/VIDEO_EDITOR_DESIGN.md §4.
const MODEL_NAME = process.env.GEMINI_VIDEO_MODEL || 'gemini-1.5-flash';
const INLINE_LIMIT_BYTES = 18 * 1024 * 1024;

const PROMPT = [
  '이 영상은 한국 의료기관에서 실습하는 외국인 간호조무 실습생(TOPIK 초급)을 위한 한국어 학습 자료입니다.',
  '영상의 한국어 대사로 학습용 자막을 만들어 JSON으로 답하세요.',
  '',
  '규칙:',
  '1. 들리는 한국어 대사를 들리는 그대로 받아쓰세요. 화면에 자막이 박혀 있으면 그 표기를 우선하고, 띄어쓰기·문장 부호는 표준에 맞추세요.',
  '2. 한 줄은 한 문장 또는 의미 단위로, 길이는 1~7초. start/end는 영상 시작부터의 초(소수 1자리)이며 대사가 실제로 들리는 구간에 맞추세요.',
  '3. speakerKo는 짧은 역할명(간호조무사, 환자, 보호자, 의사, 내레이션 등). 말하는 사람이 없는 화면 문구는 speakerKo를 빈 문자열로 두세요.',
  '4. textEn은 자연스러운 영어 번역입니다.',
  '5. terms는 줄마다 0~3개, 초급 학습자에게 유용한 단어·표현입니다. hangul은 반드시 textKo 안에 글자 그대로 있어야 하고, glossEn은 짧은 영어 뜻입니다.',
  '6. 대사가 없는 구간(음악만 나오는 부분)은 건너뛰세요. 추측으로 대사를 지어내지 마세요.',
  '7. durationSec에는 영상 전체 길이(초)를 넣으세요.',
].join('\n');

const SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    durationSec: { type: SchemaType.NUMBER },
    cues: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          start: { type: SchemaType.NUMBER },
          end: { type: SchemaType.NUMBER },
          speakerKo: { type: SchemaType.STRING },
          textKo: { type: SchemaType.STRING },
          textEn: { type: SchemaType.STRING },
          terms: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: { hangul: { type: SchemaType.STRING }, glossEn: { type: SchemaType.STRING } },
              required: ['hangul', 'glossEn'],
            },
          },
        },
        required: ['start', 'end', 'textKo', 'textEn'],
      },
    },
  },
  required: ['cues'],
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI 자동 자막을 쓰려면 서버 환경변수 GEMINI_API_KEY가 필요합니다(.env.example 참고).' },
      { status: 400 },
    );
  }
  let body: { src?: string; videoId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON 본문을 읽을 수 없습니다.' }, { status: 400 });
  }
  const file = await resolveLocalVideo(String(body.src ?? ''));
  if (!file) {
    return NextResponse.json(
      { error: '서버에 있는 영상만 분석할 수 있습니다. 먼저 영상을 업로드하거나 public/videos/에 넣어 주세요.' },
      { status: 400 },
    );
  }
  const mimeType = videoMime(file) ?? 'video/mp4';
  const idPrefix = /^[a-z0-9-]+$/.test(String(body.videoId ?? '')) ? String(body.videoId) : 'cue';

  try {
    const { size } = await stat(file);
    let videoPart: Part;
    if (size <= INLINE_LIMIT_BYTES) {
      videoPart = { inlineData: { mimeType, data: (await readFile(file)).toString('base64') } };
    } else {
      // 큰 파일은 File API로 올린 뒤 처리가 끝날 때까지 기다린다.
      const manager = new GoogleAIFileManager(apiKey);
      const uploaded = await manager.uploadFile(file, { mimeType, displayName: idPrefix });
      let info = uploaded.file;
      for (let i = 0; info.state === FileState.PROCESSING && i < 60; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        info = await manager.getFile(info.name);
      }
      if (info.state !== FileState.ACTIVE) throw new Error(`Gemini 파일 처리 실패(${info.state})`);
      videoPart = { fileData: { mimeType: info.mimeType, fileUri: info.uri } };
    }

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2 },
    });
    const result = await model.generateContent([videoPart, { text: PROMPT }]);
    const parsed = JSON.parse(result.response.text()) as { durationSec?: number; cues?: RawCue[] };
    const durationSec = Number(parsed.durationSec) > 0 ? Number(parsed.durationSec) : undefined;
    const cues = normalizeCues(parsed.cues ?? [], idPrefix, durationSec);
    if (!cues.length) return NextResponse.json({ error: '영상에서 대사를 찾지 못했습니다.' }, { status: 422 });
    return NextResponse.json({ cues, durationSec, model: MODEL_NAME });
  } catch (err) {
    console.error('[videos/transcribe] 실패:', err);
    return NextResponse.json({ error: `AI 자동 자막 생성에 실패했습니다: ${(err as Error).message}` }, { status: 502 });
  }
}
