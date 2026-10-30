// XR실습 편집기 — public/hancare-xr-editor.html을 그대로 띄운다. 편집기는 /api/xr-modules에
// 자동 저장하고, 그 API가 content/xr-modules.json을 고쳐 쓰므로 XR실습 화면(/xr)과
// 커리큘럼의 XR실습 목록에 바로 반영된다.
export default function XrEditorPage() {
  return (
    <div className="h-[calc(100vh-59px)]">
      <iframe src="/hancare-xr-editor.html" title="XR실습 편집기" className="block h-full w-full border-0" />
    </div>
  );
}
