'use client';

import { useEffect, useRef, useState } from 'react';
import type { AvatarState } from '@/lib/store';

interface Avatar2DProps {
  state: AvatarState;
  /** 이 값이 바뀔 때마다(단어 경계) 입모양을 한 번 바꾼다. */
  pulseToken: number;
  closeup: boolean;
}

// 애니메이션 업계에서 흔히 쓰는 "음소 그룹별 입모양(viseme)" 관례를 참고해
// 직접 그린 오리지널 입모양 6종. 실제 발음을 정밀 분석해 골라주는 것이 아니라
// (Web Speech API는 음소 타이밍을 주지 않는다) 말하는 동안 단어 경계마다
// 무작위로 하나를 골라 보여주는 근사치다 — 그래도 매번 같은 모양만 반복하는
// 것보다는 훨씬 "말하는 것처럼" 보인다.
type MouthShape = 'closed' | 'wideOpen' | 'round' | 'teeth' | 'smile' | 'fv';

const SPEAKING_SHAPES: MouthShape[] = ['wideOpen', 'round', 'teeth', 'smile', 'fv'];

const LIP = '#b6534e';
const CAVITY = '#5b211d';

function Mouth({ shape }: { shape: MouthShape }) {
  switch (shape) {
    case 'wideOpen': // A, E, I 계열 — 크게 벌어진 입
      return (
        <g>
          <path d="M72 120 Q100 106 128 120 Q126 158 100 160 Q74 158 72 120 Z" fill={CAVITY} />
          <rect x={80} y={116} width={40} height={9} rx={3.5} fill="#fff" />
        </g>
      );
    case 'round': // U, Q/W 계열 — 오므린 입
      return <ellipse cx={100} cy={132} rx={13} ry={15} fill={CAVITY} stroke={LIP} strokeWidth={6} />;
    case 'teeth': // C,D,N,S,T,Th 계열 — 이가 살짝 보이는 좁은 입
      return (
        <g>
          <rect x={75} y={125} width={50} height={13} rx={6} fill={CAVITY} />
          <rect x={78} y={126} width={44} height={5} rx={2.5} fill="#fff" />
        </g>
      );
    case 'smile': // E, G/K 계열 — 옆으로 넓게 웃는 입
      return (
        <g>
          <path d="M68 124 Q100 114 132 124 Q129 138 100 140 Q71 138 68 124 Z" fill={CAVITY} />
          <rect x={75} y={121} width={50} height={7} rx={3.5} fill="#fff" />
        </g>
      );
    case 'fv': // F, V 계열 — 윗니가 아랫입술에 닿은 모양
      return (
        <g>
          <rect x={77} y={129} width={46} height={11} rx={5} fill={LIP} />
          <rect x={81} y={123} width={38} height={7} rx={3.5} fill="#fff" />
        </g>
      );
    case 'closed':
    default: // B, M, P 계열 — 다문 입
      return <rect x={78} y={130} width={44} height={7} rx={3.5} fill={LIP} />;
  }
}

export default function Avatar2D({ state, pulseToken, closeup }: Avatar2DProps) {
  const [shape, setShape] = useState<MouthShape>('closed');
  const [blink, setBlink] = useState(false);
  const lastShapeRef = useRef<MouthShape>('closed');
  const initialRender = useRef(true);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    if (state !== 'speaking') return;
    let next = SPEAKING_SHAPES[Math.floor(Math.random() * SPEAKING_SHAPES.length)];
    if (next === lastShapeRef.current) {
      next = SPEAKING_SHAPES[(SPEAKING_SHAPES.indexOf(next) + 1) % SPEAKING_SHAPES.length];
    }
    lastShapeRef.current = next;
    setShape(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseToken]);

  useEffect(() => {
    if (state !== 'speaking') {
      setShape('closed');
      lastShapeRef.current = 'closed';
    }
  }, [state]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setBlink(true);
      timeout = setTimeout(() => setBlink(false), 130);
    }, 2800 + Math.random() * 2000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      className={`flex h-full w-full items-center justify-center transition-transform duration-300 motion-reduce:transition-none ${closeup ? 'scale-125' : ''}`}
    >
      <svg viewBox="0 0 200 200" className="h-[72%] w-[72%]" role="img" aria-label="AI 아바타 선생님 얼굴">
        {state === 'listening' && (
          <circle
            cx={100}
            cy={100}
            r={90}
            fill="none"
            stroke="#fff"
            strokeWidth={3}
            opacity={0.5}
            className="motion-safe:animate-pulse"
          />
        )}
        <circle cx={100} cy={100} r={80} fill="#faf7ef" />
        <ellipse cx={72} cy={88} rx={9} ry={blink ? 1.2 : 9} fill="#0f2e24" style={{ transition: 'ry 90ms ease' }} />
        <ellipse cx={128} cy={88} rx={9} ry={blink ? 1.2 : 9} fill="#0f2e24" style={{ transition: 'ry 90ms ease' }} />
        <Mouth shape={state === 'speaking' ? shape : 'closed'} />
      </svg>
    </div>
  );
}
