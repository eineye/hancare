# 실습내용(콘텐츠) 파일

`content/` 아래 JSON 파일이 한글케어의 실제 학습 콘텐츠(유닛 > 상황 > 용어/문장)입니다.
이 폴더의 파일들은 **앱 코드에 번들되지 않고 서버가 매 요청마다 다시 읽습니다**
(`lib/content.ts`) — 그래서 파일 내용을 바꾸고 저장하기만 하면, **재빌드/재배포 없이**
다음 접속부터 바로 반영됩니다.

| 파일 | 진도관리 화면 분류 |
|---|---|
| `practice-hangul.json` | 실습한글 (간호조무 실습 회화) |
| `basic-hangul.json` | 기초한글 |
| `videos.json` | 영상학습 (`/video` — 영상 경로·자막(cues)·어휘 주석. 스키마는 [`docs/VIDEO_MODULE_DESIGN.md`](../docs/VIDEO_MODULE_DESIGN.md) §5 참고, 영상 파일은 `public/videos/`) |
| `xr-modules.json` | XR실습 (HnaCare XR 5대 모듈 — 스키마는 [`docs/XR_MODULE_DESIGN.md`](../docs/XR_MODULE_DESIGN.md) §6 참고, Unit 스키마와 다름) |
| `roleplays.json` | 역할극 시나리오 (상황별 환자 설정·첫 대사·규칙 응답 — 아래 "역할극 편집기" 참고) |
| `vocab.json` | 단어장 설정 (단어장 전용 단어 + 상황 용어 숨김·분류·메모 — 아래 "단어장 편집기" 참고, Unit 스키마와 다름) |
| `ttsSettings.json` | 학습 음성(TTS) 설정 — 관리자가 고른 Gemini 음색 1개(아래 "음성 설정" 참고, Unit 스키마와 다름) |
| `notices.json` | 관리자가 작성한 알림 목록 — 학습자 알림(`/notices`)·상단바 알림 벨이 그대로 읽는다(아래 "알림 작성" 참고, Unit 스키마와 다름) |

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

## 단어장 편집기 (hancare-vocab-editor)

관리자 메뉴 **단어장 편집**(`/admin/vocab-editor`, 편집기 본체 `public/hancare-vocab-editor.html`)에서
학습자 **단어장**(`/vocab`)과 홈의 "복습이 필요한 용어"에 나오는 단어를 편집합니다.
설정은 `content/vocab.json`에 자동 저장됩니다(`GET/PUT /api/vocab`, `lib/vocab.ts`).

학습자 단어장 = **상황 용어**(위 유닛 파일들의 `terms`, 숨긴 것 제외) + **단어장 전용 단어**(`custom`).

```jsonc
{
  "custom": [   // 학습 상황에는 없고 단어장에만 나오는 단어
    { "id": "vocab-1", "hangul": "간호사실", "romanization": "gan-ho-sa-sil", "glossEn": "nurses' station",
      "group": "병동 시설", "note": "선택 — 카드에 표시되는 메모" }
  ],
  "lessonOverrides": {   // 상황 용어 id → 단어장 표시 설정 (용어 자체는 실습내용 편집에서 고침)
    "term-bp": { "hidden": true },
    "term-temp": { "group": "활력징후", "note": "..." }
  }
}
```

- `group`(분류)이 하나라도 있으면 단어장 화면에 분류 필터가 생깁니다.
- 전용 단어의 한글이 상황 용어와 같으면 상황 용어가 우선합니다(편집기에서 빨간 칸으로 표시).
- 학습 진도("학습함")는 단어 `id` 기준이라, 전용 단어는 단어장에서 ▶ 듣기를 누르면 학습함이 됩니다.
- 엑셀 불러오기/내보내기: `CustomWords` 시트(hangul, romanization, glossEn, group, note),
  `LessonTerms` 시트(id, visible Y/N, group, note).
- `hangulcare.html`(단일 파일판)에서는 같은 설정이 브라우저 `localStorage`(`hc-vocab-config`)에 저장됩니다.

## XR실습 편집기 (hancare-xr-editor)

관리자 메뉴 **XR실습 편집**(`/admin/xr-editor`, 편집기 본체 `public/hancare-xr-editor.html`)에서
`xr-modules.json`을 편집합니다(`GET/PUT /api/xr-modules`). 저장하면 학습자 XR실습 목록(`/xr`)·
실습 화면(`/xr/[moduleId]`)·커리큘럼의 XR실습 항목에 바로 반영됩니다.

