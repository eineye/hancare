// 실습내용 편집기 — public/hancare-library-editor.html을 그대로 띄운다. 편집기는
// /api/hangul-library에 자동 저장하고, 그 API가 content/*.json을 직접 고쳐 쓰므로
// 저장 즉시 학습자 화면(기초한글/실습한글)에 반영된다.
export default function LibraryEditorPage() {
  return (
    <div className="h-[calc(100vh-59px)]">
      <iframe
        src="/hancare-library-editor.html"
        title="실습내용 편집기"
        className="block h-full w-full border-0"
      />
    </div>
  );
}
