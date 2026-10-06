import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { TtsSettings } from './types';
import { DEFAULT_TTS_VOICE_ID, isTtsVoiceId } from './ttsVoices';

// 서버 전용 모듈(node:fs 사용) — content/vocab.json 등과 같은 패턴(content/README.md 참고).
const TTS_SETTINGS_FILE = path.join(process.cwd(), 'content', 'ttsSettings.json');

export const DEFAULT_TTS_SETTINGS: TtsSettings = { voiceId: DEFAULT_TTS_VOICE_ID };

/** content/ttsSettings.json을 매번 새로 읽는다. 없거나 깨졌으면 기본 음색으로 대체. */
export async function getTtsSettings(): Promise<TtsSettings> {
  try {
    const parsed = JSON.parse(await readFile(TTS_SETTINGS_FILE, 'utf-8'));
    const voiceId = isTtsVoiceId(parsed?.voiceId) ? parsed.voiceId : DEFAULT_TTS_VOICE_ID;
    return { voiceId };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[content] ttsSettings.json 을(를) 읽는 데 실패했습니다:', err);
    }
    return DEFAULT_TTS_SETTINGS;
  }
}

export async function saveTtsSettings(settings: TtsSettings): Promise<void> {
  const tmp = `${TTS_SETTINGS_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  await rename(tmp, TTS_SETTINGS_FILE);
}

/** PUT 본문 검증. 문제가 있으면 문자열(오류), 아니면 정리된 설정. */
export function cleanTtsSettings(body: unknown): TtsSettings | string {
  if (!body || typeof body !== 'object') return '본문이 JSON 객체가 아닙니다.';
  const voiceId = (body as Partial<TtsSettings>).voiceId;
  if (!isTtsVoiceId(voiceId)) return '알 수 없는 음색입니다.';
  return { voiceId };
}
