'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type Role } from '@/lib/auth';

/**
 * 로그인 여부/역할을 클라이언트에서만 확인하는 라우트 가드. 실제 서버 세션 검증이
 * 아니라 프로토타입 단계의 UX용 가드이며(localStorage 기반), 진짜 접근 제어가
 * 필요해지면 docs/PROGRAM_DESIGN.md §4 User Service의 서버 인증으로 교체해야 한다.
 */
export default function AuthGuard({
  role,
  children,
}: {
  /** 'any'면 로그인만 확인하고 역할은 따지지 않는다. */
  role: Role | 'any';
  children: React.ReactNode;
}) {
  const router = useRouter();
  const account = useAuthStore((s) => s.account);
  const hydrated = useAuthStore((s) => s.hydrated);

  const allowed = !!account && (role === 'any' || account.role === role);

  useEffect(() => {
    if (!hydrated) return;
    if (!account) {
      router.replace('/login');
      return;
    }
    if (role !== 'any' && account.role !== role) {
      router.replace(account.role === 'admin' ? '/admin' : '/home');
    }
  }, [hydrated, account, role, router]);

  if (!hydrated || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-gray-400">
        불러오는 중…
      </div>
    );
  }

  return <>{children}</>;
}
