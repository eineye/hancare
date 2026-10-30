import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AdminNotice } from './types';

// 서버 전용 모듈(node:fs 사용) — content/vocab.json 등과 같은 패턴(content/README.md 참고).
const NOTICES_FILE = path.join(process.cwd(), 'content', 'notices.json');
const MAX_TITLE_LEN = 80;
const MAX_DETAIL_LEN = 500;
const MAX_AUDIENCE_LEN = 60;

/** content/notices.json을 매번 새로 읽는다. 없거나 깨졌으면 빈 목록. 최신순으로 정렬해 돌려준다. */
export async function getNotices(): Promise<AdminNotice[]> {
  try {
    const parsed = JSON.parse(await readFile(NOTICES_FILE, 'utf-8'));
    const list: AdminNotice[] = Array.isArray(parsed) ? parsed : [];
    return list.slice().sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[content] notices.json 을(를) 읽는 데 실패했습니다:', err);
    }
    return [];
  }
}

async function saveNotices(list: AdminNotice[]): Promise<void> {
  const tmp = `${NOTICES_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(list, null, 2) + '\n', 'utf-8');
  await rename(tmp, NOTICES_FILE);
}

/** POST 본문 검증 + 정리. 문제가 있으면 문자열(오류), 아니면 정리된 입력. */
export function cleanNoticeInput(body: unknown): Pick<AdminNotice, 'titleKo' | 'detailKo' | 'audienceKo'> | string {
  if (!body || typeof body !== 'object') return '본문이 JSON 객체가 아닙니다.';
  const b = body as Record<string, unknown>;
  const titleKo = typeof b.titleKo === 'string' ? b.titleKo.trim() : '';
  const detailKo = typeof b.detailKo === 'string' ? b.detailKo.trim() : '';
  const audienceKo = typeof b.audienceKo === 'string' ? b.audienceKo.trim() : '';
  if (!titleKo) return '제목을 입력해주세요.';
  if (titleKo.length > MAX_TITLE_LEN) return `제목은 ${MAX_TITLE_LEN}자 이내로 입력해주세요.`;
  if (!detailKo) return '내용을 입력해주세요.';
  if (detailKo.length > MAX_DETAIL_LEN) return `내용은 ${MAX_DETAIL_LEN}자 이내로 입력해주세요.`;
  if (audienceKo.length > MAX_AUDIENCE_LEN) return `대상 설명은 ${MAX_AUDIENCE_LEN}자 이내로 입력해주세요.`;
  return { titleKo, detailKo, audienceKo: audienceKo || '전체 학습자' };
}

/** 새 알림을 맨 앞(최신)에 추가해 저장하고, 생성된 알림을 돌려준다. */
export async function createNotice(input: Pick<AdminNotice, 'titleKo' | 'detailKo' | 'audienceKo'>): Promise<AdminNotice> {
  const notice: AdminNotice = { id: `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now(), ...input };
  const list = await getNotices();
  await saveNotices([notice, ...list]);
  return notice;
}

/** id로 알림을 지운다. 있었으면 true, 없었으면 false. */
export async function deleteNotice(id: string): Promise<boolean> {
  const list = await getNotices();
  const next = list.filter((n) => n.id !== id);
  if (next.length === list.length) return false;
  await saveNotices(next);
  return true;
}
