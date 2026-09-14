'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_ACCOUNTS, findDemoAccount, useAuthStore } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const account = useAuthStore((s) => s.account);
  const hydrated = useAuthStore((s) => s.hydrated);
  const login = useAuthStore((s) => s.login);

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!hydrated || !account) return;
    router.replace(account.role === 'admin' ? '/admin' : '/courses');
  }, [hydrated, account, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = findDemoAccount(id.trim(), password);
    if (!found) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      return;
    }
    setError(undefined);
    login(found);
    router.replace(found.role === 'admin' ? '/admin' : '/courses');
  }

  function quickLogin(demoId: string) {
    const demo = DEMO_ACCOUNTS.find((a) => a.id === demoId);
    if (!demo) return;
    setId(demo.id);
    setPassword(demo.password);
    login({ id: demo.id, name: demo.name, role: demo.role });
    router.replace(demo.role === 'admin' ? '/admin' : '/courses');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            한
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-dark">한글케어 HangulCare</p>
            <p className="text-xs text-gray-400">로그인</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">아이디</label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder="student 또는 admin"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder="••••"
            />
          </div>
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand/90"
          >
            로그인
          </button>
        </form>

        <div className="mt-4 rounded-lg bg-surface p-3 text-xs text-gray-500">
          <p className="mb-2 font-medium text-gray-600">데모 계정으로 바로 시작하기 (실제 인증 아님)</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => quickLogin('student')}
              className="flex-1 rounded-lg border border-brand-dark/20 py-1.5 text-brand-dark hover:bg-brand-light"
            >
              학습자로 시작
            </button>
            <button
              type="button"
              onClick={() => quickLogin('admin')}
              className="flex-1 rounded-lg border border-brand-dark/20 py-1.5 text-brand-dark hover:bg-brand-light"
            >
              관리자로 시작
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
