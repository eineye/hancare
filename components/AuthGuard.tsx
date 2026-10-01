'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchServerSession, useAuthStore, type Role } from '@/lib/auth';

/**
 * 화면 이동용 가드. 실제 접근 제어는 서버(middleware.ts — API·편집기 페이지)가 하고,
 * 여기서는 브라우저에 기억된 로그인 정보를 서버 세션과 맞춰 본다(만료·다른 탭 로그아웃 등).
 * docs/SECURITY.md
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

  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const allowed = !!account && (role === 'any' || account.role === role);

  // 서버 세션이 없거나(만료) 다른 계정이면 서버 쪽을 따른다.
  useEffect(() => {
    if (!hydrated || !account) return;
    let cancelled = false;
    fetchServerSession().then((s) => {
      if (cancelled || !s) return;
      if (!s.account) logout();
      else if (s.account.id !== account.id || s.account.role !== account.role) login(s.account);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, account, login, logout]);

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
