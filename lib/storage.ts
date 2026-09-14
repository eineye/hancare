'use client';

/** localStorage를 우선 쓰되, 접근 불가(프라이빗 모드, SSR 등) 시 메모리로 대체해
 * 크래시 없이 동작하게 하는 zustand persist용 스토리지 헬퍼. */
export function safeLocalStorage() {
  try {
    const testKey = '__hangulcare_storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return localStorage;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    };
  }
}
