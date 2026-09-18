'use client';

import { useNoticesReadStore } from '@/lib/store';
import { NOTICES } from '@/lib/noticesMock';

export default function NoticesView() {
  const readIds = useNoticesReadStore((s) => s.readIds);
  const markRead = useNoticesReadStore((s) => s.markRead);
  const markAllRead = useNoticesReadStore((s) => s.markAllRead);

  const unreadCount = NOTICES.filter((n) => n.unread && !readIds.includes(n.id)).length;
  const groups = Array.from(new Set(NOTICES.map((n) => n.groupKo)));

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11.5px] font-bold tracking-wide text-brand">알림 NOTIFICATIONS</p>
          <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
            읽지 않은 알림 {unreadCount}건
          </h1>
          <p className="mt-2 text-sm text-muted">
            실제 발송 서버는 아직 없어 목록은 예시 데이터입니다. 읽음 처리만 실제로 이 브라우저에 저장됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => markAllRead(NOTICES.map((n) => n.id))}
          className="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm text-brand-dark hover:bg-panel"
        >
          모두 읽음으로 표시
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {groups.map((group) => (
          <div key={group}>
            <div className="bg-panel px-5 py-2.5 text-[11.5px] font-bold tracking-wide text-muted">{group}</div>
            {NOTICES.filter((n) => n.groupKo === group).map((n) => {
              const read = !n.unread || readIds.includes(n.id);
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
    </div>
  );
}
