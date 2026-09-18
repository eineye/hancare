'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ADMIN_OVERVIEW, PENDING_JOURNAL_REVIEWS, RECENT_NOTICES_SENT, UPCOMING_MEETINGS } from '@/lib/adminMock';

function StatTile({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-brand-dark">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function AdminAlertsView() {
  const [sent, setSent] = useState(false);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11.5px] font-bold tracking-wide text-brand">알림 및 면담 ALERTS &amp; MEETINGS</p>
          <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
            처리할 항목 {ADMIN_OVERVIEW.pendingJournals + ADMIN_OVERVIEW.upcomingMeetings}건
          </h1>
          <p className="mt-2 text-sm text-muted">
            일지 확인 {ADMIN_OVERVIEW.pendingJournals}건, 면담 예약 {ADMIN_OVERVIEW.upcomingMeetings}건. 이 화면의
            일정·발송 이력은 실제 백엔드가 없어 목데이터입니다.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm text-brand-dark hover:bg-panel"
        >
          전체 현황
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatTile value={String(ADMIN_OVERVIEW.pendingJournals)} label="확인 대기 일지" hint={`${ADMIN_OVERVIEW.pendingJournalsOverdueCount}건 3일 경과`} />
        <StatTile value={String(ADMIN_OVERVIEW.upcomingMeetings)} label="예정 면담" hint="이번 주" />
        <StatTile value={String(ADMIN_OVERVIEW.sentNoticesLast7Days)} label="발송 알림" hint={`열람률 ${ADMIN_OVERVIEW.sentNoticesReadRate}%`} />
        <StatTile value={String(ADMIN_OVERVIEW.unreachedLearners)} label="미접속 3일 이상" hint="자동 알림 예약됨" />
      </div>

      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="min-w-0 flex-[1_1_520px] space-y-4">
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="mb-4 text-[11.5px] font-bold tracking-wide text-brand">면담 일정</p>
            <div className="flex flex-col gap-2.5">
              {UPCOMING_MEETINGS.map((meeting) => (
                <div
                  key={meeting.titleKo}
                  className={`rounded-xl p-4 ${meeting.urgent ? 'border border-warnBorder bg-warnBg' : 'bg-panel'}`}
                >
                  <p className={`text-xs font-bold ${meeting.urgent ? 'text-warn' : 'text-faint'}`}>{meeting.dateKo}</p>
                  <p className="mt-1.5 text-sm font-bold text-brand-dark">{meeting.titleKo}</p>
                  <p className="mt-1 text-xs text-muted">{meeting.detailKo}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="mb-4 text-[11.5px] font-bold tracking-wide text-brand">확인 대기 일지</p>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11.5px] text-faint">
                  <th className="py-2 font-medium">실습생</th>
                  <th className="py-2 font-medium">부서</th>
                  <th className="py-2 font-medium">제출일</th>
                  <th className="py-2 font-medium">경과</th>
                </tr>
              </thead>
              <tbody>
                {PENDING_JOURNAL_REVIEWS.map((row) => (
                  <tr key={row.learnerName} className="border-b border-line last:border-0">
                    <td className="py-3 font-medium text-brand-dark">{row.learnerName}</td>
                    <td className="py-3 text-muted">{row.department}</td>
                    <td className="py-3 text-muted">{row.submittedKo}</td>
                    <td className={`py-3 font-bold ${row.daysAgo >= 3 ? 'text-warn' : 'text-muted'}`}>{row.daysAgo}일</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0 flex-[1_1_300px] max-w-[360px] space-y-4">
          <div className="rounded-2xl bg-brand-dark p-5 text-white">
            <p className="text-[11px] font-bold tracking-wide text-brand-light">알림 보내기</p>
            <p className="mt-3.5 text-xs leading-relaxed text-white/70">
              미접속 실습생 {ADMIN_OVERVIEW.unreachedLearners}명에게 학습 독려 알림을 보냅니다. (실제 발송 서버는
              아직 없어 클릭 확인만 동작합니다.)
            </p>
            <button
              type="button"
              onClick={() => setSent(true)}
              className="mt-4 w-full rounded-[10px] bg-white py-2.5 text-center text-[13px] font-bold text-brand"
            >
              {sent ? '발송했습니다 ✓' : `${ADMIN_OVERVIEW.unreachedLearners}명에게 발송`}
            </button>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="mb-4 text-[11.5px] font-bold tracking-wide text-brand">최근 발송 이력</p>
            <div className="flex flex-col gap-3.5">
              {RECENT_NOTICES_SENT.map((n) => (
                <div key={n.titleKo} className="border-b border-line pb-3.5 last:border-0 last:pb-0">
                  <p className="text-[13.5px] font-medium text-brand-dark">{n.titleKo}</p>
                  <p className="mt-1 text-xs text-muted">{n.metaKo}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
