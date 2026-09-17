'use client';

/**
 * XR실습 화면의 '3D 뷰포트' 자리. 실제 Three.js/WebGL 뷰어(docs/XR_MODULE_DESIGN.md
 * 로드맵 Phase 2)가 들어오기 전까지, 없다는 사실을 숨기지 않고 와이어프레임
 * 미리보기로 표현한다. 병상+환자를 아주 단순한 선화로 그린 장식용 SVG다.
 */
export default function XrViewportScene({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className="relative aspect-[16/10] overflow-hidden rounded-2xl shadow-sm"
      style={{
        background: '#07140f',
        backgroundImage:
          'linear-gradient(rgba(124,255,178,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(124,255,178,.10) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      <span className="absolute left-4 top-3.5 rounded-lg border border-dashed border-emerald-700 px-2 py-1 font-mono text-[10px] tracking-wider text-emerald-700">
        3D VIEWPORT · WIREFRAME PREVIEW
      </span>
      <svg
        viewBox="0 0 400 230"
        fill="none"
        stroke="#7cffb2"
        strokeWidth="1.4"
        opacity={0.85}
        className="absolute inset-0 h-full w-full"
      >
        <rect x="26" y="150" width="230" height="46" rx="6" />
        <line x1="26" y1="168" x2="256" y2="168" />
        <rect x="14" y="112" width="16" height="88" rx="3" />
        <rect x="252" y="128" width="14" height="72" rx="3" />
        <line x1="40" y1="196" x2="40" y2="212" />
        <line x1="242" y1="196" x2="242" y2="212" />
        <ellipse cx="150" cy="150" rx="78" ry="17" />
        <rect x="70" y="128" width="46" height="24" rx="10" />
        <circle cx="92" cy="132" r="15" />
        <line x1="320" y1="40" x2="320" y2="150" strokeDasharray="2 4" />
        <circle cx="320" cy="36" r="7" />
        <rect x="340" y="70" width="46" height="34" rx="4" />
        <polyline points="344,90 352,90 356,78 362,100 368,84 372,90 382,90" />
      </svg>
      {children}
    </div>
  );
}
