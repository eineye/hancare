'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth';
import { SUPPORTED_DISPLAY_LANGS, useSettingsStore, type DisplayLang } from '@/lib/store';
import { LANGS } from '@/lib/langs';

function Toggle({ on }: { on: boolean }) {
  return (
    <div className={`relative h-6 w-11 flex-none rounded-full ${on ? 'bg-brand' : 'bg-line'}`}>
      <div
        className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all ${on ? 'right-[3px]' : 'left-[3px]'}`}
      />
    </div>
  );
}

export default function SettingsView() {
  const router = useRouter();
  const account = useAuthStore((s) => s.account);
  const logout = useAuthStore((s) => s.logout);
  const displayLang = useSettingsStore((s) => s.displayLang);
  const setDisplayLang = useSettingsStore((s) => s.setDisplayLang);
  const speechRate = useSettingsStore((s) => s.speechRate);
  const setSpeechRate = useSettingsStore((s) => s.setSpeechRate);
  const scoringStrictness = useSettingsStore((s) => s.scoringStrictness);
  const setScoringStrictness = useSettingsStore((s) => s.setScoringStrictness);
  const autoPlayRecording = useSettingsStore((s) => s.autoPlayRecording);

  const [langOpen, setLangOpen] = useState(false);
  const [langNotice, setLangNotice] = useState<string | undefined>(undefined);

  function handleLangPick(lang: DisplayLang) {
    if (SUPPORTED_DISPLAY_LANGS.includes(lang)) {
      setDisplayLang(lang);
      setLangOpen(false);
      setLangNotice(undefined);
    } else {
      setLangNotice('이 언어의 번역 콘텐츠는 아직 준비 중입니다.');
    }
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  const currentLangRow = LANGS.find((l) => l.id === displayLang) ?? LANGS[0];
  const langFull = displayLang === 'ko' ? '한국어만' : `한국어 + ${currentLangRow.native}`;

  if (!account) return null;

  return (
    <div className="flex max-w-[760px] flex-col gap-[18px]">
      <div>
        <p className="text-[11.5px] font-bold tracking-wide text-brand">설정 SETTINGS</p>
        <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
          계정과 학습 환경
        </h1>
      </div>

      <section className="rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
            {account.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-[180px] flex-1">
            <p className="text-lg font-bold text-brand-dark">{account.name}</p>
            <p className="mt-1 text-sm text-muted">{account.role === 'admin' ? '기관 관리자' : '간호조무 실습생'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <p className="mb-4 text-[11.5px] font-bold tracking-wide text-brand">표시 언어</p>
        <div className="relative max-w-[360px]">
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            className="flex w-full items-center gap-3 rounded-[11px] border border-line bg-white px-4 py-3.5 text-sm hover:bg-panel"
          >
            <span className="flex-1 text-left">{langFull}</span>
            <span className="text-[10px] text-muted">▼</span>
          </button>
          {langOpen && (
            <div className="absolute inset-x-0 top-14 z-40 rounded-xl border border-line bg-white p-1.5 shadow-lg">
              {LANGS.map((l) => {
                const on = displayLang === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleLangPick(l.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-[13.5px] ${
                      on ? 'bg-brand-dark text-white' : 'text-brand-dark hover:bg-panel'
                    }`}
                  >
                    <span className="flex-1">{l.native}</span>
                    <span className={`text-[11.5px] ${on ? 'text-brand-light' : 'text-faint'}`}>{l.ko}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {langNotice && <p className="mt-2.5 text-xs text-warn">{langNotice}</p>}
        <p className="mt-3.5 text-xs leading-relaxed text-muted">
          용어 뜻과 화면 안내에 적용됩니다. 학습 문장은 항상 한국어로 표시됩니다.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <p className="mb-4 text-[11.5px] font-bold tracking-wide text-brand">음성과 발음</p>
        <div className="flex flex-col gap-[18px]">
          <div>
            <div className="mb-2 flex justify-between text-[13.5px]">
              <span className="text-brand-dark">아바타 말하기 속도</span>
              <span className="text-muted">{speechRate.toFixed(1)}배</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={speechRate}
              onChange={(e) => setSpeechRate(Number(e.target.value))}
              className="w-full accent-brand"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13.5px] text-brand-dark">채점 엄격도</p>
              <p className="mt-0.5 text-xs text-muted">
                {scoringStrictness === 'beginner' ? '초급 기준으로 채점합니다' : '중급 기준으로 좀 더 엄격하게 채점합니다'}
              </p>
            </div>
            <div className="flex gap-1 rounded-[9px] bg-panel p-1">
              {(['beginner', 'intermediate'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setScoringStrictness(level)}
                  className={`rounded-[6px] px-3 py-1.5 text-xs ${
                    scoringStrictness === level ? 'bg-brand-dark text-white' : 'text-muted'
                  }`}
                >
                  {level === 'beginner' ? '초급' : '중급'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <p className="mb-4 text-[11.5px] font-bold tracking-wide text-brand">알림 · 그 밖의 기능</p>
        <p className="mb-3.5 text-xs text-muted">
          아래 항목은 실제 녹음 오디오 저장이나 발송 서버가 아직 없어 화면 표시만 되고 실제로 켜고 끌 수는
          없습니다.
        </p>
        <div className="flex flex-col gap-3.5 opacity-60">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13.5px] text-brand-dark">녹음 자동 재생</span>
            <Toggle on={autoPlayRecording} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13.5px] text-brand-dark">복습 시간 알림 (매일 07:00)</span>
            <Toggle on={true} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13.5px] text-brand-dark">지도자 의견 알림</span>
            <Toggle on={true} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13.5px] text-brand-dark">주간 리포트 이메일</span>
            <Toggle on={false} />
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-[12px] border border-line bg-white py-3.5 text-center text-[13.5px] text-warn hover:bg-warnBg"
      >
        로그아웃
      </button>
    </div>
  );
}
