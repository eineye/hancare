# 영상학습 MP4 파일 넣는 곳

`content/videos.json`의 각 영상 `src`가 가리키는 파일을 이 폴더에 넣으면 됩니다.

| `src` 값 | 넣을 파일 |
|---|---|
| `/videos/bp-check.mp4` | `public/videos/bp-check.mp4` |
| `/videos/medication.mp4` | `public/videos/medication.mp4` |

- 권장 형식: MP4(H.264 + AAC), 720p, 1~3분 이내, 파일당 50MB 이하
- 자막 시간(`cues[].start/end`, 초 단위)은 실제 영상 대사 시점에 맞게 고쳐 주세요.
- 파일이 없거나 재생에 실패하면 플레이어는 **자막 연습 모드**(자막만 시간에 맞춰 흐름)로
  자동 전환되므로, 영상이 준비되기 전에도 질문하기 기능은 그대로 쓸 수 있습니다.
- 자체 제작했거나 사용 허락을 받은 영상만 올리세요. 대용량·다수 영상은 CDN/스트리밍
  서버(HLS)로 옮기고 `src`에 절대 URL을 적는 방식을 권장합니다 — `docs/VIDEO_MODULE_DESIGN.md` §8 참고.
