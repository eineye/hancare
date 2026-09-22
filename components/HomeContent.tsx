'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { useJournalStore, usePracticedTermsStore, useProgressStore, useSettingsStore, useStatsStore } from '@/lib/store';
import type { VocabCard } from '@/lib/vocab';

interface SituationRef {
  unitId: string;
  situationId: string;
  titleKo: string;
  unitTitleKo: string;
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
// 실제 주간 발음 추이 이력은 아직 없어(누적치만 저장) 시안과 같은 형태의
// 목데이터 막대다 — 실제 수치가 아님을 위젯 하단에 명시한다.
const MOCK_WEEKLY_TREND = [62, 74, 58, 86, 78, 94, 70];

export default function HomeContent({
  situations,
  vocabCards,
}: {
  situations: SituationRef[];
  vocabCards: VocabCard[];
}) {
  const account = useAuthStore((s) => s.account);
  const wordsPracticed = useStatsStore((s) => s.wordsPracticed);
  const accuracySum = useStatsStore((s) => s.accuracySum);
  const accuracyCount = useStatsStore((s) => s.accuracyCount);
  const lastUnitId = useProgressStore((s) => s.lastUnitId);
  const lastSituationId = useProgressStore((s) => s.lastSituationId);
  const practicedTermIds = usePracticedTermsStore((s) => s.practicedTermIds);
  const journalEntries = useJournalStore((s) => s.entries);
  const displayLang = useSettingsStore((s) => s.displayLang);

  const avgAccuracy = accuracyCount > 0 ? Math.round(accuracySum / accuracyCount) : 0;

  const current =
    situations.find((s) => s.unitId === lastUnitId && s.situationId === lastSituationId) ?? situations[0];
  const learnHref = current ? `/learn/${current.unitId}/${current.situationId}` : '/courses';
  const roleplayHref = current ? `/roleplay/${current.unitId}/${current.situationId}` : '/courses';

  const reviewCards = vocabCards.filter((c) => !practicedTermIds.includes(c.id)).slice(0, 3);
  const recentJournal = journalEntries.slice(0, 2);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center gap-7 rounded-[18px] bg-brand-dark p-7 text-white sm:p-8">
        <div className="min-w-[260px] flex-1">
          {current && (
            <p className="text-xs font-bold tracking-wide text-brand-light">
              {current.unitTitleKo} · {current.titleKo}
            </p>
          )}
          <h1 className="mt-3 text-[28px] font-black leading-[1.3] tracking-tight sm:text-[32px]">
            안녕하세요, {account?.name ?? '실습생'} 님
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-white/65">
            {wordsPracticed > 0
              ? `지금까지 문장 ${wordsPracticed}개를 연습했습니다. 오늘도 이어서 연습해 보세요.`
              : '아직 연습 기록이 없습니다. 첫 문장을 따라 읽어보세요.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href={learnHref} className="rounded-[11px] bg-brand px-5 py-3 text-sm font-bold">
              학습 이어하기
            </Link>
            <Link
              href={roleplayHref}
              className="rounded-[11px] border border-white/25 bg-white/10 px-5 py-3 text-sm"
            >
              역할극 연습
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-3.5">
          <div className="min-w-[110px] rounded-2xl bg-white/10 px-5 py-4">
            <p className="text-[22px] font-black">{wordsPracticed}</p>
            <p className="mt-1 text-[11px] text-white/65">학습 문장</p>
          </div>
          <div className="min-w-[110px] rounded-2xl bg-white/10 px-5 py-4">
            <p className="text-[22px] font-black">{practicedTermIds.length}</p>
            <p className="mt-1 text-[11px] text-white/65">학습한 용어</p>
          </div>
          <div className="min-w-[110px] rounded-2xl bg-white/10 px-5 py-4">
            <p className="text-[22px] font-black">
              {avgAccuracy}
              <span className="text-sm">%</span>
            </p>
            <p className="mt-1 text-[11px] text-white/65">평균 발음</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11.5px] font-bold tracking-wide text-brand">주간 발음 추이 (예시)</p>
          </div>
          <div className="flex h-[120px] items-end gap-2">
            {MOCK_WEEKLY_TREND.map((h, i) => (
              <div key={WEEKDAYS[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div
                  className={`w-full rounded-t-[6px] ${h >= 85 ? 'bg-brand' : 'bg-chipBorder'}`}
                  style={{ height: `${h}%` }}
                />
                <span className="text-[11px] text-faint">{WEEKDAYS[i]}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-faint">
            * 실제 요일별 이력은 아직 저장하지 않아 예시 그래프입니다. 실제 값은 위 상단 통계를 참고하세요.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="mb-4 text-[11.5px] font-bold tracking-wide text-brand">복습이 필요한 용어</p>
          {reviewCards.length === 0 ? (
            <p className="text-sm text-muted">
              {vocabCards.length === 0 ? '아직 등록된 용어가 없습니다.' : '등록된 용어를 모두 들어봤습니다 👏'}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {reviewCards.map((c) => (
                <Link
                  key={c.id}
                  href={c.situationHref}
                  className="flex items-center gap-3.5 rounded-xl bg-panel px-4 py-3 hover:bg-chip"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-brand-dark">{c.hangul}</p>
                    {displayLang !== 'ko' && <p className="mt-0.5 text-[11.5px] text-muted">{c.glossEn}</p>}
                  </div>
                  <span className="text-xs text-brand">듣기 →</span>
                </Link>
              ))}
            </div>
          )}
          <Link href="/vocab" className="mt-4 block rounded-[11px] bg-brand-dark py-3 text-center text-[13px] font-bold text-white">
            단어장 전체 보기
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11.5px] font-bold tracking-wide text-brand">최근 실습 일지</p>
            <Link href="/journal" className="text-xs text-brand">
              일지 →
            </Link>
          </div>
          {recentJournal.length === 0 ? (
            <p className="text-sm text-muted">아직 작성한 일지가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentJournal.map((entry) => (
                <div key={entry.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-brand-dark">
                    {entry.dateKo} · {entry.department}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{entry.notesKo}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
