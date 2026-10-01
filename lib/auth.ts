'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeLocalStorage } from './storage';

export type Role = 'user' | 'admin';

export interface Account {
  id: string;
  name: string;
  role: Role;
}

/**
 * 로그인은 서버(/api/auth/login)가 확인하고 서명된 httpOnly 세션 쿠키를 발급한다(docs/SECURITY.md).
 * 이 스토어는 화면 표시용으로 "누가 로그인했는지"만 기억하며, 실제 접근 제어는 서버(middleware.ts)가 한다.
 * 비밀번호는 브라우저 코드에 두지 않는다.
 */
export async function serverLogin(body: { id: string; password?: string; demo?: boolean }): Promise<Account> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { account?: Account; error?: string };
  if (!res.ok || !data.account) throw new Error(data.error ?? '로그인하지 못했습니다.');
  return data.account;
}

/** API 오류 응답({ error })을 화면에 보여 줄 문장으로 바꾼다. 401이면 다시 로그인하라고 안내한다. */
export async function apiErrorMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401) return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
  return data.error ?? `요청을 처리하지 못했습니다 (HTTP ${res.status}).`;
}

/** 서버 세션 확인. 네트워크 오류면 undefined(판단 보류), 세션이 없으면 null. */
export async function fetchServerSession(): Promise<{ account: Account | null; demoLogin: boolean } | undefined> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!res.ok) return undefined;
    return (await res.json()) as { account: Account | null; demoLogin: boolean };
  } catch {
    return undefined;
  }
}

interface AuthState {
  account: Account | null;
  hydrated: boolean;
  login: (account: Account) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      account: null,
      hydrated: false,
      login: (account) => set({ account }),
      logout: () => {
        // 서버 세션 쿠키도 지운다(실패해도 화면은 로그아웃).
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
        set({ account: null });
      },
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'hangulcare-auth',
      storage: createJSONStorage(safeLocalStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
