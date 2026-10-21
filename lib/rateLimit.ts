// 서버 전용 — 간단한 메모리 기반 호출 횟수 제한(서버 프로세스 하나 기준).
// 여러 대로 늘리면 Redis 등 공유 저장소로 바꿔야 한다. docs/SECURITY.md 참고.
const buckets = new Map<string, { count: number; resetAt: number }>();
let lastSweep = 0;

export interface RateResult {
  ok: boolean;
  retryAfterSec: number;
}

/** key당 windowMs 동안 limit회까지 허용한다. */
export function hit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    buckets.forEach((b, k) => {
      if (b.resetAt <= now) buckets.delete(k);
    });
  }
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return { ok: b.count <= limit, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
}

/** 테스트용 */
export function resetRateLimits() {
  buckets.clear();
}
