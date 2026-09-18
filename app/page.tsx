'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();
  const account = useAuthStore((s) => s.account);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!account) {
      router.replace('/login');
    } else {
      router.replace(account.role === 'admin' ? '/admin' : '/home');
    }
  }, [hydrated, account, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-gray-400">
      불러오는 중…
    </div>
  );
}
