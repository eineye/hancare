import { NextResponse, type NextRequest } from 'next/server';
import { hit } from './rateLimit';
import { SESSION_COOKIE, readSessionToken, type SessionUser } from './session';

// 서버 전용 — API 라우트에서 쓰는 세션·호출 제한 도우미. 접근 제어 자체는 middleware.ts가 먼저 한다.

export async function getSessionUser(req: NextRequest): Promise<SessionUser | undefined> {
  return readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

/** 접속 IP. X-Forwarded-For는 누구나 꾸며 보낼 수 있으므로, 앞단에 리버스 프록시(nginx·로드밸런서)가
 * 있어 그 값을 덮어쓰는 경우(TRUST_PROXY=true)에만 믿는다. 아니면 undefined. */
export function clientIp(req: NextRequest): string | undefined {
  if (process.env.TRUST_PROXY !== 'true') return undefined;
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0] : req.headers.get('x-real-ip') ?? '').trim() || undefined;
}

export interface Limit {
  name: string;
  limit: number;
  windowMs: number;
}

/** 여러 한도를 차례로 확인해, 넘었으면 429 응답을, 아니면 undefined를 돌려준다. */
export function rateLimited(subject: string, limits: Limit[]): NextResponse | undefined {
  for (const l of limits) {
    const r = hit(`${l.name}:${subject}`, l.limit, l.windowMs);
    if (!r.ok) {
      return NextResponse.json(
        { error: `요청이 너무 많습니다. ${r.retryAfterSec}초 뒤에 다시 시도해 주세요.` },
        { status: 429, headers: { 'Retry-After': String(r.retryAfterSec) } },
      );
    }
  }
  return undefined;
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