- 모듈: 순서(▲▼ — 저장 시 `order`를 1부터 다시 매김), id, 모듈명(한/영), 법정 실습시간, 환자 이름,
  환자 첫 마디/상황(한/영), 적용 기술(표시용) / 추가·삭제
- 인터랙션: 실습 화면의 조작 버튼 이름(한/영)과 누르면 로그에 나오는 결과 문구(한/영), id / 추가·삭제·순서 변경
- id가 비었거나 중복되면 저장하지 않고 상태줄에 이유를 보여줍니다.
- 모듈 id `xr-vital-signs`는 3D 실습 화면과 연결되어 있으니 바꾸지 마세요.
- 엑셀 불러오기/내보내기: `Modules` 시트 + `Interactions` 시트(moduleId로 연결).
- `hangulcare.html`(단일 파일판)에서는 브라우저 `localStorage`(`hc-xr-modules`)에 저장됩니다.

## 역할극 편집기 (hancare-roleplay-editor)

관리자 메뉴 **역할극 편집**(`/admin/roleplay-editor`, 편집기 본체 `public/hancare-roleplay-editor.html`)에서
상황별 역할극 시나리오를 편집합니다. 설정은 `content/roleplays.json`에 자동 저장됩니다(`GET/PUT /api/roleplays`).
시나리오가 없는 상황은 기존과 같은 기본 역할극으로 동작합니다.

```jsonc
{
  "scenarios": {
    "unit-1/situation-1": {                 // 키 = 유닛id/상황id
      "enabled": false,                     // 선택 — false면 "아직 역할극이 준비되지 않았습니다"
      "patientNameKo": "김진수",
      "patientProfileKo": "72세 남성, 고혈압으로 입원 3일째",
      "goalKo": "인사하고 혈압 측정을 설명한 뒤 동의를 구하세요.",   // 학습자 화면에 표시
      "openingKo": "아이고, 선생님 오셨어요?",   // 환자 첫 대사 (없으면 AI가 인사를 만듦)
      "personaKo": "말수가 적고 조금 불안해함…",  // Gemini에게 주는 환자 성격·말투·증상
      "replies": [{ "keywords": ["혈압", "재겠"], "replyKo": "네, 팔 걷을게요." }],
      "fallbackKo": "네? 다시 한 번 말씀해 주시겠어요?",
      "hintsKo": ["혈압 좀 재겠습니다."]       // 학습자 화면 추천 표현 (누르면 입력창에 채워짐)
    }
  }
}
```

- **Gemini 키가 있을 때**: 환자 설정·목표·용어로 만든 환자 역할 지시(`app/api/chat/route.ts`)로 AI가 대사를 만듭니다.
- **키가 없을 때 / `hangulcare.html`**: 규칙 응답(`lib/roleplay.ts` `ruleReply()`)으로 답합니다 —
  키워드 규칙(위에서부터) → 상황 용어 언급 → 통증·감사 → `fallbackKo` 순.
- 편집기 오른쪽 **테스트 대화**로 규칙 응답을 바로 시험할 수 있습니다.
- `hangulcare.html`(단일 파일판)에서는 브라우저 `localStorage`(`hc-roleplay-config`)에 저장됩니다.

## 음성 설정 (hancare-voice-settings)

관리자 메뉴 **음성 설정**(`/admin/voice-settings`, `components/AdminVoiceSettings.tsx`)에서
학습 화면 전체(따라 읽기 · 단어 듣기 · 단어장 · 영상 자막, `lib/speech.ts`의 `speak()`)가
재생하는 "원어민 발음" 음색을 고릅니다. 다른 편집기들과 달리 이 화면은 단독 HTML
편집기가 아니라 일반 React 페이지입니다(편집할 내용이 값 하나뿐이라 iframe JSON
편집기 없이 바로 구현). 고르는 즉시 `content/ttsSettings.json`에 자동 저장됩니다
(`GET/PUT /api/tts-settings`, `lib/ttsSettings.ts`, PUT은 관리자만 — `middleware.ts`).

```jsonc
{ "voiceId": "kore-announcer-f" }   // lib/ttsVoices.ts의 TTS_VOICE_OPTIONS 중 하나
```

- 음색 목록(8종, `lib/ttsVoices.ts`)은 Gemini 2.5 TTS의 사전 설정 음색 중 "성별 느낌 ×
  표준 아나운서/친근한 대화체/안내방송톤/또박또박한 스타일"로 고른 것입니다. Gemini
  음색은 공식적으로 성별을 표시하지 않으므로, 화면의 **▶ 미리듣기** 버튼으로 직접
  들어보고 고르는 것을 권장합니다.
