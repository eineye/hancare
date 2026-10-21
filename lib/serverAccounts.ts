import { createHash, timingSafeEqual } from 'node:crypto';
import { isProduction, type SessionUser } from './session';

// 서버 전용 — 로그인 계정 확인. 비밀번호는 브라우저 코드에 두지 않고 서버 환경변수로만 받는다.
// docs/SECURITY.md 참고.
//   ADMIN_PASSWORD   관리자(admin) 비밀번호
//   STUDENT_PASSWORD 데모 학습자(student) 비밀번호
// 개발 중(npm run dev)에는 설정이 없으면 예전 데모 비밀번호(admin / 1234)를 쓰고,
// 운영(NODE_ENV=production)에서는 설정이 없는 계정은 로그인할 수 없다.
interface AccountDef extends SessionUser {
  passwordEnv: string;
  devPassword: string;
}

const ACCOUNTS: AccountDef[] = [
  { id: 'student', name: 'Maria Santos', role: 'user', passwordEnv: 'STUDENT_PASSWORD', devPassword: '1234' },
  { id: 'admin', name: '관리자', role: 'admin', passwordEnv: 'ADMIN_PASSWORD', devPassword: 'admin' },
];

function passwordFor(a: AccountDef): string | undefined {
  const fromEnv = process.env[a.passwordEnv];
  if (fromEnv) return fromEnv;
  return isProduction() ? undefined : a.devPassword;
}

function digest(text: string): Buffer {
  return createHash('sha256').update(text, 'utf8').digest();
}

function toUser(a: AccountDef): SessionUser {
  return { id: a.id, name: a.name, role: a.role };
}

/** 아이디·비밀번호가 맞으면 사용자 정보를, 아니면 undefined. 비교는 시간차 없이 한다. */
export function verifyPassword(id: string, password: string): SessionUser | undefined {
  const account = ACCOUNTS.find((a) => a.id === id);
  // 없는 아이디도 같은 연산을 거쳐 응답 시간으로 계정 존재 여부를 알 수 없게 한다.
  const expected = (account && passwordFor(account)) ?? '\u0000no-account';
  const ok = timingSafeEqual(digest(password), digest(expected));
  return ok && account && passwordFor(account) ? toUser(account) : undefined;
}

/** "데모 계정으로 바로 시작" 버튼 허용 여부. 운영에서는 ALLOW_DEMO_LOGIN=true일 때만. */
export function demoLoginAllowed(): boolean {
  return !isProduction() || process.env.ALLOW_DEMO_LOGIN === 'true';
}

export function demoAccount(id: string): SessionUser | undefined {
  const account = ACCOUNTS.find((a) => a.id === id);
  return account ? toUser(account) : undefined;
}
