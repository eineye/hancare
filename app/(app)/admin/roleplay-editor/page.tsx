// 역할극 편집기 — public/hancare-roleplay-editor.html을 그대로 띄운다. 편집기는 /api/roleplays에
// 자동 저장하고, 그 API가 content/roleplays.json을 고쳐 쓰므로 학습자 역할극 화면에 바로 반영된다.
export default function RoleplayEditorPage() {
  return (
    <div className="h-[calc(100vh-59px)]">
      <iframe src="/hancare-roleplay-editor.html" title="역할극 편집기" className="block h-full w-full border-0" />
    </div>
  );
}
