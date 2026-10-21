import { NextResponse, type NextRequest } from 'next/server';
import { MINUTE, clientIp, rateLimited } from '@/lib/apiAuth';
import { demoAccount, demoLoginAllowed, verifyPassword } from '@/lib/serverAccounts';
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, createSessionToken, isProduction, sessionConfigError } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 로그인 — 아이디·비밀번호를 서버에서 확인하고 서명된 httpOnly 세션 쿠키를 발급한다.
// 본문: { id, password } 또는 { id, demo: true }(데모 바로 시작, 허용된 경우만). docs/SECURITY.md
export async function POST(req: NextRequest) {
  const configError = sessionConfigError();
  if (configError) return NextResponse.json({ error: `로그인할 수 없습니다: ${configError}` }, { status: 503 });

  let body: { id?: unknown; password?: unknown; demo?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }
  const id = String(body.id ?? '').trim().slice(0, 64);

  // 비밀번호 대입 공격 방지: 계정당 10분에 10회, (프록시 뒤라면) IP당 10분에 30회
  const ip = clientIp(req);
  const limited =
    rateLimited(`acct:${id}`, [{ name: 'login', limit: 10, windowMs: 10 * MINUTE }]) ??
    (ip ? rateLimited(`ip:${ip}`, [{ name: 'login', limit: 30, windowMs: 10 * MINUTE }]) : undefined);
  if (limited) return limited;
  const user =
    body.demo === true
      ? demoLoginAllowed()
        ? demoAccount(id)
        : undefined
      : verifyPassword(id, String(body.password ?? ''));
  if (!user) {
    return NextResponse.json(
      { error: body.demo === true ? '데모 바로 시작이 꺼져 있습니다.' : '아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    );
  }

  const token = await createSessionToken(user);
  if (!token) return NextResponse.json({ error: '세션을 만들 수 없습니다.' }, { status: 503 });
  const res = NextResponse.json({ account: user });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction() && process.env.SESSION_COOKIE_INSECURE !== 'true',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return res;
}
