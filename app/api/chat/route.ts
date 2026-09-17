import { GoogleGenerativeAI } from '@google/generative-ai';
import type { NextRequest } from 'next/server';
import type { ChatMessage } from '@/lib/types';

export const runtime = 'nodejs';

// docs/PROGRAM_DESIGN.md §6.3 LLM 대화 설계를 따르되, 벤더만 Gemini로 대체한 서버
// 라우트. 비용을 고려해 무료 테스트 티어가 있는 경량 모델(flash)을 기본값으로 쓴다.
const MODEL_NAME = 'gemini-1.5-flash';

interface ChatRequestBody {
  message: string;
  history: ChatMessage[];
  situationTitleKo: string;
  terms: { hangul: string; glossEn: string }[];
}

function buildSystemPrompt(body: ChatRequestBody): string {
  const termList = body.terms.map((t) => `- ${t.hangul} (${t.glossEn})`).join('\n');
  return [
    '당신은 "한글케어" 앱의 AI 한국어 선생님입니다.',
    '대상: 한국 의료기관에서 실습 중인 외국인 간호조무 실습생 (TOPIK 초급 수준).',
    `현재 학습 상황: ${body.situationTitleKo}`,
    '이번 상황에서 배우는 의료 용어:',
    termList || '(없음)',
    '',
    '규칙:',
    '- 위 상황과 용어의 학습 맥락을 벗어나지 않는 범위에서 짧고 쉬운 한국어로 답하세요.',
    '- 학습자가 모국어(영어 등)로 질문하면, 한국어 예문과 함께 그 언어로 간단히 설명을 덧붙이세요.',
    '- 실제 임상 판단이 필요한 의료 조언 요청에는 답하지 말고, "이 앱은 어학 학습용이며 실제 처치는 소속 기관의 지침과 담당자 지시를 따라야 합니다"라고 안내하세요.',
    '- 답변은 3~4문장 이내로 간결하게 작성하세요.',
  ].join('\n');
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  const body = (await req.json()) as ChatRequestBody;

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

    const result = await chat.sendMessageStream(body.message);

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
