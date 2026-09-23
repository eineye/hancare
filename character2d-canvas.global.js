(function(){
/*!
 * Character2DCanvas — HanCare 2D 실시간 교사 캐릭터 "메디쌤" (sami.jpg 기반 벡터 일러스트)
 * v1.0  |  의존성 없음 · Canvas 2D · 60fps
 *
 *  - 호흡(들숨/날숨) + 헤드 틸트 + 머리카락 2차 흔들림
 *  - 2.5~4초 주기 눈 깜빡임(Blink Engine, 가끔 이중 깜빡임) + 포인터 시선 추적 + 홍채 사카드
 *  - 한국어 11종 비셈(A E I O U M BP FV L S CH) 립싱크, 한글 자모 분해 기반 타임라인
 *  - Web Speech TTS 동기화(onboundary 보정) / 서버 TTS 오디오 동기화(currentTime + 음량) / 외부 비셈 스트림
 *  - 표정 6종: neutral smile talking surprised sad wink
 *
 * 사용: import { Character2DCanvas } from './character2d-canvas.js'
 *       const t = new Character2DCanvas({ container: el }); t.speak('안녕하세요');
 */

/* ------------------------------------------------------------------ */
/* 1. 비셈(입모양) 파라미터                                              */
/* open: 턱 벌림 · width: 좌우 폭 · round: 입술 모음 · uT/lT: 윗/아랫니 노출  */
/* tongue: 혀 노출 · tUp: 혀끝 상승 · press: 입술 압착 · lipIn: 아랫입술 말림 */
/* ------------------------------------------------------------------ */
const VISEMES = {
  rest: { open: 0.02, width: 1.0, round: 0, uT: 0, lT: 0, tongue: 0, tUp: 0, press: 0.15, lipIn: 0 },
  A:  { open: 1.0,  width: 1.05, round: 0,    uT: 0.9,  lT: 0.6,  tongue: 0.8,  tUp: 0, press: 0,    lipIn: 0 },
  E:  { open: 0.55, width: 1.22, round: 0,    uT: 1,    lT: 0.8,  tongue: 0.5,  tUp: 0, press: 0,    lipIn: 0 },
  I:  { open: 0.24, width: 1.32, round: 0,    uT: 1,    lT: 1,    tongue: 0,    tUp: 0, press: 0,    lipIn: 0 },
  O:  { open: 0.62, width: 0.72, round: 0.85, uT: 0.35, lT: 0.15, tongue: 0.35, tUp: 0, press: 0,    lipIn: 0 },
  U:  { open: 0.26, width: 0.58, round: 1,    uT: 0,    lT: 0,    tongue: 0,    tUp: 0, press: 0.1,  lipIn: 0 },
  M:  { open: 0,    width: 0.96, round: 0,    uT: 0,    lT: 0,    tongue: 0,    tUp: 0, press: 1,    lipIn: 0 },
  BP: { open: 0,    width: 1.0,  round: 0.1,  uT: 0,    lT: 0,    tongue: 0,    tUp: 0, press: 0.85, lipIn: 0 },
  FV: { open: 0.14, width: 1.04, round: 0,    uT: 1,    lT: 0,    tongue: 0,    tUp: 0, press: 0,    lipIn: 1 },
  L:  { open: 0.42, width: 1.0,  round: 0,    uT: 0.8,  lT: 0.3,  tongue: 1,    tUp: 1, press: 0,    lipIn: 0 },
  S:  { open: 0.17, width: 1.16, round: 0,    uT: 1,    lT: 1,    tongue: 0,    tUp: 0, press: 0,    lipIn: 0 },
  CH: { open: 0.2,  width: 0.84, round: 0.5,  uT: 1,    lT: 1,    tongue: 0,    tUp: 0, press: 0,    lipIn: 0 },
  // 내부 보조 형태(연구개음·ㅇ받침) — 공개 11종에는 포함되지 않음
  K:  { open: 0.24, width: 1.0,  round: 0,    uT: 0.4,  lT: 0.2,  tongue: 0.3,  tUp: 0, press: 0,    lipIn: 0 },
  NG: { open: 0.16, width: 1.0,  round: 0,    uT: 0.3,  lT: 0.1,  tongue: 0.2,  tUp: 0, press: 0,    lipIn: 0 },
};
const VISEME_NAMES = ['A', 'E', 'I', 'O', 'U', 'M', 'BP', 'FV', 'L', 'S', 'CH'];
const PK = Object.keys(VISEMES.rest);

/* ------------------------------------------------------------------ */
/* 2. 표정 파라미터                                                      */
/* ------------------------------------------------------------------ */
const EXPRESSIONS = {
  neutral:   { smile: 0.18, brow: 0,    browIn: 0,   eye: 1,    winkR: 0, blush: 0,    sad: 0, mouth: {} },
  smile:     { smile: 0.9,  brow: 0.15, browIn: 0,   eye: 0.9,  winkR: 0, blush: 0.4,  sad: 0, mouth: { open: 0.3, width: 1.2, uT: 0.95, lT: 0.35, tongue: 0.3, press: 0 } },
  talking:   { smile: 0.4,  brow: 0.22, browIn: 0,   eye: 1.02, winkR: 0, blush: 0.15, sad: 0, mouth: { open: 0.1 } },
  surprised: { smile: 0,    brow: 1,    browIn: 0.2, eye: 1.2,  winkR: 0, blush: 0.1,  sad: 0, mouth: { open: 0.5, width: 0.78, round: 0.7, uT: 0.3, lT: 0.2, tongue: 0.3, press: 0 } },
  sad:       { smile: 0,    brow: -0.1, browIn: 1,   eye: 0.86, winkR: 0, blush: 0,    sad: 1, mouth: { width: 0.9 } },
  wink:      { smile: 0.85, brow: 0.12, browIn: 0,   eye: 0.95, winkR: 1, blush: 0.4,  sad: 0, mouth: { open: 0.04, width: 1.12 } },
};
const EK = ['smile', 'brow', 'browIn', 'eye', 'winkR', 'blush', 'sad'];

/* ------------------------------------------------------------------ */
/* 3. 한국어 → 비셈 타임라인                                              */
/* ------------------------------------------------------------------ */
// 초성 19: ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ
const CHO_VIS = [null, null, 'L', 'L', 'L', 'L', 'M', 'BP', 'BP', 'S', 'S', null, 'CH', 'CH', 'CH', null, 'L', 'BP', null];
// 중성 21: ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ  ([비셈, 강도] 배열, 이중모음은 활음+주모음)
const JUNG_VIS = [
  [['A', 1]], [['E', 1]], [['I', 0.4], ['A', 1]], [['I', 0.4], ['E', 1]], [['A', 0.72]], [['E', 0.95]],
  [['I', 0.4], ['A', 0.72]], [['I', 0.4], ['E', 0.95]], [['O', 1]], [['O', 0.8], ['A', 1]], [['O', 0.8], ['E', 1]],
  [['O', 0.7], ['E', 0.9]], [['I', 0.4], ['O', 1]], [['U', 1]], [['U', 0.8], ['A', 0.75]], [['U', 0.8], ['E', 0.95]],
  [['U', 0.8], ['I', 1]], [['I', 0.4], ['U', 1]], [['I', 0.7]], [['I', 0.7], ['I', 1]], [['I', 1]],
];
// 종성 28 (0 = 없음). 대표음 규칙: ㄷ계열→L(혀끝 폐쇄), ㄱ계열→K, ㅂ계열→BP
const JONG_VIS = [null, 'K', 'K', 'K', 'L', 'L', 'L', 'L', 'L', 'K', 'M', 'L', 'L', 'L', 'BP', 'L',
  'M', 'BP', 'BP', 'L', 'L', 'NG', 'L', 'L', 'K', 'L', 'BP', 'L'];

const LATIN = { a: 'A', e: 'E', i: 'I', o: 'O', u: 'U', y: 'I', w: 'U', m: 'M', b: 'BP', p: 'BP', f: 'FV', v: 'FV',
  l: 'L', r: 'L', t: 'L', d: 'L', n: 'L', s: 'S', z: 'S', c: 'S', x: 'S', j: 'CH', k: 'K', g: 'K', q: 'K', h: null };
const LATIN_VOWEL = /[aeiouy]/;

function sinoKorean(num) {
  const d = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'], u = ['', '십', '백', '천'], big = ['', '만', '억', '조'];
  num = num.replace(/^0+/, '');
  if (!num) return '영';
  if (num.length > 16) return num.split('').map(c => (c === '0' ? '영' : d[+c])).join('');
  const groups = [];
  for (let i = num.length; i > 0; i -= 4) groups.unshift(num.slice(Math.max(0, i - 4), i));
  let out = '';
  groups.forEach((g, gi) => {
    let s = '';
    for (let k = 0; k < g.length; k++) {
      const n = +g[k], pos = g.length - 1 - k;
      if (n) s += (n === 1 && pos > 0 ? '' : d[n]) + u[pos];
    }
    if (s) out += s + big[groups.length - 1 - gi];
  });
  return out;
}

/**
 * 텍스트를 비셈 세그먼트 배열로 변환.
 * @returns {{segments:{v:string,w:number,t0:number,t1:number,ci:number}[], duration:number, charStart:Object<number,number>}}
 */
function buildVisemeTimeline(text, { msPerSyllable = 165 } = {}) {
  const k = msPerSyllable / 160;
  const segs = [];
  const charStart = {};
  let t = 0;
  const push = (v, w, dur, ci) => {
    dur *= k;
    const last = segs[segs.length - 1];
    if (last && last.v === v && Math.abs(last.w - w) < 0.05 && v === 'rest') { last.t1 += dur; t += dur; return; }
    segs.push({ v, w, t0: t, t1: t + dur, ci });
    t += dur;
  };
  const syllable = (code, ci) => {
    const s = code - 0xac00;
    const cho = Math.floor(s / 588), jung = Math.floor((s % 588) / 28), jong = s % 28;
    if (CHO_VIS[cho]) push(CHO_VIS[cho], 1, CHO_VIS[cho] === 'M' || CHO_VIS[cho] === 'BP' ? 62 : 52, ci);
    const vs = JUNG_VIS[jung];
    if (vs.length === 2) { push(vs[0][0], vs[0][1], 42, ci); push(vs[1][0], vs[1][1], 92, ci); }
    else push(vs[0][0], vs[0][1], CHO_VIS[cho] ? 108 : 132, ci);
    if (JONG_VIS[jong]) push(JONG_VIS[jong], 1, 64, ci);
  };

  const chars = Array.from(text);
  let ci = 0; // UTF-16 index (speechSynthesis charIndex 기준)
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const code = ch.codePointAt(0);
    if (!(ci in charStart)) charStart[ci] = t;
    if (code >= 0xac00 && code <= 0xd7a3) {
      syllable(code, ci);
    } else if (/[0-9]/.test(ch)) {
      let j = i, digits = '';
      while (j < chars.length && /[0-9]/.test(chars[j])) digits += chars[j++];
      for (const c of sinoKorean(digits)) syllable(c.codePointAt(0), ci);
      ci += j - i; i = j - 1;
      continue;
    } else if (/[a-zA-Z]/.test(ch)) {
      const low = ch.toLowerCase();
      const nx = (chars[i + 1] || '').toLowerCase();
      if ((low === 'c' || low === 's') && nx === 'h') { push('CH', 1, 80, ci); ci += 2; i++; continue; }
      if (low === 't' && nx === 'h') { push('L', 0.8, 70, ci); ci += 2; i++; continue; }
      const v = LATIN[low];
      if (v) push(v, 1, LATIN_VOWEL.test(low) ? 95 : 65, ci);
    } else if (/[.!?。…\n]/.test(ch)) {
      push('rest', 1, 380, ci);
    } else if (/[,;:·~]/.test(ch)) {
      push('rest', 1, 220, ci);
    } else if (/\s/.test(ch)) {
      push('rest', 1, 45, ci);
    }
    ci += ch.length;
  }
  push('rest', 1, 120, ci);
  return { segments: segs, duration: t, charStart };
}

/** 외부 비셈 이벤트([{t:ms, v:'A', w?:1}]) → 타임라인 */
function timelineFromEvents(events, tailMs = 120) {
  const segs = [];
  const ev = [...events].sort((a, b) => a.t - b.t);
  ev.forEach((e, i) => {
    const t1 = i + 1 < ev.length ? ev[i + 1].t : e.t + tailMs;
    const v = VISEMES[e.v] ? e.v : 'rest';
    segs.push({ v, w: e.w ?? 1, t0: e.t, t1, ci: -1 });
  });
  return { segments: segs, duration: segs.length ? segs[segs.length - 1].t1 : 0, charStart: {} };
}

function splitSentences(text) {
  const out = [];
  const re = /[^.!?。\n]+[.!?。\n]*/g;
  let m;
  while ((m = re.exec(text))) if (m[0].trim()) out.push({ text: m[0], offset: m.index });
  return out.length ? out : [{ text, offset: 0 }];
}

/* ------------------------------------------------------------------ */
/* 4. 유틸                                                              */
/* ------------------------------------------------------------------ */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const smooth = t => t * t * (3 - 2 * t);
const rand = (a, b) => a + Math.random() * (b - a);

const W = 512, H = 640; // 디자인 좌표계

const DEFAULT_PALETTE = {
  skin: '#fbe0d2', skinLight: '#fff2eb', skinShade: '#f0c3b1', skinDeep: '#dfa592',
  hair: '#3a2821', hairMid: '#4d3429', hairLight: '#6e4c3d',
  iris: '#8a5230', irisDark: '#3e2114', lash: '#2a1a16', brow: '#5a3a2e',
  lipUpper: '#d46f78', lipLower: '#e6858c', lipLine: '#8f3a45', mouth: '#4a1a21', teeth: '#fbf7f2', tongue: '#d8686f',
  cloth: '#22304f', clothLight: '#34466e', collar: '#f3f5f9', badge: '#2a9d8f',
};

/* ------------------------------------------------------------------ */
/* 5. Character2DCanvas                                                */
/* ------------------------------------------------------------------ */
class Character2DCanvas {
  /**
   * @param {object} o
   * @param {HTMLElement} [o.container]  캔버스를 만들어 넣을 요소(크기 자동 추적)
   * @param {HTMLCanvasElement} [o.canvas] 기존 캔버스 사용(XR 텍스처용 등)
   * @param {number} [o.width=512] [o.height=640]  container 없이 canvas를 만들 때 픽셀 크기
   * @param {boolean} [o.autoStart=true]  자체 requestAnimationFrame 루프 사용 여부 (WebXR에서는 false 후 tick())
   * @param {boolean} [o.trackPointer=true]
   * @param {string|null} [o.background=null]  null이면 투명
   * @param {number} [o.msPerSyllable=165]
   * @param {string} [o.lang='ko-KR'] [o.voiceName] [o.rate=1] [o.pitch=1.1]
   * @param {object} [o.palette]
   * @param {(self:Character2DCanvas)=>void} [o.onFrame]  매 프레임 렌더 직후 호출(CanvasTexture.needsUpdate 등)
   */
  constructor(o = {}) {
    this.o = Object.assign({
      container: null, canvas: null, width: 512, height: 640, autoStart: true, trackPointer: true,
      background: null, msPerSyllable: 165, lang: 'ko-KR', voiceName: null, rate: 1, pitch: 1.1,
      pixelRatio: Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1),
      palette: {}, onFrame: null,
    }, o);
    this.p = Object.assign({}, DEFAULT_PALETTE, this.o.palette);

    this.canvas = this.o.canvas || document.createElement('canvas');
    if (!this.o.canvas) {
      this.canvas.style.display = 'block';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.setAttribute('role', 'img');
      this.canvas.setAttribute('aria-label', '메디쌤 캐릭터');
      if (this.o.container) this.o.container.appendChild(this.canvas);
      else { this.canvas.width = this.o.width; this.canvas.height = this.o.height; }
    }
    this.ctx = this.canvas.getContext('2d');

    // 상태
    this.time = 0;
    this.breathPhase = Math.random();
    this.breath = 0;
    this.gaze = { x: 0, y: 0 }; this.gazeTarget = { x: 0, y: 0 };
    this.gazeMode = 'auto';            // auto(포인터+유휴) | manual | idle
    this._pointerAt = -99;
    this._nextSaccade = 0.5;
    this.head = { x: 0, y: 0, tilt: 0 }; this._hairLag = 0;
    this._blinkT = rand(2.5, 4); this._blink = -1; this.blinkAmt = 0; this._doubleBlink = false;
    this.exprName = 'neutral';
    this.expr = Object.assign({}, EXPRESSIONS.neutral);
    this.mouth = Object.assign({}, VISEMES.rest);
    this.currentViseme = 'rest';
    this._manual = null;               // setViseme() 수동 입력
    this._tl = null; this._tlT = 0; this._tlCursor = 0; this._tlRate = 1;
    this._clock = null;                // () => ms (오디오 기반 정확 동기)
    this._amp = 0; this._ampFn = null; this._quiet = 0;
    this.speaking = false;
    this._listeners = {};
    this._speakToken = 0;

    this._onPointer = e => {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width) return;
      const fx = r.left + (this._ox + 256 * this._s) / this._dpr;
      const fy = r.top + (this._oy + 330 * this._s) / this._dpr;
      const sx = r.width / 2.2, sy = r.height / 2.4;
      this._pointer = { x: clamp((e.clientX - fx) / sx, -1, 1), y: clamp((e.clientY - fy) / sy, -1, 1) };
      this._pointerAt = this.time;
    };
    if (this.o.trackPointer && typeof window !== 'undefined') window.addEventListener('pointermove', this._onPointer, { passive: true });

    this.resize();
    if (this.o.container && typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(this.o.container);
    }
    if (this.o.autoStart) this.start();
  }

  /* ---------------- 이벤트 ---------------- */
  on(ev, fn) { (this._listeners[ev] ||= []).push(fn); return () => this.off(ev, fn); }
  off(ev, fn) { this._listeners[ev] = (this._listeners[ev] || []).filter(f => f !== fn); }
  _emit(ev, d) { (this._listeners[ev] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } }); }

  /* ---------------- 루프 ---------------- */
  start() {
    if (this._raf) return;
    this._last = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - this._last) / 1000 || 0.016);
      this._last = now;
      this.tick(dt);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }
  stopLoop() { cancelAnimationFrame(this._raf); this._raf = null; }
  /** 외부 루프(WebXR renderer.setAnimationLoop 등)에서 호출 — 초 단위 dt */
  tick(dt) { this.update(dt); this.render(); if (this.o.onFrame) this.o.onFrame(this); }

  resize() {
    const c = this.canvas;
    const dpr = this.o.pixelRatio;
    if (this.o.container) {
      const r = this.o.container.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      this._dpr = dpr;
    } else this._dpr = 1;
    this._s = Math.min(c.width / W, c.height / H);
    this._ox = (c.width - W * this._s) / 2;
    this._oy = (c.height - H * this._s) / 2;
  }

  /* ---------------- 공개 제어 API ---------------- */
  setExpression(name) { if (EXPRESSIONS[name]) { this.exprName = name; this._emit('expression', name); } return this; }
  /** 비셈을 직접 지정(외부 실시간 구동). name=null이면 해제 */
  setViseme(name, weight = 1) { this._manual = name ? { v: name, w: weight } : null; return this; }
  /** 시선 지정: x,y ∈ [-1,1]. mode='manual'로 전환 */
  lookAt(x, y) { this.gazeMode = 'manual'; this.gazeTarget = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) }; return this; }
  setGazeMode(mode) { this.gazeMode = mode; return this; }
  /** 외부 음량(0~1) 공급 함수 — 예: WebRTC 스트림 분석기 */
  setAmplitudeSource(fn) { this._userAmpFn = fn || null; this._ampFn = fn || null; return this; }

  /** 텍스트만으로 립싱크 재생(음성 없음) */
  playText(text, opts = {}) {
    const tl = buildVisemeTimeline(text, { msPerSyllable: opts.msPerSyllable || this.o.msPerSyllable });
    return this._play(tl, null);
  }
  /** 비셈 이벤트 배열 재생. clock을 주면 그 시간(ms)에 정확히 동기 */
  playVisemes(events, clock = null) { return this._play(timelineFromEvents(events), clock); }

  _play(tl, clock) {
    this._tl = tl; this._tlT = 0; this._tlCursor = 0; this._tlRate = 1; this._clock = clock;
    this.speaking = true;
    this._emit('start');
    return new Promise(res => { this._resolvePlay = res; });
  }
  _finishPlay() {
    if (!this._tl) return;
    this._tl = null; this._clock = null; this.speaking = false; this._ampFn = this._userAmpFn || null;
    this._emit('end');
    const r = this._resolvePlay; this._resolvePlay = null; if (r) r();
  }

  stop() {
    this._speakToken++;
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    if (this._audio) { this._audio.pause(); this._audio = null; }
    this._finishPlay();
  }

  /** 사용 가능한 한국어 음성 목록 */
  static getVoices(lang = 'ko') {
    if (typeof speechSynthesis === 'undefined') return [];
    return speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith(lang.toLowerCase()));
  }
  static voicesReady(timeout = 1500) {
    return new Promise(res => {
      if (typeof speechSynthesis === 'undefined') return res([]);
      const v = speechSynthesis.getVoices();
      if (v.length) return res(v);
      const done = () => res(speechSynthesis.getVoices());
      speechSynthesis.addEventListener('voiceschanged', done, { once: true });
      setTimeout(done, timeout);
    });
  }

  /**
   * 브라우저 TTS(Web Speech)로 말하기 + 립싱크.
   * 한국어 음성이 없으면 음성 없이 입모양만 재생하고 'warning' 이벤트를 보낸다.
   */
  async speak(text, opts = {}) {
    this.stop();
    const token = this._speakToken;
    const rate = opts.rate ?? this.o.rate;
    const mps = (opts.msPerSyllable || this.o.msPerSyllable) / rate;
    const voices = await Character2DCanvas.voicesReady();
    if (token !== this._speakToken) return;
    const lang = opts.lang || this.o.lang;
    const name = opts.voiceName || this.o.voiceName;
    const voice = (name && voices.find(v => v.name === name))
      || voices.find(v => v.lang === lang && /google|yuna|sunhi|heami|injoon|online|natural/i.test(v.name))
      || voices.find(v => v.lang && v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase())
      || voices.find(v => v.lang && v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
    if (!voice || typeof SpeechSynthesisUtterance === 'undefined') {
      this._emit('warning', { code: 'NO_VOICE', message: '한국어 TTS 음성을 찾지 못해 입모양만 재생합니다.' });
      return this.playText(text, { msPerSyllable: mps });
    }

    for (const chunk of splitSentences(text)) {
      if (token !== this._speakToken) return;
      await new Promise(resolve => {
        const u = new SpeechSynthesisUtterance(chunk.text);
        u.voice = voice; u.lang = voice.lang; u.rate = rate; u.pitch = opts.pitch ?? this.o.pitch; u.volume = opts.volume ?? 1;
        let startedAt = 0, ended = false;
        const tl = buildVisemeTimeline(chunk.text, { msPerSyllable: mps });
        const finish = () => { if (ended) return; ended = true; clearTimeout(guard); this._finishPlay(); resolve(); };
        u.onstart = () => {
          startedAt = performance.now();
          this._play(tl, null);
        };
        u.onboundary = e => {
          if (!this._tl || this._tl !== tl) return;
          const exp = tl.charStart[e.charIndex];
          if (exp == null) return;
          const real = performance.now() - startedAt;
          if (real > 150 && exp > 150) this._tlRate = clamp(lerp(this._tlRate, exp / real, 0.6), 0.6, 1.7);
          this._tlT = exp;
          this._tlCursor = 0;
          this._emit('boundary', { charIndex: e.charIndex + chunk.offset, name: e.name });
        };
        u.onend = finish;
        u.onerror = finish;
        const guard = setTimeout(finish, tl.duration / 0.5 + 4000); // 일부 브라우저 onend 누락 대비
        speechSynthesis.speak(u);
      });
    }
  }

  /**
   * 오디오(서버 TTS 결과 등) 재생 + 립싱크. 가장 정확한 방식 — XR 권장.
   * @param {string|Blob|HTMLAudioElement} src
   * @param {string} text  발화 문장(타임라인 생성용)
   * @param {object} [opts] visemes: [{t:ms, v:'A'}] (TTS 엔진이 비셈/타임포인트를 주는 경우), leadMs: 앞 무음 길이
   */
  async speakAudio(src, text, opts = {}) {
    this.stop();
    const token = this._speakToken;
    const audio = src instanceof HTMLAudioElement ? src : new Audio(src instanceof Blob ? URL.createObjectURL(src) : src);
    audio.crossOrigin = 'anonymous';
    this._audio = audio;
    if (!(audio.readyState >= 1)) await new Promise((r, j) => { audio.addEventListener('loadedmetadata', r, { once: true }); audio.addEventListener('error', j, { once: true }); });
    if (token !== this._speakToken) return;

    let tl;
    if (opts.visemes) tl = timelineFromEvents(opts.visemes);
    else {
      tl = buildVisemeTimeline(text, { msPerSyllable: this.o.msPerSyllable });
      const lead = opts.leadMs ?? 60, avail = Math.max(200, audio.duration * 1000 - lead - (opts.tailMs ?? 120));
      const k = avail / tl.duration;
      tl.segments.forEach(s => { s.t0 = s.t0 * k + lead; s.t1 = s.t1 * k + lead; });
      tl.duration = tl.duration * k + lead;
    }
    // 음량 분석(가능할 때만)
    try {
      this._ac ||= new (window.AudioContext || window.webkitAudioContext)();
      if (this._ac.state === 'suspended') await this._ac.resume();
      const node = this._ac.createMediaElementSource(audio);
      const an = this._ac.createAnalyser(); an.fftSize = 1024;
      node.connect(an); an.connect(this._ac.destination);
      const buf = new Float32Array(an.fftSize);
      this._ampFn = () => { an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return Math.sqrt(s / buf.length); };
    } catch (e) { /* CORS 등으로 분석 불가 시 타임라인만 사용 */ }

    const p = this._play(tl, () => audio.currentTime * 1000);
    audio.addEventListener('ended', () => this._finishPlay(), { once: true });
    await audio.play();
    return p;
  }

  destroy() {
    this.stop(); this.stopLoop();
    if (this._ro) this._ro.disconnect();
    window.removeEventListener('pointermove', this._onPointer);
    if (!this.o.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  }

  /* ---------------- 업데이트 ---------------- */
  update(dt) {
    this.time += dt;
    const t = this.time;

    // 호흡: 들숨 40% / 날숨 60% 비대칭, 말할 땐 약간 빠르게
    this.breathPhase += dt / (this.speaking ? 3.4 : 4.3);
    const ph = this.breathPhase % 1;
    this.breath = ph < 0.4 ? smooth(ph / 0.4) : 1 - smooth((ph - 0.4) / 0.6);

    // 표정 블렌딩 (말하는 중 neutral이면 talking으로)
    const en = this.speaking && this.exprName === 'neutral' ? 'talking' : this.exprName;
    const E = EXPRESSIONS[en];
    for (const k of EK) this.expr[k] = damp(this.expr[k], E[k], 9, dt);
    this._exprMouth = E.mouth;

    // 시선
    const usePointer = this.gazeMode === 'auto' && this._pointer && t - this._pointerAt < 2.5;
    if (this.gazeMode === 'manual') { /* gazeTarget 유지 */ }
    else if (usePointer) this.gazeTarget = { x: this._pointer.x, y: this._pointer.y };
    else if (t > this._nextSaccade) {
      // 유휴 사카드: 말할 땐 정면 위주
      const r = this.speaking ? 0.18 : 0.42;
      this.gazeTarget = Math.random() < (this.speaking ? 0.6 : 0.35) ? { x: rand(-0.06, 0.06), y: rand(-0.05, 0.05) } : { x: rand(-r, r), y: rand(-r * 0.6, r * 0.5) };
      this._nextSaccade = t + rand(0.7, 2.6);
    }
    // 사카드: 빠르게 도달(약 40ms) + 미세 떨림
    const jig = 0.012;
    this.gaze.x = damp(this.gaze.x, this.gazeTarget.x + Math.sin(t * 13.1) * jig, 28, dt);
    this.gaze.y = damp(this.gaze.y, this.gazeTarget.y + Math.cos(t * 11.7) * jig, 28, dt);

    // 머리: 시선을 느리게 따라감 + 유휴 흔들림 + 발화 끄덕임
    const talkNod = this.speaking ? Math.sin(t * 2.6) * 0.8 + this.mouth.open * 1.4 : 0;
    const tiltTarget = this.gaze.x * 3.2 + Math.sin(t * 0.47) * 1.4 + Math.sin(t * 0.21 + 1) * 0.9 + (this.speaking ? Math.sin(t * 1.7) * 0.9 : 0);
    this.head.tilt = damp(this.head.tilt, tiltTarget, 3.2, dt);
    this.head.x = damp(this.head.x, this.gaze.x * 7, 3, dt);
    this.head.y = damp(this.head.y, this.gaze.y * 5 + talkNod, 4, dt);
    this._hairLag = damp(this._hairLag, this.head.tilt, 3.5, dt);

    // 깜빡임: 2.5~4초, 15% 확률 이중 깜빡임. 닫힘 70ms · 유지 30ms · 뜸 110ms
    this._blinkT -= dt;
    if (this._blink < 0 && this._blinkT <= 0) {
      this._blink = 0;
      if (!this._doubleBlink && Math.random() < 0.15) { this._doubleBlink = true; this._blinkT = 0.26; }
      else { this._doubleBlink = false; this._blinkT = rand(2.5, 4); }
    }
    if (this._blink >= 0) {
      this._blink += dt;
      const b = this._blink;
      this.blinkAmt = b < 0.07 ? b / 0.07 : b < 0.1 ? 1 : b < 0.21 ? 1 - (b - 0.1) / 0.11 : 0;
      if (b >= 0.21) { this._blink = -1; this.blinkAmt = 0; }
    }

    // 립싱크
    this._updateMouth(dt);
  }

  _updateMouth(dt) {
    const restBase = Object.assign({}, VISEMES.rest, this._exprMouth || {});
    let target = restBase, vName = 'rest';

    if (this._tl) {
      if (this._clock) this._tlT = this._clock();
      else this._tlT += dt * 1000 * this._tlRate;
      const segs = this._tl.segments;
      let i = this._tlCursor;
      if (i >= segs.length || segs[i].t0 > this._tlT) i = 0;
      while (i < segs.length - 1 && segs[i].t1 <= this._tlT) i++;
      this._tlCursor = i;
      const s = segs[i];
      if (s && this._tlT < this._tl.duration) {
        const frac = clamp((this._tlT - s.t0) / Math.max(1, s.t1 - s.t0), 0, 1);
        target = this._mix(restBase, s.v, s.w);
        vName = s.v;
        // 동시조음: 세그먼트 후반부에 다음 비셈을 미리 섞음
        const n = segs[i + 1];
        if (n && frac > 0.55) {
          const a = (frac - 0.55) / 0.45 * 0.35;
          const nt = this._mix(restBase, n.v, n.w);
          target = this._blend(target, nt, a);
        }
      } else if (!this._clock && this._tlT >= this._tl.duration && typeof speechSynthesis !== 'undefined' && !speechSynthesis.speaking) {
        this._finishPlay();
      } else if (!this._clock && this._tlT >= this._tl.duration && typeof speechSynthesis === 'undefined') {
        this._finishPlay();
      }
    }
    if (this._manual) { target = this._mix(restBase, this._manual.v, this._manual.w); vName = this._manual.v; }

    // 음량 게이팅(오디오 모드): 무음이면 입을 닫고, 크기에 따라 벌림 조절
    const ampFn = this._ampFn;
    if (ampFn && (this.speaking || this._userAmpFn)) {
      const a = ampFn();
      this._amp = damp(this._amp, a, a > this._amp ? 30 : 10, dt);
      const lvl = clamp((this._amp - 0.012) / 0.12, 0, 1);
      if (lvl < 0.04) this._quiet += dt; else this._quiet = 0;
      if (this._quiet > 0.09) { target = restBase; vName = 'rest'; }
      else if (!this.speaking && !this._manual) {
        // 텍스트 없이 음량만 있는 경우(실시간 마이크/스트림): 모음 형태를 순환하며 턱을 벌림
        vName = ['A', 'E', 'O', 'I'][Math.floor(this.time * 7) % 4];
        target = this._mix(restBase, vName, 0.35 + 0.65 * lvl);
      } else target = Object.assign({}, target, { open: target.open * (0.55 + 0.6 * lvl) });
    }

    const closing = target.press > 0.5 || vName === 'M' || vName === 'BP';
    const rate = closing ? 42 : 26;
    for (const k of PK) this.mouth[k] = damp(this.mouth[k], target[k], rate, dt);
    if (vName !== this.currentViseme) { this.currentViseme = vName; this._emit('viseme', vName); }
  }
  _mix(rest, v, w) {
    const V = VISEMES[v] || VISEMES.rest, o = {};
    for (const k of PK) o[k] = lerp(rest[k], V[k], w);
    return o;
  }
  _blend(a, b, t) { const o = {}; for (const k of PK) o[k] = lerp(a[k], b[k], t); return o; }

  /* ---------------- 렌더 ---------------- */
  render() {
    const c = this.ctx, cv = this.canvas;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    if (this.o.background) { c.fillStyle = this.o.background; c.fillRect(0, 0, cv.width, cv.height); }
    c.setTransform(this._s, 0, 0, this._s, this._ox, this._oy);
    c.lineJoin = 'round'; c.lineCap = 'round';

    const b = this.breath;
    const headT = () => {
      const px = 256, py = 500;
      c.translate(px + this.head.x, py + this.head.y - b * 1.8);
      c.rotate(this.head.tilt * Math.PI / 180);
      c.translate(-px, -py);
    };

    c.save(); headT(); this._backHair(c); c.restore();

    c.save();
    c.translate(256, 640); c.scale(1 + b * 0.01, 1 + b * 0.016); c.translate(-256, -640);
    c.translate(0, -b * 2.2);
    this._body(c);
    c.restore();

    c.save(); headT(); this._head(c); c.restore();
  }

  _backHair(c) {
    const p = this.p;
    const g = c.createLinearGradient(0, 90, 0, 480);
    g.addColorStop(0, p.hairMid); g.addColorStop(1, p.hair);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(96, 360);
    c.bezierCurveTo(68, 220, 140, 92, 256, 90);
    c.bezierCurveTo(372, 92, 444, 220, 416, 360);
    c.bezierCurveTo(410, 420, 384, 462, 360, 474);
    c.lineTo(152, 474);
    c.bezierCurveTo(128, 462, 102, 420, 96, 360);
    c.fill();
  }

  _body(c) {
    const p = this.p;
    // 목
    const ng = c.createLinearGradient(0, 440, 0, 600);
    ng.addColorStop(0, p.skinDeep); ng.addColorStop(0.35, p.skinShade); ng.addColorStop(1, p.skin);
    c.fillStyle = ng;
    c.beginPath();
    c.moveTo(214, 440); c.bezierCurveTo(218, 500, 214, 540, 200, 575);
    c.lineTo(312, 575); c.bezierCurveTo(298, 540, 294, 500, 298, 440); c.closePath(); c.fill();
    // V넥 안쪽 피부
    c.fillStyle = p.skin;
    c.beginPath(); c.moveTo(196, 560); c.lineTo(316, 560); c.lineTo(256, 645); c.closePath(); c.fill();
    // 쇄골 음영
    c.strokeStyle = 'rgba(200,130,110,.25)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(222, 590); c.quadraticCurveTo(236, 597, 248, 606); c.moveTo(290, 590); c.quadraticCurveTo(276, 597, 264, 606); c.stroke();
    // 상의
    const cg = c.createLinearGradient(0, 560, 0, 640);
    cg.addColorStop(0, p.clothLight); cg.addColorStop(1, p.cloth);
    c.fillStyle = cg;
    c.beginPath();
    c.moveTo(-10, 645); c.lineTo(-10, 628);
    c.quadraticCurveTo(40, 588, 140, 578); c.quadraticCurveTo(186, 572, 206, 562);
    c.lineTo(256, 632); c.lineTo(306, 562);
    c.quadraticCurveTo(326, 572, 372, 578); c.quadraticCurveTo(472, 588, 522, 628);
    c.lineTo(522, 645); c.closePath(); c.fill();
    // 칼라 라인
    c.strokeStyle = p.collar; c.lineWidth = 7;
    c.beginPath(); c.moveTo(204, 560); c.lineTo(256, 634); c.lineTo(308, 560); c.stroke();
    // 배지(십자)
    c.fillStyle = p.badge;
    c.beginPath(); c.arc(356, 612, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff';
    c.fillRect(353.5, 605, 5, 14); c.fillRect(349, 609.5, 14, 5);
  }

  _facePath(c, jaw) {
    c.beginPath();
    c.moveTo(118, 250);
    c.bezierCurveTo(112, 330, 118, 395, 150, 440);
    c.bezierCurveTo(180, 485, 222, 510 + jaw, 256, 512 + jaw);
    c.bezierCurveTo(290, 510 + jaw, 332, 485, 362, 440);
    c.bezierCurveTo(394, 395, 400, 330, 394, 250);
    c.bezierCurveTo(390, 170, 330, 140, 256, 140);
    c.bezierCurveTo(182, 140, 122, 170, 118, 250);
    c.closePath();
  }

  _frontHairPath(c, dy = 0) {
    c.beginPath();
    c.moveTo(98, 372 + dy);
    c.bezierCurveTo(76, 230 + dy, 140, 98 + dy, 256, 96 + dy);
    c.bezierCurveTo(372, 98 + dy, 436, 230 + dy, 414, 372 + dy);
    c.bezierCurveTo(404, 342 + dy, 396, 318 + dy, 386, 298 + dy);
    c.bezierCurveTo(368, 240 + dy, 320, 194 + dy, 262, 176 + dy);
    c.lineTo(256, 186 + dy);
    c.lineTo(250, 176 + dy);
    c.bezierCurveTo(192, 194 + dy, 144, 240 + dy, 126, 298 + dy);
    c.bezierCurveTo(116, 318 + dy, 108, 342 + dy, 98, 372 + dy);
    c.closePath();
  }

  _head(c) {
    const p = this.p, e = this.expr, m = this.mouth;
    const jaw = m.open * 12;

    // 귀
    c.fillStyle = p.skinShade;
    for (const s of [-1, 1]) {
      c.save(); c.translate(256 + s * 140, 352); c.rotate(s * 0.12);
      c.beginPath(); c.ellipse(0, 0, 14, 26, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(190,120,100,.45)'; c.lineWidth = 2;
      c.beginPath(); c.arc(s * -2, 0, 8, -1.2, 1.2); c.stroke();
      c.restore();
    }

    // 얼굴
    const fg = c.createRadialGradient(250, 330, 30, 256, 340, 240);
    fg.addColorStop(0, p.skinLight); fg.addColorStop(0.62, p.skin); fg.addColorStop(1, p.skinShade);
    c.fillStyle = fg;
    this._facePath(c, jaw); c.fill();

    // 얼굴 내부 요소는 얼굴 모양으로 클립
    c.save();
    this._facePath(c, jaw); c.clip();

    // 앞머리 그림자
    c.fillStyle = 'rgba(170,90,70,.16)';
    this._frontHairPath(c, 9); c.fill();
    // 볼 터치
    const bl = 0.22 + e.blush * 0.25;
    for (const x of [166, 346]) {
      const g = c.createRadialGradient(x, 408, 2, x, 408, 44);
      g.addColorStop(0, `rgba(255,128,128,${bl})`); g.addColorStop(1, 'rgba(255,128,128,0)');
      c.fillStyle = g; c.fillRect(x - 50, 358, 100, 100);
    }
    // 턱 아래 음영
    const jg = c.createLinearGradient(0, 470 + jaw, 0, 515 + jaw);
    jg.addColorStop(0, 'rgba(230,160,140,0)'); jg.addColorStop(1, 'rgba(225,150,130,.35)');
    c.fillStyle = jg; c.fillRect(150, 470 + jaw, 212, 50);
    c.restore();

    // 코
    c.strokeStyle = 'rgba(205,140,120,.35)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(263, 352); c.quadraticCurveTo(269, 384, 265, 402); c.stroke();
    c.strokeStyle = 'rgba(190,115,100,.5)'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(245, 407); c.quadraticCurveTo(256, 416, 267, 407); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.beginPath(); c.ellipse(255, 397, 3.5, 2.5, 0, 0, Math.PI * 2); c.fill();

    // 입
    this._mouth(c, m, e);

    // 눈
    const gx = this.gaze.x, gy = this.gaze.y;
    const baseOpen = e.eye * (1 - this.blinkAmt);
    const lowerRaise = clamp(e.smile * 0.8, 0, 1);
    this._eye(c, 188, 334, -1, baseOpen, lowerRaise, gx, gy);
    this._eye(c, 324, 334, 1, baseOpen * (1 - e.winkR), clamp(lowerRaise + e.winkR * 0.4, 0, 1), gx, gy);

    // 눈썹
    this._brows(c, e);

    // 앞머리
    const hg = c.createLinearGradient(0, 96, 0, 372);
    hg.addColorStop(0, p.hairMid); hg.addColorStop(0.6, p.hair); hg.addColorStop(1, p.hair);
    c.fillStyle = hg;
    this._frontHairPath(c); c.fill();
    // 결 표현
    c.save(); this._frontHairPath(c); c.clip();
    c.strokeStyle = 'rgba(120,85,70,.22)'; c.lineWidth = 1.6;
    for (let i = 0; i < 7; i++) {
      const s = i < 4 ? -1 : 1, k = i % 4;
      c.beginPath();
      c.moveTo(256 + s * (4 + k * 6), 104 + k * 3);
      c.bezierCurveTo(256 + s * (60 + k * 18), 130 + k * 10, 256 + s * (110 + k * 12), 200 + k * 16, 256 + s * (128 + k * 10), 300 + k * 18);
      c.stroke();
    }
    c.restore();

    // 가르마 커튼 앞머리 가닥
    const bsw = (this.head.tilt - this._hairLag) * 0.8;
    c.fillStyle = p.hairMid;
    this._ribbon(c, [250, 178], [204, 192], [158, 230], [130, 310], 12, 2, bsw);
    this._ribbon(c, [262, 178], [308, 192], [354, 230], [382, 310], 12, 2, bsw);
    c.fillStyle = p.hair;
    this._ribbon(c, [244, 180], [214, 200], [196, 236], [190, 262], 5, 1, bsw * 1.5);
    this._ribbon(c, [268, 180], [300, 198], [322, 230], [330, 252], 4, 1, bsw * 1.5);
    // 옆머리 가닥(2차 흔들림)
    const sway = (this.head.tilt - this._hairLag) * 2.4 + Math.sin(this.time * 1.2) * 1.2;
    c.fillStyle = p.hair;
    this._ribbon(c, [140, 250], [110, 322], [130, 404], [104, 482], 8, 1, sway);
    this._ribbon(c, [152, 262], [128, 330], [148, 392], [128, 446], 4.5, 1, sway * 1.2);
    this._ribbon(c, [372, 250], [402, 322], [382, 404], [410, 480], 8, 1, sway);
    this._ribbon(c, [360, 262], [384, 330], [364, 392], [384, 442], 4.5, 1, sway * 1.2);
  }

  _ribbon(c, p0, p1, p2, p3, w0, w1, sway) {
    const q1 = [p1[0] + sway * 0.25, p1[1]], q2 = [p2[0] + sway * 0.6, p2[1]], q3 = [p3[0] + sway, p3[1]];
    const pts = [], N = 18;
    const bz = (t, a, b, cc, d) => {
      const u = 1 - t;
      return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * cc + t * t * t * d;
    };
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push([bz(t, p0[0], q1[0], q2[0], q3[0]), bz(t, p0[1], q1[1], q2[1], q3[1]), lerp(w0, w1, t)]);
    }
    const L = [], R = [];
    for (let i = 0; i <= N; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      const w = pts[i][2] / 2;
      L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
      R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
    }
    c.beginPath();
    c.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i <= N; i++) c.lineTo(L[i][0], L[i][1]);
    for (let i = N; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
    c.closePath(); c.fill();
  }

  _brows(c, e) {
    const r = e.brow * 9, ins = e.browIn * 9;
    c.fillStyle = this.p.brow;
    c.globalAlpha = 0.92;
    for (const s of [-1, 1]) {
      const X = x => 256 + s * x;
      this._ribbon(c, [X(34), 282 - r - ins], [X(54), 268 - r - ins * 0.6], [X(86), 259 - r], [X(112), 275 - r + e.browIn * 3], 7, 1.8, 0);
    }
    c.globalAlpha = 1;
  }

  _eye(c, cx, cy, side, open, lower, gx, gy) {
    const p = this.p;
    const hw = 41;
    const inner = [cx - side * hw * 0.95, cy + 4], outer = [cx + side * hw, cy - 2];
    const lowY = cy + 19 - lower * 10;
    const l1 = [cx + side * hw * 0.5, lowY], l2 = [cx - side * hw * 0.5, lowY + 2];
    const closedY = lowY - 3;
    const o = clamp(open, 0, 1.3);
    const u1 = [cx - side * hw * 0.55, lerp(closedY, cy - 41, o) + 2];
    const u2 = [cx + side * hw * 0.45, lerp(closedY, cy - 42, o)];

    const upper = () => { c.moveTo(inner[0], inner[1]); c.bezierCurveTo(u1[0], u1[1], u2[0], u2[1], outer[0], outer[1]); };
    const shape = () => { c.beginPath(); upper(); c.bezierCurveTo(l1[0], l1[1], l2[0], l2[1], inner[0], inner[1]); c.closePath(); };

    if (o > 0.06) {
      c.save(); shape(); c.clip();
      c.fillStyle = '#fbf8f7'; c.fillRect(cx - 50, cy - 45, 100, 80);
      const ix = cx + gx * 11, iy = cy + 1 + gy * 6, R = 24;
      const ig = c.createRadialGradient(ix, iy - 5, 2, ix, iy, R);
      ig.addColorStop(0, '#b27446'); ig.addColorStop(0.5, p.iris); ig.addColorStop(1, p.irisDark);
      c.fillStyle = ig; c.beginPath(); c.arc(ix, iy, R, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(40,20,12,.6)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#1b0f0b'; c.beginPath(); c.arc(ix, iy, 10.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.95)';
      c.beginPath(); c.ellipse(ix - 8, iy - 9, 7.5, 6, -0.4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(ix + 8.5, iy + 8, 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,220,190,.35)';
      c.beginPath(); c.ellipse(ix + 3, iy + 12, 9, 4, 0, 0, Math.PI * 2); c.fill();
      // 윗꺼풀 그림자
      c.strokeStyle = 'rgba(110,60,50,.22)'; c.lineWidth = 12; c.beginPath(); upper(); c.stroke();
      c.restore();
      // 쌍꺼풀 라인
      c.strokeStyle = `rgba(160,95,85,${0.45 * clamp(o, 0, 1)})`; c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(inner[0] + side * 12, inner[1] - 12);
      c.bezierCurveTo(u1[0], u1[1] - 11, u2[0], u2[1] - 10, outer[0] + side * 2, outer[1] - 10);
      c.stroke();
      // 아래 속눈썹
      c.strokeStyle = 'rgba(90,50,40,.35)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(outer[0], outer[1] + 2); c.bezierCurveTo(l1[0], l1[1], l2[0], l2[1], inner[0] + side * 12, inner[1] + 3); c.stroke();
    }
    // 윗 속눈썹 라인
    c.strokeStyle = p.lash; c.lineWidth = o > 0.06 ? 4.5 : 3.6;
    c.beginPath(); upper(); c.stroke();
    // 꼬리
    c.fillStyle = p.lash;
    const ty = o > 0.06 ? -6 : 2;
    this._ribbon(c, [outer[0] - side * 8, outer[1] - 1], [outer[0], outer[1]], [outer[0] + side * 6, outer[1] + ty * 0.5], [outer[0] + side * 11, outer[1] + ty], 4, 0.8, 0);
    if (o > 0.25) {
      c.lineWidth = 1.6;
      for (let k = 0; k < 3; k++) {
        const t = 0.62 + k * 0.12, u = 1 - t;
        const x = u * u * u * inner[0] + 3 * u * u * t * u1[0] + 3 * u * t * t * u2[0] + t * t * t * outer[0];
        const y = u * u * u * inner[1] + 3 * u * u * t * u1[1] + 3 * u * t * t * u2[1] + t * t * t * outer[1];
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + side * (4 + k * 2), y - 6 - k); c.stroke();
      }
    }
  }

  _mouth(c, m, e) {
    const p = this.p;
    const cx = 256, cy = 452;
    const smile = e.smile - e.sad * 0.9;
    const Wd = 35 * m.width * (1 - 0.32 * m.round) + smile * 3.5;
    const D = m.open * 44;
    const co = -smile * 6 + D * 0.18;
    const cyc = cy + co;
    const thin = clamp(1 - (m.width - 1) * 0.7, 0.7, 1.1); // 옆으로 당기면 입술이 얇아짐
    const upT = 8 * thin * (1 + m.round * 0.35) * (1 - m.press * 0.3);
    const loT = 10.5 * thin * (1 + m.round * 0.3) * (1 - m.press * 0.35);
    const uiY = cy - m.open * 3 - m.round * 1.5;
    const liY = cy + D - m.lipIn * 2;
    const Wi = Wd * (0.9 - m.round * 0.2);
    const icY = cyc + D * 0.06;
    const k = 0.5 + m.round * 0.38, k2 = 0.55 + m.round * 0.35;
    const cU = icY + (uiY - icY) * 4 / 3, cL = icY + (liY - icY) * 4 / 3;
    const du = uiY - cy;
    const lx = cx - Wd, rx = cx + Wd;

    const innerPath = () => {
      c.beginPath();
      c.moveTo(cx - Wi, icY);
      c.bezierCurveTo(cx - Wi * k, cU, cx + Wi * k, cU, cx + Wi, icY);
      c.bezierCurveTo(cx + Wi * k2, cL, cx - Wi * k2, cL, cx - Wi, icY);
      c.closePath();
    };
    const opening = liY - uiY;

    if (opening > 1.2) {
      innerPath();
      c.fillStyle = p.mouth; c.fill();
      c.save(); innerPath(); c.clip();
      // 목구멍 음영
      const tg = c.createRadialGradient(cx, cy + D * 0.5, 2, cx, cy + D * 0.5, Wi);
      tg.addColorStop(0, '#2c0b10'); tg.addColorStop(1, 'rgba(74,26,33,0)');
      c.fillStyle = tg; c.fillRect(cx - Wi, uiY - 4, Wi * 2, D + 12);
      // 혀
      if (m.tongue > 0.02) {
        const tipY = lerp(liY - D * 0.28 * m.tongue, uiY + 5, m.tUp);
        const tw = Wi * lerp(0.85, 0.6, m.tUp), tip = lerp(0.35, 0.12, m.tUp);
        c.globalAlpha = clamp(m.tongue * 1.4, 0, 1);
        const tgr = c.createLinearGradient(0, tipY, 0, liY + 8); tgr.addColorStop(0, '#e98a8f'); tgr.addColorStop(1, p.tongue);
        c.fillStyle = tgr;
        c.beginPath();
        c.moveTo(cx - tw, liY + 8);
        c.bezierCurveTo(cx - tw * 0.9, lerp(liY - 2, tipY + 10, m.tUp), cx - Wi * tip, tipY, cx, tipY);
        c.bezierCurveTo(cx + Wi * tip, tipY, cx + tw * 0.9, lerp(liY - 2, tipY + 10, m.tUp), cx + tw, liY + 8);
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(150,50,60,.35)'; c.lineWidth = 1.3;
        c.beginPath(); c.moveTo(cx, tipY + 4); c.lineTo(cx, liY + 6); c.stroke();
        c.globalAlpha = 1;
      }
      // 윗니
      if (m.uT > 0.02) {
        // 윗니: 입 안쪽 윗선(아치)을 따라 tb만큼 내려온 띠
        const tb = 1 + 9 * m.uT;
        c.fillStyle = p.teeth;
        c.beginPath();
        c.moveTo(cx - Wi, icY - 12);
        c.bezierCurveTo(cx - Wi * k, cU - 12, cx + Wi * k, cU - 12, cx + Wi, icY - 12);
        c.lineTo(cx + Wi, icY + tb * 0.5);
        c.bezierCurveTo(cx + Wi * k, cU + tb, cx - Wi * k, cU + tb, cx - Wi, icY + tb * 0.5);
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(120,90,90,.14)'; c.lineWidth = 1;
        c.beginPath();
        for (const x of [-6, 6, -16, 16, -25, 25]) { c.moveTo(cx + x, uiY - 6); c.lineTo(cx + x, uiY + tb * 0.8); }
        c.stroke();
      }
      // 아랫니
      if (m.lT > 0.02) {
        const tb = 1 + 6.5 * m.lT;
        c.fillStyle = '#f1ebe6';
        c.beginPath();
        c.moveTo(cx - Wi, icY + 14);
        c.bezierCurveTo(cx - Wi * k2, cL + 14, cx + Wi * k2, cL + 14, cx + Wi, icY + 14);
        c.lineTo(cx + Wi, icY - tb * 0.3);
        c.bezierCurveTo(cx + Wi * k2, cL - tb, cx - Wi * k2, cL - tb, cx - Wi, icY - tb * 0.3);
        c.closePath(); c.fill();
      }
      c.restore();
    }

    // 아랫입술
    const lg = c.createLinearGradient(0, liY, 0, liY + loT);
    lg.addColorStop(0, p.lipUpper); lg.addColorStop(0.5, p.lipLower); lg.addColorStop(1, p.lipUpper);
    c.fillStyle = lg;
    const loY = liY + loT;
    c.beginPath();
    c.moveTo(cx - Wi, icY);
    c.bezierCurveTo(cx - Wi * k2, cL, cx + Wi * k2, cL, cx + Wi, icY);
    c.lineTo(rx, cyc);
    c.bezierCurveTo(rx - Wd * 0.15, cyc + loT * 0.5 + D * 0.3, cx + Wd * 0.55, loY, cx, loY);
    c.bezierCurveTo(cx - Wd * 0.55, loY, lx + Wd * 0.15, cyc + loT * 0.5 + D * 0.3, lx, cyc);
    c.closePath(); c.fill();
    // 광택
    c.fillStyle = 'rgba(255,255,255,.3)';
    c.beginPath(); c.ellipse(cx + 2, liY + loT * 0.45, Wd * 0.22, loT * 0.18, 0, 0, Math.PI * 2); c.fill();

    // 윗입술
    const ug = c.createLinearGradient(0, cy + du - upT, 0, uiY);
    ug.addColorStop(0, p.lipUpper); ug.addColorStop(1, '#c9606b');
    c.fillStyle = ug;
    c.beginPath();
    c.moveTo(lx, cyc);
    c.bezierCurveTo(lx + Wd * 0.3, cyc - upT * 0.3 + du * 0.5, cx - 16, cy - upT - 1 + du, cx - 7, cy - upT - 1.5 + du);
    c.quadraticCurveTo(cx - 3, cy - upT - 1.5 + du, cx, cy - upT + 1.2 + du);
    c.quadraticCurveTo(cx + 3, cy - upT - 1.5 + du, cx + 7, cy - upT - 1.5 + du);
    c.bezierCurveTo(cx + 16, cy - upT - 1 + du, rx - Wd * 0.3, cyc - upT * 0.3 + du * 0.5, rx, cyc);
    c.lineTo(cx + Wi, icY);
    c.bezierCurveTo(cx + Wi * k, cU, cx - Wi * k, cU, cx - Wi, icY);
    c.closePath(); c.fill();

    // FV: 윗니가 아랫입술 위로
    if (m.lipIn > 0.05) {
      c.globalAlpha = clamp(m.lipIn, 0, 1);
      c.fillStyle = p.teeth;
      c.beginPath();
      c.moveTo(cx - Wi * 0.72, uiY - 1); c.lineTo(cx + Wi * 0.72, uiY - 1);
      c.lineTo(cx + Wi * 0.66, uiY + 5); c.quadraticCurveTo(cx, uiY + 7.5, cx - Wi * 0.66, uiY + 5);
      c.closePath(); c.fill();
      c.globalAlpha = 1;
    }

    // 입술 경계선/압착선
    if (opening <= 2.5) {
      c.strokeStyle = p.lipLine; c.lineWidth = 1.4 + m.press * 1.2;
      c.beginPath();
      c.moveTo(lx + 1, cyc);
      c.bezierCurveTo(cx - Wi * k, cU, cx + Wi * k, cU, rx - 1, cyc);
      c.stroke();
    }
    // 입꼬리
    c.strokeStyle = 'rgba(160,80,80,.4)'; c.lineWidth = 1.4;
    const cr = smile * 3;
    c.beginPath();
    c.moveTo(lx - 1, cyc); c.quadraticCurveTo(lx - 4, cyc - 1 - cr, lx - 5, cyc - 3 - cr);
    c.moveTo(rx + 1, cyc); c.quadraticCurveTo(rx + 4, cyc - 1 - cr, rx + 5, cyc - 3 - cr);
    c.stroke();
    // 인중 음영
    c.strokeStyle = 'rgba(210,140,125,.25)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(cx - 5, 420); c.lineTo(cx - 6, cy - upT + du - 3); c.moveTo(cx + 5, 420); c.lineTo(cx + 6, cy - upT + du - 3); c.stroke();
  }
}

if (typeof window !== 'undefined') {
  window.Character2DCanvas = Character2DCanvas;
  window.Character2DCanvas.buildVisemeTimeline = buildVisemeTimeline;
  window.Character2DCanvas.VISEMES = VISEMES;
  window.Character2DCanvas.EXPRESSIONS = EXPRESSIONS;
}



})();
