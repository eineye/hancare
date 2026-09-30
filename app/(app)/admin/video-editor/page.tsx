// 영상 편집기 — public/hancare-video-editor.html을 그대로 띄운다. 편집기는 /api/videos에
// 자동 저장하고(영상 업로드·AI 자동 자막 포함), 그 API가 content/videos.json을 고쳐 쓰므로
// 영상학습 화면(/video)에 바로 반영된다. docs/VIDEO_EDITOR_DESIGN.md
export default function VideoEditorPage() {
  return (
    <div className="h-[calc(100vh-59px)]">
      <iframe src="/hancare-video-editor.html" title="영상 편집기" className="block h-full w-full border-0" />
    </div>
  );
}
