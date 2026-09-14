// 한글케어 PWA용 최소 서비스워커. 무거운 workbox 빌드 툴체인(빌드 시점 의존성
// 취약점 우려) 대신 손으로 작성한 가벼운 캐시 전략을 사용한다.
// - 앱 셸(정적 자산)은 캐시 우선(cache-first)
// - 그 외 요청(HTML 페이지, API)은 네트워크 우선(network-first) 후 캐시 폴백
// 오프라인에서도 마지막으로 방문한 학습 화면을 다시 열 수 있게 하는 것이 목적이다.

const CACHE_NAME = 'hangulcare-v1';
const APP_SHELL = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Response.error())),
  );
});
