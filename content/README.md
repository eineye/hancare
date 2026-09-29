# 실습내용(콘텐츠) 파일

`content/` 아래 JSON 파일이 한글케어의 실제 학습 콘텐츠(유닛 > 상황 > 용어/문장)입니다.
이 폴더의 파일들은 **앱 코드에 번들되지 않고 서버가 매 요청마다 다시 읽습니다**
(`lib/content.ts`) — 그래서 파일 내용을 바꾸고 저장하기만 하면, **재빌드/재배포 없이**
다음 접속부터 바로 반영됩니다.

| 파일 | 진도관리 화면 분류 |
|---|---|
| `practice-hangul.json` | 실습한글 (간호조무 실습 회화) |
| `basic-hangul.json` | 기초한글 |
| `xr-modules.json` | XR실습 (HnaCare XR 5대 모듈 — 스키마는 [`docs/XR_MODULE_DESIGN.md`](../docs/XR_MODULE_DESIGN.md) §6 참고, Unit 스키마와 다름) |

필요하면 같은 형식으로 새 파일을 만들고 `lib/content.ts`의 `CONTENT_FILES` 배열에
파일명을 추가하면 됩니다.

## 실습내용 편집기 (hancare-library-editor)

JSON을 손으로 고치지 않고 표/폼 화면으로 편집하려면 관리자로 로그인한 뒤 사이드바의
**실습내용 편집**(`/admin/library-editor`)을 여세요. 편집기 본체는
`public/hancare-library-editor.html`(단독 실행형 HTML)이며, 한글케어 서버의
`/api/hangul-library` 에 연결되어 **편집 즉시 자동 저장**됩니다.

| 엔드포인트 | 동작 |
|---|---|
| `GET /api/hangul-library/units` | `practice-hangul.json` + `basic-hangul.json`의 유닛 전체 |
| `PUT /api/hangul-library/units/:id` | 유닛 생성/수정 — `category`가 `practice`면 `practice-hangul.json`, `basic`이면 `basic-hangul.json`에 저장(카테고리를 바꾸면 파일도 옮겨짐) |
| `DELETE /api/hangul-library/units/:id` | 유닛 삭제 |

저장은 `lib/contentStore.ts`가 해당 JSON 파일을 직접 다시 쓰는 방식이라, 학습자
화면에도 재빌드 없이 바로 반영됩니다. 로마자·음절 자동 채우기, JSON/엑셀 불러오기·
내보내기, 중복 ID 경고도 편집기에서 쓸 수 있습니다.

> 주의: 데모 인증은 브라우저 `localStorage` 기반이라 API 자체에는 서버 인증이 없습니다.
> 외부에 공개된 서버에서는 이 API를 막거나 인증을 붙여야 합니다. 또 파일 시스템이
> 읽기 전용인 호스팅(Vercel 등)에서는 저장이 실패하므로, 그때는 편집기의 JSON 내보내기로
> 파일을 받아 저장소에 커밋하세요.

단일 파일판 `hangulcare.html`에도 관리자 메뉴 **실습내용 편집**이 있습니다. 이 경우 서버가
없으므로 편집기가 부모 화면과 `postMessage`로 연결되고, 편집 내용은 **그 브라우저의
`localStorage`(`hc-library-units`)** 에 저장되어 같은 브라우저의 기초한글/실습한글 화면에
바로 반영됩니다(다른 기기와는 공유되지 않음 — 보관은 JSON 내보내기로). "기본 콘텐츠로
되돌리기" 버튼으로 초기화할 수 있습니다.

## 스키마

각 파일의 최상위 값은 **유닛(Unit) 배열**입니다.

```jsonc
[
  {
    "id": "unit-basic-1",           // 고유 ID (다른 유닛과 겹치면 안 됨)
    "category": "basic",             // "basic"(기초한글) | "practice"(실습한글)
    "titleKo": "기초 한글",
    "titleEn": "Basic Hangul",
    "situations": [
      {
        "id": "basic-situation-1",   // 유닛 내에서 고유해야 함
        "menuLabelKo": "기본 인사 나누기", // 진도관리 화면 메뉴에 쓰는 짧은 이름
        "menuLabelEn": "Basic greetings",
        "titleKo": "처음 만난 선생님께 인사합니다.",   // 학습 화면 상단 상황 설명(문장형)
        "titleEn": "You greet a teacher you're meeting for the first time.",
        "descriptionKo": "가장 기본적인 인사말과 감사 표현을 익힙니다.",
        "descriptionEn": "Learn the most basic greetings and expressions of thanks.",
        "placeTag": "교실 · Classroom",
        "formalityTag": "존댓말 · Polite form",
        "difficultyTag": "난이도 입문",
        "terms": [
          { "id": "term-hello", "hangul": "안녕하세요", "romanization": "an-nyeong-ha-se-yo", "glossEn": "hello" }
        ],
        "sentences": [
          {
            "id": "basic-sentence-1-1",
            "textKo": "안녕하세요, 만나서 반갑습니다.",
            "textEn": "Hello, nice to meet you.",
            "romanization": "an-nyeong-ha-se-yo, man-na-seo ban-gap-seum-ni-da",
            // 문장부호·공백을 뺀 한글 음절을 한 글자씩 나열 — 따라읽기 채점에 쓰임
            "syllables": ["안", "녕", "하", "세", "요", "만", "나", "서", "반", "갑", "습", "니", "다"]
          }
        ]
      }
    ]
  }
]
```

- `terms`/`sentences`의 `id`는 저장소 전체에서 유일할 필요는 없지만, 한 상황 안에서는
  겹치지 않게 해주세요.
- `syllables`는 `textKo`에서 공백·마침표 등 문장부호를 뺀 한글 글자를 한 글자씩 배열로
  적은 것입니다. 발음 채점(`lib/scoring.ts`)과 따라읽기 하이라이트가 이 배열의 순서를
  그대로 사용하므로 `textKo`와 어긋나지 않게 맞춰주세요.

## 편집 시 주의

- JSON 문법 오류(콤마 누락 등)가 있는 파일은 서버가 읽지 못하고 **그 파일만 빈 목록으로
  처리**합니다(다른 파일/기능은 정상 동작). 저장 후 진도관리 화면에서 해당 분류가 갑자기
  비어 보이면 JSON 문법을 다시 확인하세요. 서버 로그(`[content] ... 읽는 데 실패했습니다`)에
  구체적인 오류가 남습니다.
- 새 유닛의 `id`가 기존 유닛과 겹치면 나중에 읽힌 파일의 유닛이 우선 적용될 수 있으니
  피해주세요.