- 실제 합성은 학습자가 발음 듣기 버튼을 누를 때 서버(`app/api/tts/route.ts`,
  `lib/geminiTts.ts`)가 그때그때 Gemini API(`GEMINI_API_KEY` 공용)를 호출해 처리합니다
  — `GET /api/tts-settings`가 저장된 음색을 미리 내려주는 게 아니라, `/api/tts`가 저장된
  설정을 서버에서 직접 읽어 씁니다.
- `GEMINI_API_KEY`가 없거나 호출이 실패하면 학습자 화면은 자동으로 브라우저 내장
  음성(Web Speech API)으로 대체됩니다(`lib/speech.ts`) — 이 화면에서 무엇을 고르고
  저장해도 키가 없으면 적용되지 않는다는 안내 배너가 뜹니다.
- 역할극의 "AI 환자"·메디쌤 팝업(`character2d-canvas` 엔진, 위 "아바타" 관련 내용은
  README.md 참고)은 입모양(비셈) 타이밍 때문에 별도의 Web Speech 기반 엔진을 그대로
  쓰며, 이 설정의 영향을 받지 않습니다.
- 단일 파일판 `hangulcare.html`은 서버가 없어 `GEMINI_API_KEY`를 안전하게 보관할 수
  없으므로(클라이언트 코드에 키가 노출됨) 이 Gemini 음색 설정과는 연동되지 않습니다.
  대신 같은 관리자 메뉴 위치에 **브라우저 내장 음성(Web Speech API) 중에서 고르는**
  별도의 "음성 설정" 화면이 있습니다 — 이 브라우저에 설치된 음성 목록(`getVoices()`)을
  보여주고, 고른 `voiceURI`를 `hc-voice-settings`에 저장해 `pickKoreanVoice()`가
  그 음성을 우선 쓰게 합니다(없으면 기존처럼 첫 한국어 음성 자동 선택). 음색
  자체는 Gemini만큼 다양하거나 자연스럽지 않을 수 있고, 기기·브라우저·OS에 따라
  사용 가능한 음성이 다릅니다.

## 알림 작성 (hancare-admin-notices)

관리자 메뉴 **알림 및 면담**(`/admin/alerts`, `components/AdminAlertsView.tsx`)의 "알림
작성" 카드에서 제목·내용·대상(자유 텍스트)을 적어 **실제로 작성·저장**합니다. 다른
편집기들과 달리 복잡한 표 편집기가 아니라 일반 폼이라 iframe 없이 바로 구현했습니다.
작성하면 즉시 `content/notices.json`에 저장되고(`GET/POST /api/notices`,
`DELETE /api/notices/:id`, `lib/notices.ts`, POST/DELETE는 관리자만 —
`middleware.ts`), **모든 학습자의 알림(`/notices`) 화면과 상단바 알림 벨 배지에 바로
반영**됩니다.

```jsonc
[
  { "id": "notice-1700000000000-ab12cd", "titleKo": "중간 평가 일정 안내",
    "detailKo": "9월 23일 수요일 11시, 실습교육실에서 회화 실기 중간 평가가 있습니다.",
    "audienceKo": "전체 학습자", "createdAt": 1700000000000 }
]
```

- "대상"(`audienceKo`)은 화면 표시용 자유 텍스트일 뿐, 실제로 특정 학습자에게만
  보이도록 걸러주지는 않습니다(모든 학습자가 모든 알림을 봅니다) — 관리자 메뉴의
  "미접속 N명으로 채우기" 버튼은 이전 버전의 "알림 보내기" 기능을 자연어 문구로
  남겨두는 편의 기능입니다.
- 학습자 화면의 "오늘/이번 주/이전" 묶음과 표시 시각은 저장된 `createdAt`만으로 매
  요청마다 자동 계산합니다(`components/NoticesView.tsx`의 `describe()`) — 작성할 때
  따로 분류를 고르지 않습니다.
- "읽었는지"는 실제 발송·열람 추적 서버가 없어 각 학습자 **브라우저의 로컬 읽음
  상태**로만 구분됩니다(`useNoticesReadStore`, 다른 기기·사용자와 공유되지 않음) —
  그래서 관리자 화면에는 실제 열람률을 보여주지 않습니다.
- `hangulcare.html`(단일 파일판)에서는 같은 기능이 브라우저 `localStorage`
  (`hc-admin-notices`)에 저장되어 그 브라우저 안에서만 작성자·학습자 화면이 공유합니다
  (다른 기기와는 공유되지 않음 — 서버가 없는 단일 파일판의 한계는 다른 편집기들과
  같습니다).

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
