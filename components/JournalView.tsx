'use client';

import { useState } from 'react';
import { useJournalStore } from '@/lib/store';

const TODAY_KO = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(
  new Date(),
);

export default function JournalView() {
  const entries = useJournalStore((s) => s.entries);
  const addEntry = useJournalStore((s) => s.addEntry);

  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  function handleSave() {
    if (!department.trim() || !notes.trim()) return;
    addEntry({
      dateKo: TODAY_KO,
      department: department.trim(),
      notesKo: notes.trim(),
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setDepartment('');
    setNotes('');
    setTagsInput('');
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <p className="text-[11.5px] font-bold tracking-wide text-brand">실습 일지 JOURNAL</p>
        <h1 className="mt-2.5 text-[28px] font-black tracking-tight text-brand-dark sm:text-[30px]">
          내 실습 기록 {entries.length}건
        </h1>
        <p className="mt-2 text-sm text-muted">
          그날 사용한 표현을 적어두세요. 이 브라우저에만 저장됩니다(다른 기기와 공유되지 않음). 지도자 확인·의견
          기능은 실제 멘토 계정이 없는 프로토타입 단계라 아직 없습니다.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-3.5">
        <div className="min-w-0 flex-[1_1_440px] space-y-3.5">
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
              아직 작성한 일지가 없습니다. 오른쪽에서 첫 일지를 남겨보세요.
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-line bg-white p-4">
                <p className="text-base font-bold text-brand-dark">
                  {entry.dateKo} · {entry.department}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-brand-dark/80">{entry.notesKo}</p>
                {entry.tags.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {entry.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-panel px-3 py-1.5 text-xs text-brand-dark">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="min-w-0 flex-[1_1_300px] max-w-[360px] rounded-2xl bg-brand-dark p-4 text-white">
          <p className="text-[11px] font-bold tracking-wide text-brand-light">새 일지 작성</p>
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-xs text-white/60">날짜</p>
              <p className="rounded-[10px] bg-white/10 px-3.5 py-2.5 text-sm">{TODAY_KO}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-white/60">부서</label>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="예: 내과 병동"
                className="w-full rounded-[10px] bg-white/10 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-white/60">오늘 사용한 표현</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="한국어로 적어도 되고, 모국어로 적어도 됩니다"
                className="w-full resize-none rounded-[10px] bg-white/10 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-white/60">태그 (쉼표로 구분)</label>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="혈압, 체온"
                className="w-full rounded-[10px] bg-white/10 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!department.trim() || !notes.trim()}
            className="mt-4 w-full rounded-[11px] bg-white py-2.5 text-center text-[13.5px] font-bold text-brand disabled:opacity-50"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
