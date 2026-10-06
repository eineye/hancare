// 단어장 편집기 — public/hancare-vocab-editor.html을 그대로 띄운다. 편집기는 /api/vocab에
// 자동 저장하고, 그 API가 content/vocab.json을 고쳐 쓰므로 학습자 단어장(/vocab)과
// 홈의 "복습이 필요한 용어"에 바로 반영된다.
export default function VocabEditorPage() {
  return (
    <div className="h-[calc(100vh-59px)]">
      <iframe src="/hancare-vocab-editor.html" title="단어장 편집기" className="block h-full w-full border-0" />
    </div>
  );
}
