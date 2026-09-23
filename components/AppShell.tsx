'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth';
import {
  SUPPORTED_DISPLAY_LANGS,
  useNoticesReadStore,
  useProgressStore,
  useSettingsStore,
  useStatsStore,
  type DisplayLang,
} from '@/lib/store';
import { ADMIN_OVERVIEW } from '@/lib/adminMock';
import { NOTICES } from '@/lib/noticesMock';
import { LANGS } from '@/lib/langs';

interface NavItem {
  id: string;
  ko: string;
  en: string;
  href: string;
  /** 활성 상태 판정에 쓰는 경로 접두사. 없으면 href를 그대로 쓴다. */
  match?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function AppShell({
  children,
  defaultLearnHref,
}: {
  children: React.ReactNode;
  defaultLearnHref?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const account = useAuthStore((s) => s.account);
  const logout = useAuthStore((s) => s.logout);
  const displayLang = useSettingsStore((s) => s.displayLang);
  const setDisplayLang = useSettingsStore((s) => s.setDisplayLang);
  const lastUnitId = useProgressStore((s) => s.lastUnitId);
  const lastSituationId = useProgressStore((s) => s.lastSituationId);
  const wordsPracticed = useStatsStore((s) => s.wordsPracticed);
  const accuracySum = useStatsStore((s) => s.accuracySum);
  const accuracyCount = useStatsStore((s) => s.accuracyCount);
  const readIds = useNoticesReadStore((s) => s.readIds);

  const [langOpen, setLangOpen] = useState(false);
  const [langNotice, setLangNotice] = useState<string | undefined>(undefined);

  if (!account) return null;

  const isAdmin = account.role === 'admin';
  const learnHref = lastUnitId && lastSituationId ? `/learn/${lastUnitId}/${lastSituationId}` : (defaultLearnHref ?? '/courses');
  const roleplayHref = learnHref.startsWith('/learn/') ? learnHref.replace('/learn/', '/roleplay/') : '/courses';

  const learnerNav: NavItem[] = [
    { id: 'home', ko: '홈', en: 'Home', href: '/home' },
    { id: 'courses', ko: '커리큘럼', en: 'Units', href: '/courses' },
    { id: 'learn', ko: '한글학습', en: 'Learn', href: learnHref, match: '/learn/' },
    { id: 'xr', ko: 'XR실습', en: 'XR', href: '/xr' },
    { id: 'roleplay', ko: '역할극', en: 'Role play', href: roleplayHref, match: '/roleplay/' },
    { id: 'vocab', ko: '단어장', en: 'Words', href: '/vocab' },
    { id: 'report', ko: '리포트', en: 'Report', href: '/report' },
    { id: 'journal', ko: '실습 일지', en: 'Journal', href: '/journal' },
    { id: 'notices', ko: '알림', en: 'Alerts', href: '/notices' },
    { id: 'settings', ko: '설정', en: 'Settings', href: '/settings' },
  ];
  const adminNav: NavItem[] = [
    { id: 'admin', ko: '전체 현황', en: 'Overview', href: '/admin' },
    { id: 'admin-alerts', ko: '알림 및 면담', en: 'Alerts', href: '/admin/alerts' },
  ];
  const nav = isAdmin ? adminNav : learnerNav;

  function isActive(item: NavItem) {
    const prefix = item.match ?? item.href;
    if (prefix === '/admin') return pathname === '/admin';
    return pathname === prefix || pathname.startsWith(prefix);
  }

  function handleLangPick(lang: DisplayLang) {
    if (SUPPORTED_DISPLAY_LANGS.includes(lang)) {
      setDisplayLang(lang);
      setLangOpen(false);
      setLangNotice(undefined);
    } else {
      setLangNotice('이 언어의 번역 콘텐츠는 아직 준비 중입니다.');
    }
  }

  const currentLangRow = LANGS.find((l) => l.id === displayLang) ?? LANGS[0];
  const langLabel = displayLang === 'ko' ? '한국어' : `한국어 + ${currentLangRow.native}`;

  const avgAccuracy = accuracyCount > 0 ? Math.round(accuracySum / accuracyCount) : 0;
  const unreadNotices = NOTICES.filter((n) => n.unread && !readIds.includes(n.id)).length;

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  function NavLink({ item, className }: { item: NavItem; className: string }) {
    const active = isActive(item);
    return (
      <Link
        key={item.id}
        href={item.href}
        className={`${className} ${active ? 'bg-brand-dark text-white' : 'text-brand-dark hover:bg-line/40'}`}
      >
        {item.match && (
          <span className={`h-4 w-[3px] flex-none rounded ${active ? 'bg-emerald-400' : 'bg-transparent'}`} />
        )}
        <span className="text-[13.5px] font-medium">{item.ko}</span>
        <span className="flex-1" />
        <span className="hidden text-[10.5px] text-faint lg:inline">{item.en}</span>
      </Link>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3">
          <Link href={isAdmin ? '/admin' : '/home'} className="flex items-center gap-2.5">
            <Image src="/hancare-logo.png" alt="한글케어" width={32} height={32} className="h-8 w-8 rounded-lg bg-white object-contain" />
            <span className="text-[15.5px] font-bold tracking-tight text-brand-dark">한글케어</span>
          </Link>
          <div className="flex-1" />

          {!isAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-2 whitespace-nowrap rounded-[10px] border border-line px-3 py-2 text-xs hover:bg-panel"
              >
                <span>{langLabel}</span>
                <span className="text-[9px] text-muted">▼</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-11 z-50 min-w-[220px] rounded-xl border border-line bg-white p-1.5 shadow-lg">
                  <p className="px-3 pb-1.5 pt-2 text-[10.5px] font-bold tracking-wide text-faint">
                    뜻풀이 언어 · MEANING LANGUAGE
                  </p>
                  {LANGS.map((l) => {
                    const on = displayLang === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => handleLangPick(l.id)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] ${
                          on ? 'bg-brand-dark text-white' : 'text-brand-dark hover:bg-panel'
                        }`}
                      >
                        <span className="flex-1">{l.native}</span>
                        <span className={`text-[11px] ${on ? 'text-brand-light' : 'text-faint'}`}>{l.ko}</span>
                      </button>
                    );
                  })}
                  {langNotice && <p className="px-3 pb-1 pt-2 text-[11px] text-warn">{langNotice}</p>}
                </div>
              )}
            </div>
          )}

          <Link
            href={isAdmin ? '/admin/alerts' : '/notices'}
            className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-line text-[11px] hover:bg-panel"
          >
            알림
            {!isAdmin && unreadNotices > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-warnAccent text-[10px] text-white">
                {unreadNotices}
              </span>
            )}
          </Link>

          <Link href={isAdmin ? '/admin/alerts' : '/settings'} className="flex items-center gap-2 pl-1.5">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
              {initialsOf(account.name)}
            </span>
            <span className="hidden sm:block">
              <span className="block text-[13px] font-medium text-brand-dark">{account.name}</span>
              <span className="block text-[10.5px] text-faint">{isAdmin ? '기관 관리자' : '간호조무 실습생'}</span>
            </span>
          </Link>
        </div>

        <nav className="flex gap-1.5 overflow-x-auto px-3 pb-2.5 lg:hidden">
          {nav.map((item) => (
            <NavLink key={item.id} item={item} className="flex flex-none items-center gap-2 whitespace-nowrap rounded-full border border-line px-3.5 py-2 transition-colors" />
          ))}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] flex-1 items-start gap-5 p-4">
        <aside className="sticky top-[76px] hidden w-56 flex-none flex-col gap-5 lg:flex">
          <div className="flex flex-col gap-0.5">
            {nav.map((item) => (
              <NavLink key={item.id} item={item} className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 transition-colors" />
            ))}
          </div>

          {!isAdmin ? (
            <div className="rounded-2xl bg-brand-dark p-[18px] text-white">
              <p className="text-[11px] font-bold tracking-wide text-brand-light">내 진도</p>
              <p className="mt-2.5 text-[15px] font-bold leading-snug">
                학습 문장 {wordsPracticed}개 · 평균 정확도 {avgAccuracy}%
              </p>
              <Link
                href={learnHref}
                className="mt-3.5 block rounded-[9px] bg-white py-2.5 text-center text-[12.5px] font-bold text-brand"
              >
                이어서 학습
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl bg-brand-dark p-[18px] text-white">
              <p className="text-[11px] font-bold tracking-wide text-brand-light">오늘 처리할 일</p>
              <div className="mt-3.5 flex flex-col gap-2">
                <div className="flex justify-between text-[12.5px] text-white/85">
                  <span>일지 확인</span>
                  <span className="font-bold">{ADMIN_OVERVIEW.pendingJournals}</span>
                </div>
                <div className="flex justify-between text-[12.5px] text-white/85">
                  <span>면담 예약</span>
                  <span className="font-bold">{ADMIN_OVERVIEW.upcomingMeetings}</span>
                </div>
                <div className="flex justify-between text-[12.5px] text-warnAccent">
                  <span>미접속 실습생</span>
                  <span className="font-bold">{ADMIN_OVERVIEW.unreachedLearners}</span>
                </div>
              </div>
              <Link
                href="/admin/alerts"
                className="mt-3.5 block rounded-[9px] bg-white py-2.5 text-center text-[12.5px] font-bold text-brand"
              >
                알림 및 면담 열기
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2.5 w-full rounded-[9px] border border-white/25 bg-white/10 py-2.5 text-[12.5px] hover:bg-white/15"
              >
                로그아웃
              </button>
            </div>
          )}
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
