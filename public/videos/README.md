# 영상학습 MP4 파일 넣는 곳

> 관리자 화면 **영상 편집** 메뉴(영상 에디터)에서 영상을 올리면 서버의 `uploads/videos/`에
> 저장되고 AI 자동 자막까지 만들 수 있습니다([`docs/VIDEO_EDITOR_DESIGN.md`](../../docs/VIDEO_EDITOR_DESIGN.md)).
> 이 폴더는 빌드 때 함께 배포할 영상이나, 서버가 없는 `hangulcare.html`용 영상을 두는 곳입니다.

`content/videos.json`의 각 영상 `src`가 가리키는 파일을 이 폴더에 넣으면 됩니다.
(독립 실행형 `hangulcare.html`은 같은 파일을 `./public/videos/…` 경로로 읽습니다.)

| `src` 값 | 넣을 파일 | 내용 |
|---|---|---|
| `/videos/nursing-assistant.mp4` | `public/videos/nursing-assistant.mp4` | 1번 "나는 누구일까요? — 간호조무사 소개" (1분 29초, 640×360) |
| `/videos/medication.mp4` | `public/videos/medication.mp4` | 2번 "식후 투약 안내" — 아직 영상 없음(대본만) |

## 1번 영상 파일은 저장소에 없습니다

1번은 대한간호조무사협회(KLPNA) 홍보 영상입니다. 공개 저장소·GitHub Pages에 올려도 되는지
사용 권리가 확인되지 않아 **git에서 제외**했습니다(`.gitignore`). 자막(`cues`)과 어휘 주석은
영상에 들어 있는 자막을 그대로 옮겨 적은 것이라 저장소에 포함되어 있습니다.

- 로컬/운영 서버: 영상 파일을 `public/videos/nursing-assistant.mp4`로 직접 복사하면 재생됩니다.
- 파일이 없는 곳(예: GitHub Pages)에서는 **자막 연습 모드**로 동작합니다.
- 협회에서 사용 허락을 받으면 `.gitignore`의 해당 줄을 지우고 커밋해도 됩니다.

## 규칙

- 권장 형식: MP4(H.264 + AAC), 720p, 1~3분 이내, 파일당 50MB 이하
- 자막 시간(`cues[].start/end`, 초 단위)은 실제 영상 대사 시점에 맞게 고쳐 주세요.
- 파일이 없거나 재생에 실패하면 플레이어는 **자막 연습 모드**(자막만 시간에 맞춰 흐름)로
  자동 전환되므로, 영상이 준비되기 전에도 질문하기 기능은 그대로 쓸 수 있습니다.
- `content/videos.json`을 고치면 `hangulcare.html` 안의 `var VIDEOS = [...]` 한 줄도 같은 내용으로
  바꿔야 합니다.
- 자체 제작했거나 사용 허락을 받은 영상만 올리세요. 대용량·다수 영상은 CDN/스트리밍
  서버(HLS)로 옮기고 `src`에 절대 URL을 적는 방식을 권장합니다 — `docs/VIDEO_MODULE_DESIGN.md` §8 참고.
