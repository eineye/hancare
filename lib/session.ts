// 서버 세션 — 서명된 httpOnly 쿠키. middleware(Edge)와 라우트(Node) 양쪽에서 쓰므로
// Node 전용 모듈 없이 Web Crypto(HMAC-SHA256)만 쓴다. docs/SECURITY.md 참고.
//
// 쿠키 값 = base64url(JSON 페이로드) + "." + base64url(HMAC 서명)
// 비밀키는 서버 환경변수 SESSION_SECRET(32자 이상). 운영에서 없으면 로그인·API를 막는다.

export type SessionRole = 'user' | 'admin';

export interface SessionUser {
  id: string;
  name: string;
  role: SessionRole;
}

interface SessionPayload extends SessionUser {
  exp: number;
}

export const SESSION_COOKIE = 'hc_session';
export const SESSION_MAX_AGE_SEC = 12 * 60 * 60;

// 개발 중(npm run dev)에만 쓰는 고정 키. 운영(NODE_ENV=production)에서는 절대 쓰지 않는다.
const DEV_ONLY_SECRET = 'hangulcare-dev-only-session-secret-not-for-production';

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function sessionSecret(): string | undefined {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  return isProduction() ? undefined : DEV_ONLY_SECRET;
}

/** 운영 설정이 빠졌으면 이유를 돌려준다(없으면 undefined). */
export function sessionConfigError(): string | undefined {
  return sessionSecret() ? undefined : '서버 환경변수 SESSION_SECRET(32자 이상)이 설정되지 않았습니다.';
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data))));
}

/** 길이가 같은 두 문자열을 시간차 없이 비교한다(서명 비교용). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(user: SessionUser): Promise<string | undefined> {
  const secret = sessionSecret();
  if (!secret) return undefined;
  const payload: SessionPayload = { ...user, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC };
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await sign(body, secret)}`;
}

/** 쿠키 값을 검증해 사용자 정보를 돌려준다. 서명이 틀리거나 만료됐으면 undefined. */
export async function readSessionToken(token: string | undefined | null): Promise<SessionUser | undefined> {
  const secret = sessionSecret();
  if (!secret || !token) return undefined;
  const dot = token.indexOf('.');
  if (dot <= 0) return undefined;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, await sign(body, secret))) return undefined;
  try {
    const p = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (!p || typeof p.exp !== 'number' || p.exp * 1000 < Date.now()) return undefined;
    if (p.role !== 'user' && p.role !== 'admin') return undefined;
    return { id: String(p.id), name: String(p.name), role: p.role };
  } catch {
    return undefined;
  }
}
