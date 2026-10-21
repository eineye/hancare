'use client';

import { useNoticesReadStore } from '@/lib/store';
import type { AdminNotice } from '@/lib/types';

const timeFmt = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const dateFmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' });

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function startOfWeek(d: Date): number {
  // 월요일 시작 주.
  const day = (d.getDay() + 6) % 7;
  return startOfDay(d) - day * 86_400_000;
}

/** 작성 시각(createdAt)만으로 "오늘/이번 주/이전" 묶음과 표시용 시각 문구를 계산한다 —
 * 관리자가 알림을 작성할 때 따로 분류를 고르지 않아도 되도록 자동으로 정해준다. */
function describe(createdAt: number, now: Date) {
  const d = new Date(createdAt);
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const groupKo = createdAt >= todayStart ? '오늘' : createdAt >= weekStart ? '이번 주' : '이전';
  const timeKo = groupKo === '오늘' ? timeFmt.format(d) : dateFmt.format(d);
  return { groupKo, timeKo };
}

export default function NoticesView({ notices }: { notices: AdminNotice[] }) {
  const readIds = useNoticesReadStore((s) => s.readIds);
  const markRead = useNoticesReadStore((s) => s.markRead);
  const markAllRead = useNoticesReadStore((s) => s.markAllRead);

  const unreadCount = notices.filter((n) => !readIds.includes(n.id)).length;
  const now = new Date();
  const grouped = notices.map((n) => ({ ...n, ...describe(n.createdAt, now) }));
  const groupOrder = ['오늘', '이번 주', '이전'] as const;
  const groups = groupOrder.filter((g) => grouped.some((n) => n.groupKo === g));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11.5px] font-bold tracking-wide text-brand">알림 NOTIFICATIONS</p>
          <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
            읽지 않은 알림 {unreadCount}건
          </h1>
          <p className="mt-2 text-sm text-muted">
            관리자가 작성한 알림입니다. 실제 발송 서버(푸시 등)는 없어 이 목록에 나타나는 것으로 전달을 대신하며,
            읽음 처리만 이 브라우저에 실제로 저장됩니다.
          </p>
        </div>
        {notices.length > 0 && (
          <button
            type="button"
            onClick={() => markAllRead(notices.map((n) => n.id))}
            className="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm text-brand-dark hover:bg-panel"
          >
            모두 읽음으로 표시
          </button>
        )}
      </div>

      {notices.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
          아직 받은 알림이 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {groups.map((group) => (
            <div key={group}>
              <div className="bg-panel px-5 py-2.5 text-[11.5px] font-bold tracking-wide text-muted">{group}</div>
              {grouped
                .filter((n) => n.groupKo === group)
                .map((n) => {
                  const read = readIds.includes(n.id);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => markRead(n.id)}
                      className={`flex w-full items-start gap-3.5 border-b border-line px-5 py-4 text-left last:border-0 ${
                        read ? 'opacity-60' : ''
                      }`}
                    >
                      <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${read ? 'bg-line' : 'bg-warnAccent'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-brand-dark">{n.titleKo}</p>
                        <p className="mt-1 text-xs text-muted">{n.detailKo}</p>
                      </div>
                      <span className="flex-none text-xs text-faint">{n.timeKo}</span>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
