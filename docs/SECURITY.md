# 운영 보안 설정 (API 키 · 로그인 · 접근 제어)

한글케어 Next.js 서버를 실제로 운영할 때 필요한 설정과 동작 방식이다. 핵심은 두 가지다.

1. **Gemini API 키는 서버 안에만 있다** — 브라우저로 내려가지 않는다.
2. **그 키를 쓰는 API는 로그인한 사람만, 정해진 횟수만 부를 수 있다** — 키가 숨겨져 있어도 API가 열려 있으면
   남이 우리 키로 요금을 쓸 수 있기 때문이다.

---

## 1. 운영 서버 설정 (`.env.local`)

서버의 프로젝트 폴더에 `.env.local`을 만들고(git에 올라가지 않는다), 서버 계정만 읽게 한다(`chmod 600 .env.local`).
Vercel 등 호스팅을 쓰면 파일 대신 대시보드의 환경 변수(Secrets)에 같은 이름으로 넣는다.

| 변수 | 필수 | 설명 |
|---|---|---|
| `GEMINI_API_KEY` | AI 기능 쓸 때 | AI 대화·영상 질문·AI 자동 자막. **`NEXT_PUBLIC_`을 붙이면 브라우저에 노출되므로 절대 붙이지 않는다** |
| `SESSION_SECRET` | ✅ | 세션 쿠키 서명 키, 32자 이상. 없으면 운영에서 로그인·API가 모두 막힌다(503) |
| `ADMIN_PASSWORD` | ✅ | 관리자(`admin`) 비밀번호. 비워 두면 관리자 로그인 불가 |
| `STUDENT_PASSWORD` | 선택 | 데모 학습자(`student`) 비밀번호. 비워 두면 그 계정 로그인 불가 |
| `ALLOW_DEMO_LOGIN` | 선택 | `true`면 로그인 화면의 "데모 계정으로 바로 시작" 버튼을 켠다(운영 기본: 꺼짐) |
| `TRUST_PROXY` | 선택 | nginx·로드밸런서 뒤에서 돌릴 때만 `true` — `X-Forwarded-For`로 접속 IP를 확인해 IP별 로그인 제한에 쓴다 |
| `SESSION_COOKIE_INSECURE` | 선택 | HTTPS 없이 운영할 때만 `true`(권장하지 않음). 기본은 HTTPS 전용(Secure) 쿠키 |

`SESSION_SECRET` 만들기:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

개발 중(`npm run dev`)에는 위 값이 없어도 개발용 키와 예전 데모 비밀번호(`admin`/`admin`, `student`/`1234`)로 동작한다.
운영(`npm run build && npm run start`)에서는 개발용 값이 **절대 쓰이지 않는다**.

---

## 2. Gemini API 키 보호

| 위치 | 상태 |
|---|---|
| 키를 읽는 곳 | 서버 라우트 `/api/chat`, `/api/video-qa`, `/api/videos/transcribe`의 `process.env.GEMINI_API_KEY`뿐 |
| 브라우저 | 키가 전달되지 않음. Gemini SDK는 키를 URL이 아닌 요청 헤더로 보내 로그·오류 URL에도 찍히지 않음 |
| 오류 메시지 | AI 자동 자막 실패 시 외부 서비스 원문 오류는 서버 로그에만 남기고 화면에는 일반 문구만 보냄 |
| `hangulcare.html`(GitHub Pages) | 정적 페이지는 키를 숨길 수 없어 키를 쓰지 않음(규칙 기반 답변) |

Google 쪽에서도 제한을 걸어 둔다(Google AI Studio → Google Cloud 콘솔 "API 및 서비스 → 사용자 인증 정보"):

- **API 제한**: Generative Language API만 허용
- **애플리케이션 제한**: 운영 서버의 고정 IP만 허용 — 키가 새어도 다른 곳에서 못 쓴다
- **사용량 한도·예산 알림** 설정, 개발용/운영용 키 분리, 의심되면 즉시 재발급

---

## 3. 로그인과 세션

- 로그인은 서버(`POST /api/auth/login`)가 확인한다. 비밀번호는 브라우저 코드에 없고 서버 환경 변수로만 받는다.
  비교는 SHA-256 다이제스트를 시간차 없이(`timingSafeEqual`) 비교한다.
- 성공하면 **서명된 세션 쿠키** `hc_session`을 발급한다(`lib/session.ts`).
  - 값: 사용자 정보 + 만료 시각(12시간)을 HMAC-SHA256으로 서명 → 고치면 무효
  - `HttpOnly`(자바스크립트로 읽을 수 없음), `SameSite=Lax`(다른 사이트에서 보낸 요청에 안 붙음), 운영에서 `Secure`(HTTPS 전용)
- `GET /api/auth/me`로 현재 세션 확인, `POST /api/auth/logout`으로 쿠키 삭제.
- 화면의 로그인 상태(브라우저 저장소)는 표시용이다. `AuthGuard`가 서버 세션과 맞춰 보고, 만료됐으면 로그인 화면으로 보낸다.

---

## 4. 접근 제어 (`middleware.ts`)

모든 `/api/*` 요청과 관리자 편집기 페이지(`/hancare-*-editor.html`)는 서버에서 세션을 확인한다.

| 대상 | 허용 |
|---|---|
| `/api/auth/*` | 누구나 |
| 관리자 데이터 쓰기 — `/api/videos*`(저장·업로드·AI 자동 자막), `/api/hangul-library*`, `/api/roleplays`, `/api/vocab`, `/api/xr-modules`의 GET 외 요청 | 관리자만(아니면 403) |
| 그 밖의 `/api/*` — AI 대화(`/api/chat`), 영상 질문(`/api/video-qa`), 영상 파일(`/api/videos/file/*`), 목록 읽기 | 로그인한 사용자(아니면 401) |
| 편집기 페이지 `/hancare-*-editor.html` | 관리자만(아니면 로그인 화면으로) |

추가로, 다른 사이트에서 보낸 쓰기 요청(`Origin` 헤더가 다른 출처)은 403으로 막는다(CSRF 방어 보강).

---

## 5. 호출 횟수 제한 (`lib/rateLimit.ts`)

| 대상 | 한도 |
|---|---|
| 로그인 시도 | 계정당 10분에 10회 (`TRUST_PROXY=true`면 IP당 10분에 30회도) |
| AI 대화 `/api/chat`, 영상 질문 `/api/video-qa` | 사용자당 분당 15회, 하루 400회 |
| AI 자동 자막 `/api/videos/transcribe` | 사용자당 시간당 20회, 하루 60회 |
| 영상 업로드 | 사용자당 시간당 30회, 하루 100회 |

넘으면 `429`와 `Retry-After`(초)를 돌려준다. 서버 프로세스 메모리에 세므로 **서버를 여러 대로 늘리면
Redis 같은 공유 저장소로 바꿔야 한다.** 계정당 로그인 제한은 남이 일부러 틀려서 그 계정을 10분간 잠글 수 있다는
점도 알아 둔다.

---

## 6. 남은 일 (다음 단계)

- 계정을 DB로 옮기고 비밀번호는 해시(bcrypt/argon2)로 저장, 기관·학습자별 계정 발급
- 세션 무효화(강제 로그아웃) 목록, 관리자 2단계 인증
- 호출 제한을 Redis로, 사용량 대시보드
- 서비스워커는 `/api/` 응답을 캐시하지 않는다(로그인한 사람의 데이터가 기기에 남지 않게).
