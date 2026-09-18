'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { DEMO_ACCOUNTS, findDemoAccount, useAuthStore } from '@/lib/auth';

const HIGHLIGHTS = ['상황별 의료 용어 학습', '음절 단위 발음 채점과 교정', 'AI 아바타와 역할극 연습'];

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
    router.replace(account.role === 'admin' ? '/admin' : '/home');
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
    router.replace(found.role === 'admin' ? '/admin' : '/home');
  }

  function quickLogin(demoId: string) {
    const demo = DEMO_ACCOUNTS.find((a) => a.id === demoId);
    if (!demo) return;
    setId(demo.id);
    setPassword(demo.password);
    login({ id: demo.id, name: demo.name, role: demo.role });
    router.replace(demo.role === 'admin' ? '/admin' : '/home');
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col justify-between gap-10 bg-brand-dark px-8 py-12 text-white sm:px-14 lg:py-16">
        <div className="flex items-center gap-3.5">
          <Image
            src="/hancare-logo.png"
            alt="한글케어"
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl bg-white object-contain p-1"
          />
          <span className="text-lg font-bold">
            한글케어 <span className="font-normal text-brand-light">HangulCare</span>
          </span>
        </div>

        <div>
          <h1 className="text-[34px] font-black leading-[1.2] tracking-tight sm:text-[46px]">
            실습 현장의 말하기를
            <br />
            그대로 연습하세요
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70 sm:text-[17px]">
            외국인 간호조무 실습생을 위한 의료 용어와 존댓말 회화 학습. 아바타 선생님이 발음을 시범하고, 녹음을
            음절 단위로 채점합니다.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {HIGHLIGHTS.map((h, i) => (
              <div key={h} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-white/10 text-xs">
                  {i + 1}
                </span>
                {h}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/40">Korean for nursing-assistant trainees</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12 sm:px-14">
        <div className="w-full max-w-[420px]">
          <p className="text-xs font-bold tracking-wide text-brand">로그인 SIGN IN</p>
          <h2 className="mt-3 text-[28px] font-black tracking-tight text-brand-dark sm:text-[32px]">
            다시 오셨네요
          </h2>
          <p className="mt-2 text-sm text-muted">Sign in to continue your practice</p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-muted">아이디 · ID</label>
              <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full rounded-[11px] border border-line bg-white px-4 py-3 text-sm outline-none focus:border-brand"
                placeholder="student 또는 admin"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted">비밀번호 · Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[11px] border border-line bg-white px-4 py-3 text-sm outline-none focus:border-brand"
                placeholder="••••"
              />
            </div>
            {error && <p className="text-xs text-warn">{error}</p>}
            <button
              type="submit"
              className="mt-1.5 w-full rounded-xl bg-brand px-3 py-3.5 text-[15px] font-bold text-white hover:bg-brand/90"
            >
              학습 시작하기
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-line bg-white p-4 text-xs text-muted">
            <p className="mb-2.5 font-medium text-brand-dark">데모 계정으로 바로 시작하기 (실제 인증 아님)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => quickLogin('student')}
                className="flex-1 rounded-[10px] border border-line py-2 text-brand-dark hover:bg-panel"
              >
                학습자로 시작
              </button>
              <button
                type="button"
                onClick={() => quickLogin('admin')}
                className="flex-1 rounded-[10px] border border-line py-2 text-brand-dark hover:bg-panel"
              >
                기관 관리자로 시작
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
