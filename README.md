# 한글케어 (HangulCare)

외국인 간호조무 실습생을 위한 AI 한국어 학습 서비스 — 의료 용어와 실습 회화를
한 화면에서 배운다.

- 아바타 발음 지도
- 발음 정확도 채점
- LLM 대화 학습

전체 시스템 아키텍처, 데이터 모델, API, AI/음성 파이프라인, 개발 로드맵은
[`docs/PROGRAM_DESIGN.md`](docs/PROGRAM_DESIGN.md)를, XR실습(HnaCare XR) 구성
지침은 [`docs/XR_MODULE_DESIGN.md`](docs/XR_MODULE_DESIGN.md)를 참고하세요.

디자인은 claude.ai/design에서 만든 시안(웜 베이지 배경 · 다크 그린 `#12241F` ·
포인트 틸 `#0E7C66`, Noto Sans KR + IBM Plex Mono, 상단바+좌측 사이드바 메뉴 구조)을
전체 적용했습니다. 색상·폰트 토큰은 `tailwind.config.ts`, 공용 앱 셸은
`components/AppShell.tsx`에 있습니다.

## 프로토타입 실행하기

이 저장소에는 설계 문서를 바탕으로 만든 **동작하는 프론트엔드 프로토타입**(Next.js)이
포함되어 있습니다. 반응형 웹 1개로 데스크톱/모바일 브라우저를 모두 지원하며, PWA로
홈 화면에 추가해 앱처럼 사용할 수 있습니다.

```bash
npm install
npm run dev       # http://localhost:3000
```

`/`으로 접속하면 로그인 화면(`/login`)으로 이동합니다. 데모 계정으로 바로 시작할 수 있습니다.

| 역할 | 아이디 | 비밀번호 | 로그인 후 이동 |
|---|---|---|---|
| 학습자 | `student` | `1234` | `/home` (홈 대시보드) |
| 관리자 | `admin` | `admin` | `/admin` (전체 현황) |

`/login` 화면의 "학습자로 시작"/"관리자로 시작" 버튼으로 바로 로그인할 수도 있습니다.
이 로그인은 실제 서버 인증이 아닌 `localStorage` 기반 데모 인증입니다(`lib/auth.ts`).

로그인 후에는 상단바(로고·언어 선택·알림·프로필) + 좌측 사이드바 메뉴 셸
(`components/AppShell.tsx`)로 이동합니다. 학습자 메뉴는 홈 / 커리큘럼 / 한글학습 /
XR실습 / 역할극 / 단어장 / 리포트 / 실습 일지 / 알림 / 설정이고, 관리자 메뉴는
전체 현황 / 알림 및 면담입니다.

진도관리(`/courses`)에서는 학습 단계를 기초한글 / 실습한글 / XR실습 3개 분류로
고를 수 있습니다. 셋 다 `content/*.json` 파일의 실제 콘텐츠로 연결되어 있습니다.
XR실습(`/xr`)은 [`docs/XR_MODULE_DESIGN.md`](docs/XR_MODULE_DESIGN.md)의 Phase 1
(화면 흐름·상호작용 셸)까지 구현되어 있으며, 실제 3D 뷰어·물리 엔진은 아직 없고
와이어프레임 미리보기와 목데이터 인터랙션 결과로 대체되어 있습니다. 5개 모듈 중
1번 "활력징후 및 기초사정"은 Three.js 3D 뷰포트가 실제로 동작하는 독립 프로토타입
[`public/xr/vital-signs.html`](public/xr/vital-signs.html)(`/xr/vital-signs.html`로
정적 서빙, 다른 사이트에 `<iframe>`으로 임베드 가능)로 먼저 검증했으며, 아직 위
`/xr` 메뉴에는 연결되어 있지 않습니다(자세한 내용은 `docs/XR_MODULE_DESIGN.md` §7.1 참고).

### 새 화면 (역할극 · 단어장 · 리포트 · 실습 일지 · 알림 · 설정 · 관리자 알림)

| 화면 | 실제로 동작하는 부분 | 아직 목데이터인 부분 |
|---|---|---|
| `/roleplay/[unitId]/[situationId]` | Gemini API(`/api/chat`)로 실제 대화하는 역할극. 마이크로 말하면 STT로 인식해 전송 | — |
| `/vocab` | `content/*.json`의 실제 용어 전체를 모은 단어장, 듣기·검색·"학습함" 구분 | 시안에 있던 가짜 발음 점수 숫자는 빼고, 실제로 들어봤는지만 표시 |
| `/report` | 평균 발음 점수·학습 문장 수·유닛별 용어 학습 현황은 실제 누적 기록 | 주차별 추이 그래프, 약한 발음 요소 분석은 예시 데이터(음소 단위 분석 미구현) |
| `/journal` | 실습 일지 작성·저장·조회가 이 브라우저에 실제로 됨(`localStorage`) | 지도자 확인·의견 기능은 실제 멘토 계정이 없어 아직 없음 |
| `/notices` | 읽음/안읽음 처리는 실제로 저장됨 | 알림 목록 자체는 발송 서버가 없어 예시 데이터 |
| `/settings` | 표시 언어(한/영), 아바타 말하기 속도, 채점 엄격도는 실제로 다른 화면에 반영됨 | 녹음 자동 재생, 알림 토글은 화면 표시만(백엔드 없음) |
| `/admin/alerts` | — | 면담 일정·확인 대기 일지·발송 이력 전부 목데이터(`lib/adminMock.ts`) |

