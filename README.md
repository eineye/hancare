# 한글케어 (HangulCare)

외국인 간호조무 실습생을 위한 AI 한국어 학습 서비스 — 의료 용어와 실습 회화를
한 화면에서 배운다.

- 아바타 발음 지도
- 발음 정확도 채점
- LLM 대화 학습

전체 시스템 아키텍처, 데이터 모델, API, AI/음성 파이프라인, 개발 로드맵은
[`docs/PROGRAM_DESIGN.md`](docs/PROGRAM_DESIGN.md)를, XR실습(HnaCare XR) 구성
지침은 [`docs/XR_MODULE_DESIGN.md`](docs/XR_MODULE_DESIGN.md)를 참고하세요.

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
| 학습자 | `student` | `1234` | `/courses` (진도관리 · 학습 단계 선택) |
| 관리자 | `admin` | `admin` | `/admin` (학습자 진도 목록) |

`/login` 화면의 "학습자로 시작"/"관리자로 시작" 버튼으로 바로 로그인할 수도 있습니다.
이 로그인은 실제 서버 인증이 아닌 `localStorage` 기반 데모 인증입니다(`lib/auth.ts`).

진도관리 화면(`/courses`)에서는 학습 단계를 기초한글 / 실습한글 / XR실습 3개 분류로
고를 수 있습니다. 셋 다 `content/*.json` 파일의 실제 콘텐츠로 연결되어 있습니다.
XR실습(`/xr`)은 [`docs/XR_MODULE_DESIGN.md`](docs/XR_MODULE_DESIGN.md)의 Phase 1
(화면 흐름·상호작용 셸)까지 구현되어 있으며, 실제 3D 뷰어·물리 엔진은 아직 없고
와이어프레임 미리보기와 목데이터 인터랙션 결과로 대체되어 있습니다.

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
- **아바타**: 직접 그린 2D 일러스트 얼굴(`components/Avatar2D.tsx`, 독립 실행형
  `hangulcare.html`에도 동일하게 포함)이 말하는 동안(`speaking` 상태) 자체 타이머로
  일정한 리듬마다 음소 그룹별 입모양(닫힘/크게 벌림/오므림/이 보임/미소/F·V) 중
  하나를 무작위로 보여줍니다 — 실제 발음을 분석해 고르는 게 아니라 근사치입니다.
  브라우저는 합성 음성 오디오를 Web Audio API로 분석할 방법을 제공하지 않고
  (음소 타이밍을 알 수 없음), TTS의 단어 경계(`onBoundary`) 이벤트도 브라우저·음성
  조합에 따라(특히 일부 한국어 음성) 아예 발생하지 않을 수 있어 입모양 전환을
  그 이벤트에 의존하지 않고 `speaking` 상태 동안 스스로 스케줄링하는 타이머로
  구현했습니다. 진짜 음소 단위 립싱크는 비seme 타이밍을 제공하는 유료 TTS 서버가
  있어야 가능합니다.
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
