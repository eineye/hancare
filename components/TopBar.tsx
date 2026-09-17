'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';

export default function TopBar({ title }: { title: string }) {
  const router = useRouter();
  const account = useAuthStore((s) => s.account);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-brand-dark px-4 py-3 text-white">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-bold">한</div>
        <div>
          <p className="text-sm font-semibold leading-tight">
            한글케어 <span className="text-brand-light/80">HangulCare</span>
          </p>
          <p className="text-xs text-white/60">{title}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        {account && (
          <span className="rounded-full bg-white/10 px-3 py-1">
            {account.name} · {account.role === 'admin' ? '관리자' : '학습자'}
          </span>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-white/20 px-2.5 py-1 hover:bg-white/10"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