사이드바 언어 드롭다운은 시안처럼 7개 언어(한국어/영어/몽골어/베트남어/필리핀어/
미얀마어/인도네시아어)를 보여주지만, 실제 뜻풀이 번역 콘텐츠가 있는 건 한국어/
영어뿐이라 그 둘만 실제로 전환되고 나머지는 "번역 준비 중" 안내가 뜹니다.

### 실습내용(콘텐츠) 수정하기

기초한글·실습한글의 실제 학습 내용(유닛/상황/용어/문장)은 코드에 섞여 있지 않고
**`content/` 폴더의 JSON 파일**에 있습니다. 이 파일들은 서버가 매 요청마다 다시
읽으므로, **재빌드·재배포 없이** 파일만 고치고 저장하면 다음 접속부터 바로
반영됩니다. 자세한 스키마와 편집 방법은 [`content/README.md`](content/README.md)를
참고하세요.

| 파일 | 진도관리 분류 |
|---|---|
| `content/practice-hangul.json` | 실습한글 |
| `content/basic-hangul.json` | 기초한글 |

### LLM 대화 기능 활성화 (선택)

대화창(영역 6)의 LLM 대화는 [Gemini API](https://aistudio.google.com/app/apikey)로
연동되어 있습니다(비용 고려 — 무료 테스트 티어가 있는 `gemini-1.5-flash` 사용). 키가
없어도 앱은 정상 동작하며, 이 경우 채팅창에 환경변수 설정 안내가 표시됩니다.

```bash
cp .env.example .env.local
# .env.local에 GEMINI_API_KEY=발급받은키 입력
```

### 프로토타입 범위 안내

- **콘텐츠**: `content/*.json`의 로컬 목데이터(유닛/상황/용어/문장) — 재빌드 없이
  파일 교체만으로 갱신 가능 (위 "실습내용(콘텐츠) 수정하기" 참고)
- **STT/TTS**: 브라우저 내장 Web Speech API (Chrome 권장, 마이크 권한 필요)
- **발음 채점**: 실제 음성 신호 기반 채점이 아닌, 인식된 텍스트와 목표 문장을
  비교하는 **텍스트 유사도 근사치**입니다 (`lib/scoring.ts`)
- **아바타 (한글학습 화면의 AI 아바타 선생님)**: 외부에서 받은 Canvas 2D 벡터 캐릭터
  엔진(원본 `character2d-canvas.js`)을 씁니다. 문장을 초성·중성·종성으로 분해해
  입모양(비셈) 타임라인을 만들고, 브라우저 TTS의 단어 경계(`onboundary`) 이벤트로
  타이밍을 보정하며 재생합니다 — 실제 음성 파형을 분석한 게 아니라 텍스트 기반
  타임라인이라, 브라우저·음성 조합에 따라 완벽히 일치하지 않을 수 있습니다.
  호흡·눈 깜빡임·시선 추적 애니메이션도 함께 포함되어 있습니다.
  - Next.js 앱: `lib/teacher2d/character2d-canvas.js` + React 래퍼
    `components/TeacherAvatar.tsx`.
  - `hangulcare.html`: 같은 엔진의 전역 스크립트판(`character2d-canvas.global.js`,
    저장소 루트)을 `<script>` 태그로 불러와 씁니다. 이 파일은 상태가 바뀔 때마다
    화면 전체를 `innerHTML`로 다시 그리는데, 캔버스 엔진은 계속 살아있는
    애니메이션 인스턴스라 매번 새로 만들면 안 돼서 인스턴스를 하나만 만들어 두고
    다시 그릴 때마다 캔버스만 새 컨테이너로 옮겨 붙이는 방식(`mountTeacherAvatar()`)을
    씁니다.
  - 역할극(`/roleplay`) 화면의 "AI 환자" 아바타는 다른 캐릭터라 이전의 간단한 SVG
    얼굴(Next.js `components/Avatar2D.tsx`, `hangulcare.html`의 `avatarFaceSvg()` —
    말하는 동안 무작위 입모양)을 그대로 씁니다.
- **사용자 통계**: 이 브라우저의 `localStorage`에만 저장되는 데모 값(다른 기기와 공유되지 않음)
- **로그인/관리자 화면**: 실제 서버 인증·다중 사용자 DB가 아닌 데모 계정 + 목데이터
  (`lib/auth.ts`, `data/learners.json`) 기반 UX 프로토타입입니다

실제 서비스로 확장할 때 필요한 백엔드/AI 파이프라인 설계는
[`docs/PROGRAM_DESIGN.md`](docs/PROGRAM_DESIGN.md)의 §4~§6을 참고하세요.

### 프로덕션 빌드

```bash
npm run build
npm run start
```

빌드 시 `public/sw.js`(수동 작성한 최소 서비스워커)가 등록되어 오프라인에서도
마지막으로 방문한 화면을 다시 열 수 있습니다.
