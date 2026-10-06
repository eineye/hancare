/* ==================================================================
   한글케어 영상 편집기 — 관리자 왼쪽 메뉴 "영상 편집"(public/hancare-video-editor.html)
   설계: docs/VIDEO_EDITOR_DESIGN.md

   영상을 올리고(또는 경로 입력) AI 자동 자막 / SRT·VTT 불러오기 / 직접 입력으로
   content/videos.json 항목(영상 정보 + 자막 cues)을 만든다. 저장하면 영상학습(/video)
   화면의 재생·자막·단어 탭·질문 기능이 전부 자동으로 동작한다.

   연결 방식은 페이지가 정하는 window.HANCARE_VIDEO_CONFIG를 따른다.
     - { baseUrl, libraryUrl } (Next.js) → /api/videos 자동 저장, 업로드·AI 자동 자막 사용
     - { adapter: true } (hangulcare.html iframe) → 부모 창과 postMessage(hcVid)로 저장
     - {} (file://)                      → 로컬 전용(JSON 내보내기로 보관)
     - readOnly: true                    → 보기 전용
   ================================================================== */
(function () {
  "use strict";

  var cfg = window.HANCARE_VIDEO_CONFIG || {};
  var MODE = cfg.adapter ? "adapter" : cfg.baseUrl ? "server" : "local";
  var BASE = (cfg.baseUrl || "/api/videos").replace(/\/+$/, "");
  var LIBRARY_URL = cfg.libraryUrl || "/api/hangul-library/units";
  var READ_ONLY = !!cfg.readOnly;
  var ID_RE = /^[a-z0-9][a-z0-9-]*$/;

  var videos = [];
  var situations = [];     // 관련 학습 선택지 [{ value: "unitId|situationId", label, labelKo }]
  var activeId = null;
  var saveTimer = null;
  var localUrls = {};      // 서버 없는 모드에서 고른 파일의 미리보기 URL (videoId → blob URL)
  var stopAt = null;       // 구간 재생 끝 시각
  var cueSeq = 0;

  /* ---------------- helpers ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function r1(n) { return Math.round(n * 10) / 10; }
  function fmt(sec) {
    if (!(sec >= 0)) return "--:--";
    var s = Math.floor(sec), d = Math.round((sec - s) * 10);
    if (d === 10) { s += 1; d = 0; }
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0") + "." + d;
  }
  // "01:02.5", "62.5", "1:02" 모두 받는다.
  function parseTime(v) {
    v = String(v).trim();
    if (!v) return NaN;
    var parts = v.split(":");
    if (parts.length > 3) return NaN;
    var total = 0;
    for (var i = 0; i < parts.length; i++) {
      var n = Number(parts[i]);
      if (!isFinite(n)) return NaN;
      total = total * 60 + n;
    }
    return r1(total);
  }
  function termsToText(terms) {
    return (terms || []).map(function (t) { return t.hangul + (t.glossEn ? "=" + t.glossEn : ""); }).join("; ");
  }
  function textToTerms(text) {
    return String(text).split(";").map(function (p) {
      var i = p.indexOf("=");
      var h = (i >= 0 ? p.slice(0, i) : p).trim(), g = i >= 0 ? p.slice(i + 1).trim() : "";
      return h ? { hangul: h, glossEn: g } : null;
    }).filter(Boolean);
  }
  function active() { return videos.filter(function (v) { return v.id === activeId; })[0] || null; }
  function newCueId(v) {
    var used = {};
    v.cues.forEach(function (c) { used[c.id] = true; });
    var n = v.cues.length + 1 + cueSeq++;
    while (used[v.id + "-" + n]) n++;
    return v.id + "-" + n;
  }
  function toast(msg) {
    var el = $("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { el.classList.remove("show"); }, 2800);
  }
  function openModal(html) { $("modalRoot").innerHTML = '<div class="overlay" id="veOverlay">' + html + "</div>"; }
  function closeModal() { $("modalRoot").innerHTML = ""; }
  function choiceModal(title, msg, choices) {
    openModal('<div class="modal"><h3>' + esc(title) + "</h3><p>" + esc(msg) + '</p><div class="modal-actions">' +
      '<button class="btn" data-ve-choice="-1" type="button">취소</button>' +
      choices.map(function (c, i) { return '<button class="btn ' + (c.cls || "") + '" data-ve-choice="' + i + '" type="button">' + esc(c.label) + "</button>"; }).join("") +
      "</div></div>");
    Array.prototype.forEach.call(document.querySelectorAll("[data-ve-choice]"), function (b) {
      b.onclick = function () { var i = Number(b.getAttribute("data-ve-choice")); closeModal(); if (i >= 0) choices[i].run(); };
    });
  }
  function setStatus(kind, text) {
    var el = $("veStatus");
    if (!el) return;
    el.className = "status-line " + kind;
    $("veStatusText").textContent = text;
  }
  // 편집기는 public/ 안에서 열린다. hangulcare.html(파일판)·file://에서는 /videos/x 를 ./videos/x 로 읽는다.
  function playableSrc(v) {
    if (localUrls[v.id]) return localUrls[v.id];
    var src = v.src || "";
    if (MODE !== "server" && src.charAt(0) === "/" && src.indexOf("/videos/") === 0) return "." + src;
    return src;
  }
  function normalize(list) {
    return (Array.isArray(list) ? list : []).map(function (v, i) {
      return {
        id: String(v.id || "video-" + (i + 1)), order: i + 1,
        titleKo: v.titleKo || "", titleEn: v.titleEn || "", descriptionKo: v.descriptionKo || "",
        src: v.src || "", poster: v.poster || "", durationSec: Number(v.durationSec) || 0, levelTag: v.levelTag || "",
        related: v.related && v.related.unitId ? { unitId: v.related.unitId, situationId: v.related.situationId, labelKo: v.related.labelKo || "" } : null,
        cues: (Array.isArray(v.cues) ? v.cues : []).map(function (c, ci) {
          return {
            id: String(c.id || (v.id + "-" + (ci + 1))), start: Number(c.start) || 0, end: Number(c.end) || 0,
            speakerKo: c.speakerKo || "", textKo: c.textKo || "", textEn: c.textEn || "",
            terms: Array.isArray(c.terms) ? c.terms.map(function (t) { return { hangul: t.hangul || "", glossEn: t.glossEn || "" }; }) : []
          };
        })
      };
    });
  }
  function exportArray() {
    return videos.map(function (v, i) {
      var out = {
        id: v.id, order: i + 1, titleKo: v.titleKo, titleEn: v.titleEn, descriptionKo: v.descriptionKo,
        src: v.src, poster: v.poster, durationSec: Math.ceil(v.durationSec || 0), levelTag: v.levelTag
      };
      if (v.related && v.related.unitId && v.related.situationId) out.related = v.related;
      out.cues = v.cues.slice().sort(function (a, b) { return a.start - b.start; }).map(function (c) {
        var o = { id: c.id, start: r1(c.start), end: r1(c.end) };
        if (c.speakerKo) o.speakerKo = c.speakerKo;
        o.textKo = c.textKo; o.textEn = c.textEn;
        var terms = c.terms.filter(function (t) { return t.hangul; });
        if (terms.length) o.terms = terms;
        return o;
      });
      return out;
    });
  }

  /* ---------------- 저장소 연결 ---------------- */
  var API = (function () {
    if (MODE === "server") {
      var json = function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok) throw new Error(d.error || "HTTP " + r.status);
          return d;
        });
      };
      return {
        list: function () { return fetch(BASE, { cache: "no-store" }).then(json); },
        units: function () { return fetch(LIBRARY_URL, { cache: "no-store" }).then(json); },
        save: function (arr) { return fetch(BASE, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(arr) }).then(json); },
        transcribe: function (src, videoId) {
          return fetch(BASE + "/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ src: src, videoId: videoId }) }).then(json);
        }
      };
    }
    if (MODE === "adapter") {
      var seq = 0, pending = {};
      window.addEventListener("message", function (e) {
        var d = e.data;
        if (e.source !== window.parent || !d || d.hcVid !== "res" || !pending[d.id]) return;
        var p = pending[d.id]; delete pending[d.id];
        if (d.ok) p.resolve(d.data); else p.reject(new Error(d.error || "저장 실패"));
      });
      var call = function (op, payload) {
        return new Promise(function (resolve, reject) {
          var id = ++seq;
          pending[id] = { resolve: resolve, reject: reject };
          window.parent.postMessage({ hcVid: "req", id: id, op: op, payload: payload }, "*");
          setTimeout(function () { if (pending[id]) { delete pending[id]; reject(new Error("응답 없음")); } }, 8000);
        });
      };
      return {
        list: function () { return call("list"); },
        save: function (arr) { return call("save", arr); },
        units: function () { return call("units"); }
      };
    }
    return null;
  })();

  // 서버가 거부할 오류(자동 저장을 보류해야 하는 것)만 모은다.
  function blockingErrors() {
    var errs = [], seen = {};
    videos.forEach(function (v) {
      if (!ID_RE.test(v.id)) errs.push(v.id + ": id는 영문 소문자·숫자·-만");
      if (seen[v.id]) errs.push("영상 id 중복: " + v.id);
      seen[v.id] = true;
      var cs = {};
      v.cues.forEach(function (c, i) {
        if (!(c.end > c.start) || !(c.start >= 0)) errs.push((v.titleKo || v.id) + " " + (i + 1) + "번 자막: 끝이 시작보다 커야 함");
        if (cs[c.id]) errs.push((v.titleKo || v.id) + ": 자막 id 중복 " + c.id);
        cs[c.id] = true;
      });
    });
    return errs;
  }
  function scheduleSave() {
    if (READ_ONLY) return;
    if (!API) { setStatus("offline", "로컬 전용 — JSON 내보내기로 보관하세요"); return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var errs = blockingErrors();
      if (errs.length) { setStatus("offline", "저장 보류 — 오류 " + errs.length + "건을 고쳐 주세요 (" + errs[0] + ")"); return; }
      setStatus("saving", "저장 중…");
      API.save(exportArray()).then(function () {
        var t = new Date();
        setStatus("saved", "저장됨 · " + String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0"));
      }).catch(function (err) { setStatus("offline", "저장 실패 — " + err.message); });
    }, 800);
  }
  function changed(opts) {
    opts = opts || {};
    if (opts.list) renderList();
    if (opts.rows) renderRows();
    renderChecks();
    renderPreviewCaption();
    scheduleSave();
  }

  /* ---------------- 검사 ---------------- */
  function checkVideo(v) {
    var rows = {}, list = [];
    function add(cueId, msg) { (rows[cueId] = rows[cueId] || []).push(msg); }
    var sorted = v.cues.slice().sort(function (a, b) { return a.start - b.start; });
    sorted.forEach(function (c, i) {
      if (!(c.end > c.start)) add(c.id, "끝이 시작보다 빨라요");
      if (i > 0 && c.start < sorted[i - 1].end - 0.05) add(c.id, "앞 자막과 겹쳐요");
      if (!c.textKo.trim()) add(c.id, "대사가 비어 있어요");
      if (v.durationSec && c.end > v.durationSec + 0.5) add(c.id, "영상 길이를 넘어요");
      c.terms.forEach(function (t) { if (t.hangul && c.textKo.indexOf(t.hangul) === -1) add(c.id, "학습 단어 '" + t.hangul + "'가 대사에 없어요(밑줄 표시 안 됨)"); });
    });
    if (!ID_RE.test(v.id)) list.push("id는 영문 소문자·숫자·-만 쓸 수 있어요");
    if (!v.titleKo.trim()) list.push("제목(한글)이 비어 있어요");
    if (!v.src.trim()) list.push("영상 경로가 없어요 — 학습자 화면은 자막 연습 모드로 동작해요");
    if (!v.cues.length) list.push("자막이 없어요 — AI 자동 자막, 자막 파일 불러오기, 직접 추가 중 하나로 채우세요");
    return { rows: rows, list: list };
  }

  /* ---------------- 화면 틀 ---------------- */
  function injectShell() {
    var style = document.createElement("style");
    style.textContent = [
      "@media (max-width:1100px){#vePreview{grid-column:1 / -1;position:static !important;}}",
      "@media (max-width:760px){#vePreview{grid-column:auto;}}",
      "#videoApp .ve-list{padding:8px;display:flex;flex-direction:column;gap:2px;max-height:74vh;overflow-y:auto;}",
      ".ve-item{display:flex;gap:8px;align-items:center;padding:8px;border-radius:var(--radius-sm);cursor:pointer;font-size:12.5px;}",
      ".ve-item:hover{background:var(--surface-2);} .ve-item.active{background:var(--accent);color:var(--accent-ink);}",
      ".ve-item .no{font-family:var(--font-mono);font-size:10.5px;opacity:.7;} .ve-item .label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      ".ve-item .count{font-size:10.5px;opacity:.7;} .ve-item .row-actions{display:none;gap:2px;} .ve-item:hover .row-actions{display:flex;}",
      ".ve-item.active .icon-btn{color:var(--accent-ink);}",
      ".ve-player{position:relative;background:#000;border-radius:var(--radius-md);overflow:hidden;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;}",
      ".ve-player video{width:100%;height:100%;display:block;} .ve-player .none{color:#bbb;font-size:12.5px;padding:20px;text-align:center;}",
      ".ve-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px;} .ve-bar .time{margin-left:auto;font-family:var(--font-mono);font-size:12px;color:var(--ink-muted);}",
      ".ve-progress{height:6px;border-radius:999px;background:var(--surface-2);overflow:hidden;margin-top:6px;} .ve-progress div{height:100%;background:var(--accent);width:0;transition:width .2s;}",
      ".ve-note{font-size:11.5px;color:var(--ink-muted);background:var(--surface-2);border-radius:var(--radius-sm);padding:8px 10px;}",
      ".ve-ai{border:1px dashed var(--border-strong);border-radius:var(--radius-md);padding:12px;display:flex;flex-direction:column;gap:8px;}",
      ".ve-ai .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}",
      "#veRows tr.playing td{background:var(--accent-soft);} #veRows tr.bad td:first-child{box-shadow:inset 3px 0 0 var(--danger);}",
      "#veRows input.time{width:74px;font-family:var(--font-mono);font-size:11.5px;} #veRows input.spk{width:84px;}",
      "#veRows .issues{font-size:10.5px;color:var(--danger);padding:2px 6px 0;}",
      "#veRows .no{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-faint);padding:8px 4px;white-space:nowrap;}",
      ".ve-cap{background:#12241F;color:#fff;border-radius:var(--radius-md);padding:14px;min-height:96px;}",
      ".ve-cap .spk{font-size:10.5px;color:#7FBFAD;} .ve-cap .ko{font-size:17px;font-weight:700;line-height:1.7;margin-top:4px;} .ve-cap .en{font-size:12px;color:rgba(255,255,255,.65);margin-top:2px;}",
      ".ve-cap u{text-decoration-color:#4FBF9B;text-decoration-thickness:2px;text-underline-offset:4px;}",
      ".ve-checks{font-size:12px;display:flex;flex-direction:column;gap:4px;} .ve-checks .ok{color:var(--success);} .ve-checks .warn{color:var(--danger);}",
      "body.ro #videoApp .ve-edit-only{display:none !important;} body.ro #videoApp input, body.ro #videoApp textarea, body.ro #videoApp select{pointer-events:none;}"
    ].join("\n");
    document.head.appendChild(style);

    var header = document.querySelector("header.top"), brand = header.querySelector(".brand");
    var status = document.createElement("div");
    status.className = "status-line"; status.id = "veStatus";
    status.innerHTML = '<span class="status-dot"></span><span id="veStatusText">영상 목록을 불러오는 중…</span>';
    brand.appendChild(status);
    var toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    toolbar.innerHTML =
      '<div class="toolbar-group ve-edit-only"><button class="btn" type="button" id="veImportJson">JSON 불러오기</button><button class="btn" type="button" id="veImportSub">자막 파일(SRT/VTT)</button></div>' +
      '<div class="toolbar-group"><button class="btn" type="button" id="veExportJson">JSON 내보내기</button><button class="btn" type="button" id="veCopyJson">JSON 복사</button></div>' +
      '<div class="toolbar-group ve-edit-only"><button class="btn primary" type="button" id="veAdd">+ 새 영상</button></div>';
    header.appendChild(toolbar);

    var app = document.createElement("div");
    app.id = "videoApp";
    app.innerHTML =
      '<div id="veBanner"></div>' +
      '<div class="grid">' +
        '<div class="panel" id="veSidebar"><div class="panel-head"><h2>영상 목록</h2><span class="count tabular" id="veCount"></span></div><div class="ve-list" id="veList"></div>' +
          '<div class="sidebar-foot ve-edit-only"><button class="btn small" type="button" id="veAdd2" style="width:100%;justify-content:center;">+ 새 영상 추가</button></div></div>' +
        '<div class="panel" id="veEditor"><div class="panel-head"><h2 id="veEditorTitle">영상 편집</h2></div><div class="panel-body" id="veEditorBody" style="display:flex;flex-direction:column;gap:16px;"></div></div>' +
        '<div class="panel" id="vePreview" style="position:sticky;top:12px;"><div class="panel-head"><h2>학습자 화면 미리보기</h2></div><div class="panel-body" id="vePreviewBody" style="display:flex;flex-direction:column;gap:12px;"></div></div>' +
      "</div>" +
      '<input type="file" id="veFileVideo" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v" class="visually-hidden">' +
      '<input type="file" id="veFileSub" accept=".srt,.vtt,text/vtt" class="visually-hidden">' +
      '<input type="file" id="veFileJson" accept=".json,application/json" class="visually-hidden">';
    $("app").appendChild(app);

    $("veAdd").onclick = $("veAdd2").onclick = addVideo;
    $("veExportJson").onclick = function () {
      var blob = new Blob([JSON.stringify(exportArray(), null, 2) + "\n"], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "videos.json"; a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    };
    $("veCopyJson").onclick = function () {
      var text = JSON.stringify(exportArray(), null, 2);
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast("videos.json 내용을 복사했어요"); }, function () { toast("복사하지 못했어요 — JSON 내보내기를 쓰세요"); });
    };
    $("veImportJson").onclick = function () { $("veFileJson").click(); };
    $("veFileJson").onchange = function (e) {
      var f = e.target.files[0]; e.target.value = "";
      if (!f) return;
      f.text().then(function (t) {
        var arr = JSON.parse(t);
        if (!Array.isArray(arr)) throw new Error("최상위 값이 배열이 아니에요");
        choiceModal("영상 목록 바꾸기", f.name + "의 영상 " + arr.length + "편으로 지금 목록(" + videos.length + "편)을 바꿀까요?", [
          { label: "바꾸기", cls: "primary", run: function () { videos = normalize(arr); activeId = videos[0] ? videos[0].id : null; renderAll(); scheduleSave(); } }
        ]);
      }).catch(function (err) { toast("JSON을 읽지 못했어요: " + err.message); });
    };
    $("veImportSub").onclick = function () {
      if (!active()) { toast("먼저 영상을 고르거나 새로 만드세요"); return; }
      $("veFileSub").click();
    };
    $("veFileSub").onchange = function (e) {
      var f = e.target.files[0]; e.target.value = "";
      if (!f) return;
      f.text().then(function (t) {
        var parsed = parseSubtitles(t);
        if (!parsed.length) throw new Error("자막 줄을 찾지 못했어요");
        applyDraft(parsed, f.name + "에서 자막 " + parsed.length + "줄을 읽었어요.");
      }).catch(function (err) { toast("자막 파일을 읽지 못했어요: " + err.message); });
    };
    $("veFileVideo").onchange = function (e) {
      var f = e.target.files[0]; e.target.value = "";
      if (f) uploadVideo(f);
    };
  }

  /* ---------------- 불러오기 ---------------- */
  function load() {
    var banner = $("veBanner");
    if (MODE === "local") {
      banner.innerHTML = '<div class="banner"><div><b>로컬 전용 모드.</b> 이 탭에서만 편집돼요. 편집 후 <b>JSON 내보내기</b>로 받은 파일을 content/videos.json에 넣으세요. AI 자동 자막은 Next.js 서버에서 열어야 쓸 수 있어요.</div></div>';
    } else if (MODE === "adapter") {
      banner.innerHTML = '<div class="banner"><div><b>파일판(hangulcare.html) 모드.</b> 저장한 영상 목록은 이 브라우저에 보관되어 영상학습 화면에 바로 반영돼요. 영상 파일은 올릴 수 없어 미리보기만 되니, 같은 이름으로 <b>public/videos/</b>에 넣어 주세요. AI 자동 자막은 Next.js 서버에서만 쓸 수 있어요 — 대신 자막 파일(SRT/VTT)을 불러올 수 있어요.</div></div>';
    }
    if (!API) { videos = []; activeId = null; setStatus("offline", "로컬 전용 — JSON 내보내기로 보관하세요"); renderAll(); return; }
    loadSituations().then(function () { return API.list(); }).then(function (data) {
      videos = normalize(Array.isArray(data) ? data : data && data.videos);
      activeId = videos[0] ? videos[0].id : null;
      setStatus("saved", MODE === "server" ? "연결됨 · 자동 저장 켜짐" : "연결됨 · 이 브라우저에 자동 저장");
      renderAll();
    }).catch(function (err) {
      videos = []; activeId = null;
      setStatus("offline", "불러오기 실패 — " + err.message);
      renderAll();
    });
  }

  // 관련 학습 선택지 — 실습내용(유닛·상황) 목록. 못 불러와도 편집은 계속한다.
  function loadSituations() {
    if (!API || !API.units) return Promise.resolve();
    return API.units().then(function (data) {
      var units = Array.isArray(data) ? data : data && Array.isArray(data.units) ? data.units : [];
      situations = [];
      units.forEach(function (u) {
        (u.situations || []).forEach(function (s) {
          situations.push({ value: u.id + "|" + s.id, label: (u.titleKo || u.id) + " › " + (s.menuLabelKo || s.titleKo || s.id), labelKo: s.menuLabelKo || s.titleKo || "" });
        });
      });
    }).catch(function () { situations = []; });
  }

  /* ---------------- 렌더링 ---------------- */
  function renderAll() { renderList(); renderEditor(); renderPreview(); }

  function renderList() {
    $("veCount").textContent = videos.length + "편";
    $("veList").innerHTML = videos.length ? videos.map(function (v, i) {
      return '<div class="ve-item' + (v.id === activeId ? " active" : "") + '" data-ve-pick="' + esc(v.id) + '">' +
        '<span class="no">' + String(i + 1).padStart(2, "0") + '</span><span class="label">' + esc(v.titleKo || v.id) + '</span>' +
        '<span class="count">' + v.cues.length + '줄</span>' +
        '<span class="row-actions ve-edit-only"><button class="icon-btn" data-ve-move="-1" data-id="' + esc(v.id) + '" title="위로" type="button">↑</button>' +
        '<button class="icon-btn" data-ve-move="1" data-id="' + esc(v.id) + '" title="아래로" type="button">↓</button>' +
        '<button class="icon-btn" data-ve-del="' + esc(v.id) + '" title="삭제" type="button">✕</button></span></div>';
    }).join("") : '<div class="empty-state" style="padding:24px 8px;">영상이 없어요<br><small>+ 새 영상으로 시작하세요</small></div>';
    Array.prototype.forEach.call($("veList").querySelectorAll("[data-ve-pick]"), function (el) {
      el.onclick = function (e) {
        if (e.target.closest("button")) return;
        activeId = el.getAttribute("data-ve-pick"); stopAt = null;
        renderAll();
      };
    });
    Array.prototype.forEach.call($("veList").querySelectorAll("[data-ve-move]"), function (b) {
      b.onclick = function () {
        var i = videos.findIndex(function (v) { return v.id === b.getAttribute("data-id"); }), j = i + Number(b.getAttribute("data-ve-move"));
        if (j < 0 || j >= videos.length) return;
        var t = videos[i]; videos[i] = videos[j]; videos[j] = t;
        changed({ list: true });
      };
    });
    Array.prototype.forEach.call($("veList").querySelectorAll("[data-ve-del]"), function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-ve-del"), v = videos.filter(function (x) { return x.id === id; })[0];
        choiceModal("영상 삭제", "“" + (v.titleKo || id) + "”과 자막 " + v.cues.length + "줄을 목록에서 지울까요? (올린 영상 파일은 서버에 남아요)", [
          { label: "삭제", cls: "danger", run: function () {
            videos = videos.filter(function (x) { return x.id !== id; });
            if (activeId === id) activeId = videos[0] ? videos[0].id : null;
            renderAll(); scheduleSave();
          } }
        ]);
      };
    });
  }

  function field(label, key, value, opts) {
    opts = opts || {};
    var tag = opts.textarea
      ? '<textarea data-ve-field="' + key + '" rows="2">' + esc(value) + "</textarea>"
      : '<input data-ve-field="' + key + '" value="' + esc(value) + '"' + (opts.mono ? ' class="mono"' : "") + (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : "") + (opts.list ? ' list="' + opts.list + '"' : "") + ">";
    return '<div class="field"' + (opts.full ? ' style="grid-column:1/-1"' : "") + "><label>" + esc(label) + (opts.hint ? '<span class="tag">' + esc(opts.hint) + "</span>" : "") + "</label>" + tag + "</div>";
  }

  function situationOptions() { return situations; }

  function renderEditor() {
    var v = active(), body = $("veEditorBody");
    if (!v) {
      $("veEditorTitle").textContent = "영상 편집";
      body.innerHTML = '<div class="empty-state"><div class="big">🎬</div>왼쪽에서 영상을 고르거나 <b>+ 새 영상</b>을 누르세요.</div>';
      return;
    }
    $("veEditorTitle").textContent = v.titleKo || v.id;
    var sits = situationOptions();
    var relVal = v.related ? v.related.unitId + "|" + v.related.situationId : "";
    var aiReady = MODE === "server";
    body.innerHTML =
      '<div class="section-title"><h3>① 기본 정보</h3></div>' +
      '<div class="field-grid">' +
        field("영상 ID", "id", v.id, { mono: true, hint: "영문 소문자·숫자·-" }) +
        field("난이도 표시", "levelTag", v.levelTag, { placeholder: "초급 2" }) +
        field("제목 (한글)", "titleKo", v.titleKo) +
        field("제목 (영문)", "titleEn", v.titleEn) +
        field("설명", "descriptionKo", v.descriptionKo, { textarea: true, full: true }) +
        '<div class="field" style="grid-column:1/-1"><label>관련 학습 <span class="tag">학습자 화면의 "관련 학습 → 발음 연습" 링크</span></label>' +
          '<select data-ve-related style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:7px 9px;background:var(--surface);">' +
          '<option value="">(없음)</option>' +
          sits.map(function (o) { return '<option value="' + esc(o.value) + '"' + (o.value === relVal ? " selected" : "") + ">" + esc(o.label) + "</option>"; }).join("") +
          (relVal && !sits.some(function (o) { return o.value === relVal; }) ? '<option value="' + esc(relVal) + '" selected>' + esc(v.related.labelKo || relVal) + "</option>" : "") +
          "</select></div>" +
      "</div>" +

      '<div class="section-title"><h3>② 영상 파일</h3><span class="count" id="veDur">' + (v.durationSec ? "길이 " + fmt(v.durationSec) : "") + "</span></div>" +
      '<div class="field-grid">' +
        field("영상 경로 (src)", "src", v.src, { mono: true, full: true, placeholder: "/videos/파일.mp4 또는 https://…", hint: MODE === "server" ? "업로드하면 자동 입력" : "public/videos/에 같은 이름으로 넣기" }) +
      "</div>" +
      '<div class="ve-bar ve-edit-only"><button class="btn" type="button" id="veUpload">' + (MODE === "server" ? "영상 업로드" : "영상 파일 고르기 (미리보기)") + '</button>' +
        '<span class="ve-note" style="padding:4px 8px;">MP4(H.264)·WebM·MOV, 최대 300MB</span></div>' +
      '<div class="ve-progress" id="veProgress" hidden><div></div></div>' +
      '<div class="ve-player" id="vePlayerBox">' + (playableSrc(v) ? '<video id="veVideo" controls playsinline preload="metadata" src="' + esc(playableSrc(v)) + '"></video>' : '<div class="none">영상이 없어요 — 업로드하거나 경로를 입력하세요.<br>영상 없이도 자막은 편집할 수 있어요.</div>') + "</div>" +
      '<div class="ve-bar"><button class="btn small" type="button" data-ve-seek="-2">⟲ 2초</button><button class="btn small" type="button" data-ve-seek="2">2초 ⟳</button>' +
        '<button class="btn small primary ve-edit-only" type="button" id="veAddAtNow">+ 현재 시각에 자막 추가</button><span class="time" id="veNow">00:00.0</span></div>' +

      '<div class="ve-ai ve-edit-only"><div class="section-title"><h3>③ 자막 초안 만들기</h3></div>' +
        '<div class="row"><button class="btn primary" type="button" id="veAi"' + (aiReady ? "" : " disabled") + '>✨ AI 자동 자막 만들기</button>' +
        '<button class="btn" type="button" id="veSub2">자막 파일(SRT/VTT) 불러오기</button></div>' +
        '<div class="ve-note" id="veAiNote">' + (aiReady
          ? "Gemini가 영상의 대사(화면에 박힌 자막 포함)를 받아써 시간·영어 뜻·학습 단어까지 채운 <b>초안</b>을 만들어요. 1분 영상 기준 수십 초 걸리고, 시간은 ±0.5~1초 오차가 있어 아래 표에서 ⤓/⤒로 맞추면 돼요. 서버에 GEMINI_API_KEY가 필요해요."
          : "AI 자동 자막은 Next.js 서버에서 에디터를 열었을 때만 쓸 수 있어요. 여기서는 자막 파일을 불러오거나 아래 표에 직접 입력하세요.") + "</div></div>" +

      '<div class="section-title"><h3>④ 자막</h3><span class="count" id="veCueCount"></span></div>' +
      '<div class="ve-note">행의 <b>▶</b>는 그 구간 재생, <b>⤓</b>/<b>⤒</b>는 지금 재생 위치를 시작/끝으로 찍기. 시간은 <code>01:02.5</code> 또는 <code>62.5</code>. 학습 단어는 <code>한글=뜻; 한글=뜻</code> — 한글은 대사에 글자 그대로 있어야 밑줄이 그어져요.</div>' +
      '<div class="table-scroll"><table class="grid-table"><thead><tr><th>#</th><th>시작</th><th>끝</th><th>화자</th><th style="width:30%">한국어 대사</th><th style="width:24%">영어 뜻</th><th style="width:22%">학습 단어</th><th></th></tr></thead><tbody id="veRows"></tbody></table></div>' +
      '<div class="row-add ve-edit-only"><button class="btn small" type="button" id="veAddRow">+ 자막 줄 추가 (끝에)</button></div>';

    renderRows();
    bindEditor(v);
  }

  function rowHtml(c, i, issues) {
    var bad = issues && issues.length;
    return '<tr data-cue="' + esc(c.id) + '" class="' + (bad ? "bad" : "") + '">' +
      '<td class="no">' + (i + 1) + "</td>" +
      '<td><input class="time" data-k="start" value="' + fmt(c.start) + '"></td>' +
      '<td><input class="time" data-k="end" value="' + fmt(c.end) + '"></td>' +
      '<td><input class="spk" data-k="speakerKo" value="' + esc(c.speakerKo) + '" placeholder="(없음)"></td>' +
      '<td><input data-k="textKo" value="' + esc(c.textKo) + '">' + (bad ? '<div class="issues">' + issues.map(esc).join(" · ") + "</div>" : "") + "</td>" +
      '<td><input data-k="textEn" value="' + esc(c.textEn) + '"></td>' +
      '<td><input data-k="terms" value="' + esc(termsToText(c.terms)) + '" placeholder="한글=뜻; …"></td>' +
      '<td class="col-actions"><button class="icon-btn" data-a="play" title="이 구간 재생" type="button">▶</button>' +
        '<span class="ve-edit-only"><button class="icon-btn" data-a="setStart" title="시작 = 지금 위치" type="button">⤓</button>' +
        '<button class="icon-btn" data-a="setEnd" title="끝 = 지금 위치" type="button">⤒</button>' +
        '<button class="icon-btn" data-a="insert" title="아래에 줄 추가" type="button">＋</button>' +
        '<button class="icon-btn" data-a="del" title="삭제" type="button">✕</button></span></td></tr>';
  }

  function renderRows() {
    var v = active(), tb = $("veRows");
    if (!v || !tb) return;
    v.cues.sort(function (a, b) { return a.start - b.start; });
    var chk = checkVideo(v);
    tb.innerHTML = v.cues.length ? v.cues.map(function (c, i) { return rowHtml(c, i, chk.rows[c.id]); }).join("")
      : '<tr><td colspan="8" style="padding:18px;text-align:center;color:var(--ink-muted);">아직 자막이 없어요.</td></tr>';
    $("veCueCount").textContent = v.cues.length + "줄";
    highlightPlaying();
  }

  // 입력 중에는 표를 다시 그리지 않고(포커스 유지) 그 행의 검사 표시만 갱신한다.
  function refreshRowIssues() {
    var v = active();
    if (!v) return;
    var chk = checkVideo(v);
    Array.prototype.forEach.call($("veRows").querySelectorAll("tr[data-cue]"), function (tr) {
      var issues = chk.rows[tr.getAttribute("data-cue")] || [];
      tr.classList.toggle("bad", issues.length > 0);
      var td = tr.querySelector('input[data-k="textKo"]').parentNode, box = td.querySelector(".issues");
      if (issues.length) {
        if (!box) { box = document.createElement("div"); box.className = "issues"; td.appendChild(box); }
        box.textContent = issues.join(" · ");
      } else if (box) box.remove();
    });
  }

  function videoEl() { return $("veVideo"); }
  function now() { var el = videoEl(); return el ? r1(el.currentTime) : 0; }

  function bindEditor(v) {
    var body = $("veEditorBody");
    Array.prototype.forEach.call(body.querySelectorAll("[data-ve-field]"), function (inp) {
      inp.addEventListener("input", function () {
        var key = inp.getAttribute("data-ve-field"), val = inp.value;
        if (key === "id") {
          var nv = val.trim();
          inp.classList.toggle("dupe", !ID_RE.test(nv) || videos.some(function (x) { return x !== v && x.id === nv; }));
          if (localUrls[v.id]) { localUrls[nv] = localUrls[v.id]; }
          if (activeId === v.id) activeId = nv;
          v.id = nv;
          changed({ list: true });
          return;
        }
        v[key] = val;
        if (key === "titleKo") $("veEditorTitle").textContent = val || v.id;
        if (key === "src") {
          delete localUrls[v.id];
          clearTimeout(bindEditor.srcT);
          bindEditor.srcT = setTimeout(function () { reloadPlayer(v); }, 600);
        }
        changed({ list: key === "titleKo" });
      });
    });
    body.querySelector("[data-ve-related]").onchange = function (e) {
      var val = e.target.value;
      if (!val) { v.related = null; }
      else {
        var p = val.split("|"), o = situationOptions().filter(function (x) { return x.value === val; })[0];
        v.related = { unitId: p[0], situationId: p[1], labelKo: o ? o.labelKo : (v.related && v.related.labelKo) || "" };
      }
      changed();
    };
    var up = $("veUpload");
    if (up) up.onclick = function () { $("veFileVideo").click(); };
    $("veSub2").onclick = function () { $("veFileSub").click(); };
    $("veAi").onclick = runAi;
    $("veAddAtNow").onclick = function () { addCue(now()); };
    $("veAddRow").onclick = function () {
      var last = v.cues[v.cues.length - 1];
      addCue(last ? r1(last.end + 0.2) : 0);
    };
    Array.prototype.forEach.call(body.querySelectorAll("[data-ve-seek]"), function (b) {
      b.onclick = function () { var el = videoEl(); if (el) el.currentTime = Math.max(0, el.currentTime + Number(b.getAttribute("data-ve-seek"))); };
    });

    var tb = $("veRows");
    tb.addEventListener("input", function (e) {
      var inp = e.target, tr = inp.closest("tr[data-cue]");
      if (!tr) return;
      var c = v.cues.filter(function (x) { return x.id === tr.getAttribute("data-cue"); })[0], k = inp.getAttribute("data-k");
      if (!c) return;
      if (k === "start" || k === "end") {
        var t = parseTime(inp.value);
        inp.style.borderColor = isFinite(t) ? "" : "var(--danger)";
        if (!isFinite(t)) return;
        c[k] = t;
      } else if (k === "terms") c.terms = textToTerms(inp.value);
      else c[k] = inp.value;
      refreshRowIssues();
      changed();
    });
    // 시간 칸에서 나오면 순서를 다시 맞춘다.
    tb.addEventListener("change", function (e) {
      var k = e.target.getAttribute("data-k");
      if (k === "start" || k === "end") { renderRows(); }
    });
    tb.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-a]"), tr = e.target.closest("tr[data-cue]");
      if (!b || !tr) return;
      var idx = v.cues.findIndex(function (x) { return x.id === tr.getAttribute("data-cue"); }), c = v.cues[idx], a = b.getAttribute("data-a");
      if (!c) return;
      var el = videoEl();
      if (a === "play") {
        if (!el) { toast("영상이 없어 재생할 수 없어요"); return; }
        el.currentTime = c.start; stopAt = c.end;
        var p = el.play(); if (p && p.catch) p.catch(function () {});
      } else if (a === "setStart" || a === "setEnd") {
        if (!el) { toast("영상이 없어요"); return; }
        c[a === "setStart" ? "start" : "end"] = now();
        renderRows(); changed();
      } else if (a === "insert") {
        var next = v.cues[idx + 1];
        var s = r1(c.end + 0.1), e2 = next ? Math.max(r1(next.start - 0.1), r1(s + 0.5)) : r1(s + 3);
        v.cues.splice(idx + 1, 0, { id: newCueId(v), start: s, end: e2, speakerKo: c.speakerKo, textKo: "", textEn: "", terms: [] });
        renderRows(); changed({ list: true });
      } else if (a === "del") {
        v.cues.splice(idx, 1);
        renderRows(); changed({ list: true });
      }
    });
    bindPlayer(v);
  }

  function reloadPlayer(v) {
    var box = $("vePlayerBox");
    if (!box || active() !== v) return;
    var src = playableSrc(v);
    box.innerHTML = src ? '<video id="veVideo" controls playsinline preload="metadata" src="' + esc(src) + '"></video>' : '<div class="none">영상이 없어요 — 업로드하거나 경로를 입력하세요.</div>';
    bindPlayer(v);
  }

  function bindPlayer(v) {
    var el = videoEl();
    if (!el) return;
    el.addEventListener("loadedmetadata", function () {
      if (isFinite(el.duration) && el.duration > 0) {
        var d = Math.ceil(el.duration);
        $("veDur").textContent = "길이 " + fmt(el.duration);
        if (d !== Math.ceil(v.durationSec || 0)) { v.durationSec = d; changed(); }
      }
    });
    el.addEventListener("error", function () {
      $("veDur").textContent = "영상을 불러오지 못했어요 (경로·파일 형식 확인)";
    });
    el.addEventListener("timeupdate", function () {
      if (stopAt !== null && el.currentTime >= stopAt) { el.pause(); stopAt = null; }
      $("veNow").textContent = fmt(el.currentTime);
      highlightPlaying();
      renderPreviewCaption();
    });
    el.addEventListener("seeking", function () { $("veNow").textContent = fmt(el.currentTime); renderPreviewCaption(); highlightPlaying(); });
  }

  function currentCue(v, t) {
    var cur = null;
    v.cues.forEach(function (c) { if (c.start <= t + 0.05) cur = c; });
    return cur;
  }
  function highlightPlaying() {
    var v = active(), el = videoEl(), tb = $("veRows");
    if (!v || !tb) return;
    var c = el ? currentCue(v, el.currentTime) : null;
    Array.prototype.forEach.call(tb.querySelectorAll("tr[data-cue]"), function (tr) {
      tr.classList.toggle("playing", !!c && tr.getAttribute("data-cue") === c.id);
    });
  }

  /* ---------------- 미리보기 ---------------- */
  function underline(c) {
    var html = esc(c.textKo);
    c.terms.slice().sort(function (a, b) { return b.hangul.length - a.hangul.length; }).forEach(function (t) {
      if (!t.hangul) return;
      var h = esc(t.hangul);
      if (html.indexOf(h) !== -1) html = html.split(h).join("\u0000" + h + "\u0001");
    });
    return html.replace(/\u0000/g, "<u>").replace(/\u0001/g, "</u>");
  }
  function renderPreview() {
    var v = active(), body = $("vePreviewBody");
    if (!v) { body.innerHTML = '<div class="empty-state" style="padding:24px 8px;">영상을 고르면 여기에서 학습자 화면처럼 보여요.</div>'; return; }
    body.innerHTML =
      '<div><div class="preview-sub">재생 위치의 자막</div><div class="ve-cap" id="veCap"></div></div>' +
      '<div><div class="preview-sub">검사</div><div class="ve-checks" id="veChecks"></div></div>' +
      '<div><div class="preview-sub">요약</div><div class="chip-row" id="veStats"></div></div>' +
      '<div class="ve-note">저장하면 영상학습 화면(/video)에 바로 반영돼요. 재생 버튼·자막·단어 누르기·AI 질문·단어장 담기는 모두 자동으로 만들어져요.</div>';
    renderPreviewCaption();
    renderChecks();
  }
  function renderPreviewCaption() {
    var v = active(), box = $("veCap");
    if (!v || !box) return;
    var el = videoEl(), t = el ? el.currentTime : (v.cues[0] ? v.cues[0].start : 0), c = currentCue(v, t);
    box.innerHTML = c
      ? (c.speakerKo ? '<div class="spk">' + esc(c.speakerKo) + "</div>" : "") + '<div class="ko">' + underline(c) + '</div><div class="en">' + esc(c.textEn) + "</div>"
      : '<div class="en">재생하면 이 자리에 학습자에게 보이는 자막이 나와요.</div>';
  }
  function renderChecks() {
    var v = active(), box = $("veChecks");
    if (!v || !box) return;
    var chk = checkVideo(v), rowCount = 0;
    Object.keys(chk.rows).forEach(function (k) { rowCount += chk.rows[k].length; });
    var items = chk.list.map(function (m) { return '<div class="warn">• ' + esc(m) + "</div>"; });
    if (rowCount) items.push('<div class="warn">• 자막 표에 확인할 곳 ' + rowCount + "건 (빨간 줄)</div>");
    box.innerHTML = items.length ? items.join("") : '<div class="ok">✓ 문제 없음</div>';
    var terms = 0, speakers = {};
    v.cues.forEach(function (c) { terms += c.terms.length; if (c.speakerKo) speakers[c.speakerKo] = true; });
    $("veStats").innerHTML = ['자막 ' + v.cues.length + "줄", "학습 단어 " + terms + "개", "화자 " + Object.keys(speakers).length + "명", v.durationSec ? "길이 " + fmt(v.durationSec) : "길이 미정"]
      .map(function (s) { return '<span class="chip">' + esc(s) + "</span>"; }).join("");
  }

  /* ---------------- 편집 동작 ---------------- */
  function addVideo() {
    var n = videos.length + 1, id = "video-" + n;
    while (videos.some(function (v) { return v.id === id; })) id = "video-" + (++n);
    videos.push({ id: id, order: videos.length + 1, titleKo: "새 영상", titleEn: "", descriptionKo: "", src: "", poster: "", durationSec: 0, levelTag: "", related: null, cues: [] });
    activeId = id;
    renderAll(); scheduleSave();
    toast("새 영상을 만들었어요 — 제목을 고치고 영상을 올리세요");
  }
  function addCue(start) {
    var v = active();
    if (!v) return;
    var c = { id: newCueId(v), start: r1(start), end: r1(start + 3), speakerKo: "", textKo: "", textEn: "", terms: [] };
    v.cues.push(c);
    renderRows(); changed({ list: true });
    var inp = $("veRows").querySelector('tr[data-cue="' + c.id + '"] input[data-k="textKo"]');
    if (inp) inp.focus();
  }

  // 자막 초안(AI·SRT/VTT)을 표에 넣는다: 교체 또는 뒤에 추가.
  function applyDraft(cues, msg) {
    var v = active();
    if (!v) return;
    function withIds(list) {
      return list.map(function (c) { return { id: newCueId(v), start: r1(c.start), end: r1(c.end), speakerKo: c.speakerKo || "", textKo: c.textKo || "", textEn: c.textEn || "", terms: c.terms || [] }; });
    }
    var apply = function (replace) {
      if (replace) { v.cues = []; cueSeq = 0; }
      v.cues = v.cues.concat(withIds(cues));
      renderRows(); changed({ list: true });
      toast("자막 " + cues.length + "줄을 넣었어요 — 영상을 보며 검토하세요");
    };
    if (!v.cues.length) { apply(true); if (msg) toast(msg); return; }
    choiceModal("자막 초안 넣기", msg + " 지금 자막 " + v.cues.length + "줄은 어떻게 할까요?", [
      { label: "뒤에 추가", run: function () { apply(false); } },
      { label: "모두 교체", cls: "primary", run: function () { apply(true); } }
    ]);
  }

  function runAi() {
    var v = active();
    if (!v || MODE !== "server") return;
    if (!v.src || (v.src.indexOf("/api/videos/file/") !== 0 && v.src.indexOf("/videos/") !== 0)) {
      toast("서버에 올린 영상만 분석할 수 있어요 — 먼저 영상을 업로드하세요");
      return;
    }
    var btn = $("veAi"), note = $("veAiNote"), started = Date.now();
    btn.disabled = true;
    var tick = setInterval(function () { btn.textContent = "✨ 분석 중… " + Math.round((Date.now() - started) / 1000) + "초"; }, 500);
    API.transcribe(v.src, v.id).then(function (res) {
      if (res.durationSec && !v.durationSec) v.durationSec = Math.ceil(res.durationSec);
      note.innerHTML = "AI 초안 " + res.cues.length + "줄을 받았어요 (" + esc(res.model || "Gemini") + "). 반드시 영상을 보며 글자·시간을 확인하세요.";
      applyDraft(res.cues, "AI가 자막 " + res.cues.length + "줄을 만들었어요.");
    }).catch(function (err) {
      note.textContent = err.message;
      toast("AI 자동 자막 실패 — " + err.message);
    }).then(function () {
      clearInterval(tick);
      btn.disabled = false;
      btn.textContent = "✨ AI 자동 자막 만들기";
    });
  }

  function uploadVideo(file) {
    var v = active();
    if (!v) return;
    if (MODE !== "server") {
      // 서버가 없으면 파일은 이 탭에서 미리보기만 하고, 경로는 public/videos/<이름>으로 채운다.
      if (localUrls[v.id]) URL.revokeObjectURL(localUrls[v.id]);
      localUrls[v.id] = URL.createObjectURL(file);
      var name = file.name.replace(/[^A-Za-z0-9_.-]+/g, "-").toLowerCase();
      v.src = "/videos/" + name;
      renderEditor(); changed();
      toast("미리보기용으로 열었어요 — 이 파일을 public/videos/" + name + " 로 복사하세요");
      return;
    }
    var bar = $("veProgress"), fill = bar.firstChild, btn = $("veUpload");
    bar.hidden = false; fill.style.width = "0%"; btn.disabled = true; btn.textContent = "올리는 중… 0%";
    var xhr = new XMLHttpRequest();
    xhr.open("POST", BASE + "/upload?name=" + encodeURIComponent(file.name));
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = function (e) {
      if (!e.lengthComputable) return;
      var pct = Math.round((e.loaded / e.total) * 100);
      fill.style.width = pct + "%"; btn.textContent = "올리는 중… " + pct + "%";
    };
    xhr.onload = function () {
      var d = {};
      try { d = JSON.parse(xhr.responseText); } catch (e) {}
      btn.disabled = false; btn.textContent = "영상 업로드"; bar.hidden = true;
      if (xhr.status >= 200 && xhr.status < 300 && d.src) {
        v.src = d.src;
        renderEditor(); changed();
        toast("업로드했어요 (" + (file.size / 1024 / 1024).toFixed(1) + "MB) — 이제 AI 자동 자막을 만들 수 있어요");
      } else toast("업로드 실패 — " + (d.error || "HTTP " + xhr.status));
    };
    xhr.onerror = function () { btn.disabled = false; btn.textContent = "영상 업로드"; bar.hidden = true; toast("업로드 중 네트워크 오류"); };
    xhr.send(file);
  }

  /* ---------------- SRT / VTT ---------------- */
  function parseSubtitles(text) {
    var out = [];
    text.replace(/\r/g, "").split(/\n{2,}/).forEach(function (block) {
      var lines = block.split("\n").filter(function (l) { return l.trim() !== ""; });
      var ti = lines.findIndex(function (l) { return l.indexOf("-->") !== -1; });
      if (ti < 0) return;
      var m = lines[ti].match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/);
      if (!m) return;
      var s = parseTime(m[1].replace(",", ".")), e = parseTime(m[2].replace(",", "."));
      var body = lines.slice(ti + 1).join(" ").replace(/<[^>]+>/g, "").trim();
      var speaker = "";
      var sm = body.match(/^\[?([^\]:：]{1,12})[\]:：]\s*(.+)$/);
      if (sm && /[가-힣]/.test(sm[1])) { speaker = sm[1].trim(); body = sm[2]; }
      if (isFinite(s) && isFinite(e) && body) out.push({ start: s, end: e > s ? e : r1(s + 2), speakerKo: speaker, textKo: body, textEn: "", terms: [] });
    });
    return out;
  }

  /* ---------------- 시작 ---------------- */
  function start() {
    if (!document.querySelector("header.top .brand") || !$("app")) return;
    injectShell();
    if (READ_ONLY) document.body.classList.add("ro");
    load();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.HancareVideoEditor = {
    getData: exportArray,
    setData: function (arr) { videos = normalize(arr); activeId = videos[0] ? videos[0].id : null; renderAll(); }
  };
})();
