import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/apiAuth';
import { demoLoginAllowed } from '@/lib/serverAccounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 현재 세션 확인 — { account: 사용자 | null, demoLogin: 데모 바로 시작 허용 여부 }
export async function GET(req: NextRequest) {
  const account = (await getSessionUser(req)) ?? null;
  return NextResponse.json({ account, demoLogin: demoLoginAllowed() }, { headers: { 'Cache-Control': 'no-store' } });
}
