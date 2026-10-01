'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import XrViewportScene from './XrViewportScene';
import { useXrProgressStore } from '@/lib/xrStore';
import type { XrModule } from '@/lib/types';

interface XrPracticeScreenProps {
  module: XrModule;
  prevHref?: string;
  nextHref?: string;
  progress: { current: number; total: number };
}

interface ModalState {
  title: string;
  body: React.ReactNode;
}

interface LogEntry {
  id: string;
  labelKo: string;
  resultKo: string;
}

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function XrPracticeScreen({ module: m, prevHref, nextHref, progress }: XrPracticeScreenProps) {
  const router = useRouter();
  const storedProgress = useXrProgressStore((s) => s.progress[m.id]);
  const markCompleted = useXrProgressStore((s) => s.markCompleted);
  const markSubmitted = useXrProgressStore((s) => s.markSubmitted);

  const [started, setStarted] = useState(false);
  const [dialogueDismissed, setDialogueDismissed] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [reading, setReading] = useState('대기 중…');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [sessionStart] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  // 이전/다음 모듈로 넘어가도(같은 라우트 컴포넌트가 재사용되므로) 화면 상태를
  // 새 모듈 기준으로 초기화한다. components/LessonScreen.tsx와 동일한 패턴.
  useEffect(() => {
    setStarted(false);
    setDialogueDismissed(false);
    setModal(null);
    const persisted = storedProgress?.completed ?? [];
    setCompletedIds(persisted);
    const nextLog = m.interactions
      .filter((it) => persisted.includes(it.id))
      .map((it) => ({ id: it.id, labelKo: it.labelKo, resultKo: it.resultKo }));
    setLog(nextLog);
    setReading(nextLog.length ? nextLog[nextLog.length - 1].resultKo : '대기 중…');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.id]);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - sessionStart), 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  function handleInteraction(it: XrModule['interactions'][number]) {
    if (!started) return;
    setReading(it.resultKo);
    if (!completedIds.includes(it.id)) {
      setCompletedIds((prev) => [...prev, it.id]);
      setLog((prev) => [{ id: it.id, labelKo: it.labelKo, resultKo: it.resultKo }, ...prev]);
      markCompleted(m.id, it.id);
    }
  }

  function handleSubmit() {
    if (completedIds.length === 0) return;
    markSubmitted(m.id);
    setModal({
      title: `리포트 — ${m.titleKo}`,
      body: (
        <div>
          <p className="mb-2 text-sm text-muted">
            환자 {m.patientNameKo} · 완료 {completedIds.length}/{m.interactions.length}개 인터랙션
          </p>
          {m.interactions
            .filter((it) => completedIds.includes(it.id))
            .map((it) => (
              <div key={it.id} className="border-t border-line py-2">
                <p className="text-sm font-semibold text-brand-dark">{it.labelKo}</p>
                <p className="mt-0.5 font-mono text-xs text-muted">{it.resultKo}</p>
              </div>
            ))}
        </div>
      ),
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-line bg-white px-4 py-3">
        <div className="min-w-[120px] flex-1">
          <p className="truncate text-sm font-bold text-brand-dark">{m.titleKo}</p>
          <p className="truncate text-xs text-muted">환자 {m.patientNameKo}</p>
        </div>
        <span className="shrink-0 rounded-full bg-panel px-3 py-1 font-mono text-xs text-brand-dark">
          모듈 {progress.current} / {progress.total}
        </span>
        <button
          type="button"
          onClick={() => prevHref && router.push(prevHref)}
          disabled={!prevHref}
          className="shrink-0 rounded-lg border border-line px-2 py-1 text-sm text-brand-dark disabled:opacity-30"
          aria-label="이전 모듈"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => nextHref && router.push(nextHref)}
          disabled={!nextHref}
          className="shrink-0 rounded-lg border border-line px-2 py-1 text-sm text-brand-dark disabled:opacity-30"
          aria-label="다음 모듈"
        >
          →
        </button>
        <Link href="/xr" className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs text-brand-dark">
          ← 목록
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        <XrViewportScene>
          <div className="absolute right-3.5 top-3.5 w-[min(60%,230px)] rounded-xl border border-emerald-800 bg-black/60 p-3 text-emerald-300 backdrop-blur-sm">
            <p className="mb-1 font-mono text-[10px] tracking-wider text-emerald-700">인터랙션 결과 모니터</p>
            <p className="min-h-[2.4em] font-mono text-sm leading-snug">{reading}</p>
            {log.length > 0 && (
              <div className="mt-2 max-h-20 space-y-1 overflow-y-auto border-t border-emerald-900 pt-2">
                {log.map((l, idx) => (
                  <div key={`${l.id}-${idx}`} className="font-mono text-[10px] text-emerald-700">
                    <span className="text-emerald-300">{l.labelKo}</span> — {l.resultKo}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="absolute inset-x-3.5 bottom-3.5">
            {!dialogueDismissed ? (
              <div className="max-w-md rounded-xl bg-white/95 p-3.5 text-brand-dark shadow-sm">
                <p className="text-sm font-bold">{m.patientNameKo}</p>
                <p className="mt-1 text-sm leading-relaxed">{m.situationKo}</p>
                <p className="mt-1 text-xs text-muted">{m.situationEn}</p>
                <button
                  type="button"
                  onClick={() => setDialogueDismissed(true)}
                  className="mt-2.5 rounded-lg bg-brand-dark px-3.5 py-1.5 text-xs font-semibold text-white"
                >
                  다음
                </button>
              </div>
            ) : (
              <span className="inline-block rounded-lg border border-emerald-800 bg-black/60 px-3 py-2 font-mono text-xs text-emerald-300">
                ▶ 오른쪽에서 실습시작을 눌러 진행하세요
              </span>
            )}
          </div>
        </XrViewportScene>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() =>
              setModal({
                title: '환자정보',
                body: (
                  <p className="text-sm leading-relaxed text-muted">
                    <strong className="text-brand-dark">{m.patientNameKo}</strong>
                    <br />
                    실습 모듈: {m.titleKo}
                    <br />
                    법정 실습시간: {m.legalHours}시간
                    <br />
                    적용 예정 기술: {m.techNoteKo}
                  </p>
                ),
              })
            }
            className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-left text-sm font-medium"
          >
            환자정보
          </button>
          <button
            type="button"
            onClick={() =>
              setModal({
                title: '상황안내',
                body: (
                  <div className="space-y-2 text-sm text-muted">
                    <p>(실제 서비스에서는 상황안내 영상이 재생됩니다. 프로토타입에서는 텍스트로 대체합니다.)</p>
                    <p>
                      &ldquo;{m.situationKo}&rdquo;
                      <br />
                      <span className="text-faint">{m.situationEn}</span>
                    </p>
                  </div>
                ),
              })
            }
            className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-left text-sm font-medium"
          >
            상황안내
          </button>

          <div className="my-1 h-px bg-black/5" />

          <button
            type="button"
            onClick={() => setStarted(true)}
            disabled={started}
            className={`rounded-xl px-3.5 py-2.5 text-left text-sm font-bold ${
              started ? 'bg-emerald-50 text-emerald-700' : 'bg-brand text-white hover:bg-brand/90'
            }`}
          >
            {started ? '실습 진행 중' : '실습시작'}
          </button>

          {m.interactions.map((it) => {
            const done = completedIds.includes(it.id);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => handleInteraction(it)}
                disabled={!started}
                className="flex items-center justify-between rounded-xl border border-line bg-white px-3.5 py-2.5 text-left text-sm font-semibold disabled:opacity-40"
              >
                {it.labelKo}
                {done && <span className="text-emerald-600">✓</span>}
              </button>
            );
          })}

          <div className="my-1 h-px bg-black/5" />

          <button
            type="button"
            onClick={() =>
              setModal({
                title: '도움말',
                body: (
                  <div className="space-y-2 text-sm text-muted">
                    <p>
                      1. <strong>실습시작</strong>을 눌러 인터랙션 버튼을 활성화하세요.
                    </p>
                    <p>2. 각 인터랙션 버튼을 눌러 결과를 확인하세요(왼쪽 위 모니터에 표시됩니다).</p>
                    <p>
                      3. 하나 이상 완료하면 <strong>리포트제출</strong>로 마무리할 수 있어요.
                    </p>
                  </div>
                ),
              })
            }
            className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-left text-sm font-medium"
          >
            도움말
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={completedIds.length === 0}
            className="rounded-xl bg-brand-dark px-3.5 py-2.5 text-left text-sm font-bold text-white disabled:bg-black/5 disabled:text-faint"
          >
            리포트제출
          </button>
          {completedIds.length === 0 && (
            <p className="px-1 text-xs text-faint">인터랙션을 1개 이상 완료하면 제출할 수 있어요.</p>
          )}

          <div className="mt-1 rounded-xl border border-line bg-white p-3.5 text-xs text-muted">
            이번 세션 실습시간{' '}
            <span className="font-mono font-semibold text-brand-dark">{formatElapsed(elapsed)}</span>
          </div>
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="max-h-[84vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-base font-bold text-brand-dark">{modal.title}</h3>
            {modal.body}
            <button
              type="button"
              onClick={() => setModal(null)}
              className="mt-4 w-full rounded-lg bg-brand py-2.5 text-sm font-bold text-white"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
