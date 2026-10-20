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
        if (rec.contentEncoding) headers["Content-Encoding"] = rec.contentEncoding;
        return new Response(rec.data, { status: 200, headers: headers });
      })
      .catch(function () { return new Response("Internal Error", { status: 500 }); })
  );
});
