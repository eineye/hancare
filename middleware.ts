import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, readSessionToken, sessionConfigError } from '@/lib/session';

// 서버 접근 제어 — 모든 /api 요청과 관리자 편집기 페이지(public/hancare-*-editor.html)를
// 서명된 세션 쿠키로 확인한다. docs/SECURITY.md
//   - /api/auth/*         : 누구나(로그인·로그아웃·세션 확인)
//   - 관리자 데이터 쓰기   : 관리자만 (편집기 저장, 영상 업로드, AI 자동 자막)
//   - 그 밖의 /api         : 로그인한 사용자 (AI 대화·질문, 영상 파일, 목록 읽기)
//   - 편집기 페이지        : 관리자만 (아니면 로그인 화면으로)

const ADMIN_WRITE_PREFIXES = ['/api/videos', '/api/hangul-library', '/api/roleplays', '/api/vocab', '/api/xr-modules', '/api/tts-settings'];
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function json(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');

  if (isApi && pathname.startsWith('/api/auth/')) return NextResponse.next();

  // 다른 사이트에서 보낸 쓰기 요청 차단(CSRF 방어 보강 — 쿠키는 SameSite=Lax).
  if (isApi && !READ_METHODS.has(req.method)) {
    const origin = req.headers.get('origin');
    if (origin && origin !== req.nextUrl.origin) return json(403, '다른 사이트에서 보낸 요청은 받을 수 없습니다.');
  }

  const configError = sessionConfigError();
  if (configError) {
    return isApi ? json(503, configError) : NextResponse.redirect(new URL('/login', req.url));
  }

  const user = await readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (!isApi) {
    // 관리자 편집기 페이지
    if (user?.role === 'admin') return NextResponse.next();
    const login = new URL('/login', req.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  if (!user) return json(401, '로그인이 필요합니다.');
  const adminWrite = !READ_METHODS.has(req.method) && ADMIN_WRITE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (adminWrite && user.role !== 'admin') return json(403, '관리자만 할 수 있습니다.');
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/:file(hancare-[a-z]+-editor\\.html)'],
};
