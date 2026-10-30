'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ADMIN_OVERVIEW, PENDING_JOURNAL_REVIEWS, UPCOMING_MEETINGS } from '@/lib/adminMock';
import type { AdminNotice } from '@/lib/types';

const listedAtFmt = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function StatTile({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-brand-dark">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function AdminAlertsView({ initialNotices }: { initialNotices: AdminNotice[] }) {
  const [notices, setNotices] = useState(initialNotices);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [audience, setAudience] = useState('전체 학습자');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | undefined>(undefined);

  const sentLast7Days = notices.filter((n) => Date.now() - n.createdAt < 7 * 86_400_000).length;

  async function handleSend() {
    if (!title.trim() || !detail.trim() || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleKo: title.trim(), detailKo: detail.trim(), audienceKo: audience.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '작성에 실패했습니다.');
      setNotices((prev) => [json.notice as AdminNotice, ...prev]);
      setTitle('');
      setDetail('');
      setAudience('전체 학습자');
    } catch (err) {
      setError(err instanceof Error ? err.message : '작성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/notices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? '삭제에 실패했습니다.');
      setNotices((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeletingId(undefined);
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11.5px] font-bold tracking-wide text-brand">알림 및 면담 ALERTS &amp; MEETINGS</p>
          <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
            처리할 항목 {ADMIN_OVERVIEW.pendingJournals + ADMIN_OVERVIEW.upcomingMeetings}건
          </h1>
          <p className="mt-2 text-sm text-muted">
            일지 확인 {ADMIN_OVERVIEW.pendingJournals}건, 면담 예약 {ADMIN_OVERVIEW.upcomingMeetings}건. 면담 일정·
            확인 대기 일지는 실제 백엔드가 없어 목데이터이지만, 아래 알림은 실제로 작성·저장되어 모든 학습자의
            알림(/notices) 화면에 바로 나타납니다.
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
        <StatTile value={String(sentLast7Days)} label="발송 알림" hint="최근 7일 · 실제 작성 건수" />
        <StatTile value={String(ADMIN_OVERVIEW.unreachedLearners)} label="미접속 3일 이상" hint="자동 알림 예약됨" />
      </div>

      <div className="flex flex-wrap items-start gap-3.5">
        <div className="min-w-0 flex-[1_1_520px] space-y-4">
          <div className="rounded-2xl border border-line bg-white p-4">
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

          <div className="rounded-2xl border border-line bg-white p-4">
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
          <div className="rounded-2xl bg-brand-dark p-4 text-white">
            <p className="text-[11px] font-bold tracking-wide text-brand-light">알림 작성</p>
            <div className="mt-3.5 flex flex-col gap-2.5">
              <div>
                <label className="mb-1.5 block text-xs text-white/60">제목</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 중간 평가 일정 안내"
                  maxLength={80}
                  className="w-full rounded-[10px] bg-white/10 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-white/60">내용</label>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="학습자에게 보여줄 내용을 적어주세요"
                  className="w-full resize-none rounded-[10px] bg-white/10 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs text-white/60">대상</label>
                  <button
                    type="button"
                    onClick={() => setAudience(`미접속 3일 이상 ${ADMIN_OVERVIEW.unreachedLearners}명`)}
                    className="text-[11px] text-brand-light underline-offset-2 hover:underline"
                  >
                    미접속 {ADMIN_OVERVIEW.unreachedLearners}명으로 채우기
                  </button>
                </div>
                <input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  maxLength={60}
                  className="w-full rounded-[10px] bg-white/10 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
                />
              </div>
            </div>
            {error && <p className="mt-2.5 text-xs text-rose-300">{error}</p>}
            <button
              type="button"
              onClick={handleSend}
              disabled={!title.trim() || !detail.trim() || saving}
              className="mt-3.5 w-full rounded-[10px] bg-white py-2.5 text-center text-[13px] font-bold text-brand disabled:opacity-50"
            >
              {saving ? '작성 중…' : '알림 보내기'}
            </button>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="mb-4 text-[11.5px] font-bold tracking-wide text-brand">보낸 알림 {notices.length}건</p>
            {notices.length === 0 ? (
              <p className="text-xs text-muted">아직 작성한 알림이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-3.5">
                {notices.map((n) => (
                  <div key={n.id} className="border-b border-line pb-3.5 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13.5px] font-medium text-brand-dark">{n.titleKo}</p>
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id)}
                        disabled={deletingId === n.id}
                        className="flex-none text-xs text-faint hover:text-warn disabled:opacity-50"
                      >
                        {deletingId === n.id ? '삭제 중…' : '삭제'}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted">{n.detailKo}</p>
                    <p className="mt-1.5 text-[11px] text-faint">
                      {listedAtFmt.format(new Date(n.createdAt))} · {n.audienceKo}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
