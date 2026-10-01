import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';

// 로그아웃 — 세션 쿠키를 지운다.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
