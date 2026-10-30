// 한글케어 — hangulcare.html(단일 파일판) 전용 Service Worker.
// 서버가 없는 파일판에서는 관리자가 올린 Unity WebGL 빌드(.zip)를 이 브라우저의
// IndexedDB(hc-xr-builds/files)에 풀어 두고, 이 워커가 `hc-xr-blob/{moduleId}/{path...}`
// 요청을 가로채 거기서 꺼내 서빙한다 — Next.js 앱의 app/api/xr-builds/[moduleId]/[...path]
// 라우트(lib/xrBuilds.ts)와 같은 역할. https(또는 http://localhost)로 호스팅했을 때만
// 등록·동작한다 — file://는 브라우저가 Service Worker 등록 자체를 막는다.
// public/hancare-xr-editor.html의 extractClientXrBuild()가 이 저장소에 쓴다.
"use strict";

var DB_NAME = "hc-xr-builds";
var DB_VERSION = 1;
var STORE = "files";
var PREFIX = "hc-xr-blob/";

function openDb() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        var store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("moduleId", "moduleId", { unique: false });
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function getFile(key) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readonly");
      var req = tx.objectStore(STORE).get(key);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
    });
  });
}

self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  var i = url.pathname.indexOf("/" + PREFIX);
  if (i === -1) return; // 우리 몫이 아니면 평소대로 네트워크로 보낸다.
  var key = decodeURIComponent(url.pathname.slice(i + 1 + PREFIX.length)); // "{moduleId}/{relPath...}"
  if (!key || key.indexOf("/") === -1) return;
  event.respondWith(
    getFile(key)
      .then(function (rec) {
        if (!rec) return new Response("Not found", { status: 404 });
        var headers = { "Content-Type": rec.contentType || "application/octet-stream", "Cache-Control": "no-store" };

        // 중요: 이 Response는 Service Worker가 JS로 직접 만든 것이라, 진짜 네트워크 응답과
        // 달리 브라우저가 Content-Encoding을 보고 자동으로 압축을 풀어주지 않는다(전송계층
        // 디코더는 실제 HTTP 응답에만 붙는다). 그래서 gzip은 여기서 직접 풀어서 돌려준다 —
        // 그냥 Content-Encoding: gzip 헤더만 붙이면 Unity 로더가 "압축 안 풀렸다"며
        // 원본 gzip 바이트를 그대로 받아 SyntaxError를 낸다(실제로 보고된 버그).
        if (rec.contentEncoding === "gzip" && typeof DecompressionStream !== "undefined") {
          var decompressed = rec.data.stream().pipeThrough(new DecompressionStream("gzip"));
          return new Response(decompressed, { status: 200, headers: headers });
        }
        // br(Brotli)은 브라우저에 JS에서 쓸 수 있는 네이티브 압축 해제 API가 없어 여기서는
        // 풀어줄 수 없다 — extractClientXrBuild()가 업로드 시점에 .br 파일을 이미 거부하므로
        // 정상 경로에서는 여기까지 오지 않는다. 혹시 남아있어도 "이미 풀렸다고 속이지"
        // 않도록 Content-Encoding 헤더는 빼고 원본 그대로 돌려준다.
        headers["Content-Length"] = String(rec.data.size);
        return new Response(rec.data, { status: 200, headers: headers });
      })
      .catch(function (err) { return new Response("Internal Error: " + (err && err.message), { status: 500 }); })
  );
});
