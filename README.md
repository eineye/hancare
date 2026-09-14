# 한글케어 (HangulCare)

외국인 간호조무 실습생을 위한 AI 한국어 학습 서비스 — 의료 용어와 실습 회화를
한 화면에서 배운다.

- 아바타 발음 지도
- 발음 정확도 채점
- LLM 대화 학습

전체 시스템 아키텍처, 데이터 모델, API, AI/음성 파이프라인, 개발 로드맵은
[`docs/PROGRAM_DESIGN.md`](docs/PROGRAM_DESIGN.md)를 참고하세요.

## 프로토타입 실행하기

이 저장소에는 설계 문서를 바탕으로 만든 **동작하는 프론트엔드 프로토타입**(Next.js)이
포함되어 있습니다. 반응형 웹 1개로 데스크톱/모바일 브라우저를 모두 지원하며, PWA로
홈 화면에 추가해 앱처럼 사용할 수 있습니다.

```bash
npm install
npm run dev       # http://localhost:3000
```

`/`으로 접속하면 첫 유닛/상황(`/learn/unit-1/situation-1`)으로 이동합니다.

### LLM 대화 기능 활성화 (선택)

대화창(영역 6)의 LLM 대화는 [Gemini API](https://aistudio.google.com/app/apikey)로
연동되어 있습니다(비용 고려 — 무료 테스트 티어가 있는 `gemini-1.5-flash` 사용). 키가
없어도 앱은 정상 동작하며, 이 경우 채팅창에 환경변수 설정 안내가 표시됩니다.

```bash
cp .env.example .env.local
# .env.local에 GEMINI_API_KEY=발급받은키 입력
```

### 프로토타입 범위 안내

- **콘텐츠**: `data/units.json`의 로컬 목데이터(유닛/상황/용어/문장)
- **STT/TTS**: 브라우저 내장 Web Speech API (Chrome 권장, 마이크 권한 필요)
- **발음 채점**: 실제 음성 신호 기반 채점이 아닌, 인식된 텍스트와 목표 문장을
  비교하는 **텍스트 유사도 근사치**입니다 (`lib/scoring.ts`)
- **아바타**: 정지 일러스트 + TTS 발화 상태에 연동된 CSS 애니메이션 (실시간 립싱크
  영상 아님)
- **사용자 통계**: 로그인 없이 이 브라우저의 `localStorage`에만 저장되는 데모 값

실제 서비스로 확장할 때 필요한 백엔드/AI 파이프라인 설계는
[`docs/PROGRAM_DESIGN.md`](docs/PROGRAM_DESIGN.md)의 §4~§6을 참고하세요.

### 프로덕션 빌드

```bash
npm run build
npm run start
```

빌드 시 `public/sw.js`(수동 작성한 최소 서비스워커)가 등록되어 오프라인에서도
마지막으로 방문한 화면을 다시 열 수 있습니다.
