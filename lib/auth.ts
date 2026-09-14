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

interface DemoAccount extends Account {
  password: string;
}

/**
 * 실제 백엔드 인증(docs/PROGRAM_DESIGN.md §4 User Service) 이전 단계의 데모 계정.
 * 비밀번호를 코드에 평문으로 두고 클라이언트에서만 검증하므로, 실제 서비스로
 * 확장할 때는 반드시 서버 측 인증(해시된 비밀번호, 세션/토큰)으로 교체해야 한다.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: 'student', password: '1234', name: 'Maria Santos', role: 'user' },
  { id: 'admin', password: 'admin', name: '관리자', role: 'admin' },
];

export function findDemoAccount(id: string, password: string): Account | undefined {
  const match = DEMO_ACCOUNTS.find((a) => a.id === id && a.password === password);
  if (!match) return undefined;
  return { id: match.id, name: match.name, role: match.role };
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
      logout: () => set({ account: null }),
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
