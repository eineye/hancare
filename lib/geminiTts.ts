// 서버 전용 — Gemini 2.5 TTS(음성 합성) REST 호출. 이미 쓰고 있는 @google/generative-ai
// SDK(v0.21)는 아직 오디오 응답(responseModalities)을 지원하지 않으므로, 채팅 연동과
// 같은 GEMINI_API_KEY로 generateContent REST 엔드포인트를 직접 호출한다.
const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts';

export interface TtsAudio {
  /** base64로 인코딩된 PCM16(모노) 오디오 데이터. */
  audioBase64: string;
  sampleRateHz: number;
}

interface GeminiTtsResponse {
  candidates?: {
    content?: {
      parts?: { inlineData?: { data?: string; mimeType?: string } }[];
    };
  }[];
}

/** 텍스트 + Gemini 사전 설정 음색 이름으로 음성을 합성한다. 키가 없으면 던진다. */
export async function synthesizeSpeech(text: string, voiceName: string): Promise<TtsAudio> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY_MISSING');

  const model = process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Gemini TTS 요청 실패 (HTTP ${res.status}): ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as GeminiTtsResponse;
  const inline = json.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inline?.data) throw new Error('Gemini TTS 응답에 오디오 데이터가 없습니다.');

  const rateMatch = /rate=(\d+)/.exec(inline.mimeType ?? '');
  return { audioBase64: inline.data, sampleRateHz: rateMatch ? Number(rateMatch[1]) : 24000 };
}
