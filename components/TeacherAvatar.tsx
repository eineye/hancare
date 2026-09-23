'use client';

// React 래퍼 — 한글학습 화면의 AI 아바타 선생님 캐릭터.
// 엔진 본체는 lib/teacher2d/character2d-canvas.js(외부에서 받은 그대로, 의존성 없는
// Canvas 2D 벡터 캐릭터 + 한국어 자모 분해 기반 립싱크)이며, 이 파일은 그 엔진을
// React 생명주기에 연결하는 얇은 래퍼일 뿐이다.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
// 벤더 JS 엔진이라 타입 선언이 없다 — 공개 메서드는 아래 TeacherAvatarHandle로 좁혀서 노출한다.
import { Character2DCanvas } from '@/lib/teacher2d/character2d-canvas.js';

export type TeacherExpression = 'neutral' | 'smile' | 'talking' | 'surprised' | 'sad' | 'wink';

export interface TeacherAvatarHandle {
  speak: (text: string, opts?: { rate?: number; pitch?: number; voiceName?: string }) => Promise<void> | undefined;
  speakAudio: (src: string | Blob, text: string, opts?: Record<string, unknown>) => Promise<void> | undefined;
  playText: (text: string, opts?: { msPerSyllable?: number }) => Promise<void> | undefined;
  stop: () => void;
  setExpression: (name: TeacherExpression) => void;
  instance: unknown;
}

interface TeacherAvatarProps {
  expression?: TeacherExpression;
  options?: Record<string, unknown>;
  onStart?: () => void;
  onEnd?: () => void;
  onViseme?: (v: unknown) => void;
  onWarning?: (w: { code: string; message: string }) => void;
  style?: React.CSSProperties;
  className?: string;
}

const TeacherAvatar = forwardRef<TeacherAvatarHandle, TeacherAvatarProps>(function TeacherAvatar(
  { expression = 'neutral', options = {}, onStart, onEnd, onViseme, onWarning, style, className },
  ref,
) {
  const box = useRef<HTMLDivElement>(null);
  const inst = useRef<InstanceType<typeof Character2DCanvas> | null>(null);

  useEffect(() => {
    const t = new Character2DCanvas({ container: box.current ?? undefined, ...options });
    inst.current = t;
    const offs = [
      onStart && t.on('start', onStart),
      onEnd && t.on('end', onEnd),
      onViseme && t.on('viseme', onViseme),
      onWarning && t.on('warning', onWarning),
    ].filter(Boolean) as Array<() => void>;
    return () => {
      offs.forEach((f) => f());
      t.destroy();
      inst.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    inst.current?.setExpression(expression);
  }, [expression]);

  useImperativeHandle(
    ref,
    () => ({
      speak: (text, o) => inst.current?.speak(text, o),
      speakAudio: (src, text, o) => inst.current?.speakAudio(src, text, o),
      playText: (text, o) => inst.current?.playText(text, o),
      stop: () => inst.current?.stop(),
      setExpression: (n) => inst.current?.setExpression(n),
      get instance() {
        return inst.current;
      },
    }),
    [],
  );

  return <div ref={box} className={className} style={{ width: '100%', height: '100%', ...style }} />;
});

export default TeacherAvatar;
