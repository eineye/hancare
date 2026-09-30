import { GoogleGenerativeAI } from '@google/generative-ai';
import type { NextRequest } from 'next/server';
import type { ChatMessage, VideoCue } from '@/lib/types';
import { LANGS } from '@/lib/langs';

export const runtime = 'nodejs';

// 영상학습 "멈추고 질문하기" 라우트. docs/VIDEO_MODULE_DESIGN.md §6 프롬프트 설계를
// 따른다. 구조는 /api/chat과 같고(Gemini 스트리밍, 키 없으면 안내 문구), 질문한 순간의
// 자막 앞뒤 문맥과 학습자가 고른 단어를 시스템 프롬프트에 넣는다는 점만 다르다.
const MODEL_NAME = 'gemini-1.5-flash';

type CueContext = Pick<VideoCue, 'textKo' | 'textEn' | 'speakerKo'>;

interface VideoQaRequestBody {
  question: string;
  history: ChatMessage[];
  videoTitleKo: string;
  currentCue?: CueContext;
  prevCue?: CueContext;
  nextCue?: CueContext;
  selectedTerm?: string;
  displayLang?: string;
}

function cueLine(label: string, cue?: CueContext): string {
  if (!cue) return `${label}: (없음)`;
  const speaker = cue.speakerKo ? `${cue.speakerKo}: ` : '';
  return `${label}: ${speaker}"${cue.textKo}" (${cue.textEn})`;
}

function buildSystemPrompt(body: VideoQaRequestBody): string {
  const lang = LANGS.find((l) => l.id === body.displayLang);
  const explainLang = !lang || lang.id === 'ko' ? '쉬운 한국어' : `쉬운 한국어와 ${lang.ko}(${lang.native})`;
  return [
    '당신은 "한글케어" 앱의 AI 한국어 선생님입니다.',
    '대상: 한국 의료기관에서 실습 중인 외국인 간호조무 실습생 (TOPIK 초급 수준).',
    '학습자는 학습 영상을 보다가 영상을 멈추고 방금 나온 표현에 대해 질문하고 있습니다.',
    `영상 제목: ${body.videoTitleKo}`,
    cueLine('직전 대사', body.prevCue),
    cueLine('멈춘 장면의 대사', body.currentCue),
    cueLine('다음 대사', body.nextCue),
    body.selectedTerm ? `학습자가 고른 단어/표현: "${body.selectedTerm}"` : '',
    '',
    '답변 형식(필요한 항목만, 짧게):',
    '1) 뜻 — 기본형과 뜻',
    '2) 이 장면에서 — 위 대사에서 어떤 의미·뉘앙스로 쓰였는지 (존댓말/겸양 표현이면 반드시 설명)',
    '3) 쓰는 법 — 핵심 문법이나 활용형 1~2개',
    '4) 예문 — 병원·간호 현장에서 쓸 수 있는 짧은 예문 2~3개(한국어 + 뜻)',
    '',
    '규칙:',
    `- 설명은 ${explainLang}로 합니다. 학습자가 다른 언어로 질문하면 그 언어로 덧붙여 설명하세요.`,
    '- 영상 대사와 한국어 학습 맥락을 벗어나지 마세요. 전체 8줄 이내로 간결하게.',
    '- 실제 임상 판단이 필요한 의료 조언 요청에는 답하지 말고, "이 앱은 어학 학습용이며 실제 처치는 소속 기관의 지침과 담당자 지시를 따라야 합니다"라고 안내하세요.',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  const body = (await req.json()) as VideoQaRequestBody;

  if (!apiKey) {
    return new Response(
      '이 기능을 사용하려면 서버 환경변수 GEMINI_API_KEY 설정이 필요합니다. ' +
        '(.env.example 참고, https://aistudio.google.com/app/apikey 에서 무료로 발급받을 수 있습니다.)',
      { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: buildSystemPrompt(body),
    });

    const chat = model.startChat({
      history: (body.history ?? []).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });

    const result = await chat.sendMessageStream(body.question);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch {
          controller.enqueue(encoder.encode('\n[오류] Gemini 응답을 가져오지 못했습니다.'));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch {
    return new Response('Gemini API 호출 중 오류가 발생했습니다. API 키와 네트워크 상태를 확인하세요.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
