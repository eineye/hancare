'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { AvatarState } from '@/lib/store';

interface Avatar3DProps {
  state: AvatarState;
  /** 이 값이 바뀔 때마다(단어 경계) 입을 한 번 더 크게 벌리는 "펄스"를 준다. */
  pulseToken: number;
  closeup: boolean;
}

// 실제 오디오 볼륨 분석이 아닌 근사치임을 문서화한다:
// speechSynthesis가 재생하는 음성은 브라우저 표준으로는 Web Audio API의
// AnalyserNode에 연결할 방법이 없다(OS/브라우저 오디오 파이프라인 밖에서 재생됨).
// 그래서 실제 파형 대신, utterance의 onboundary(단어 경계) 이벤트가 올 때마다
// "펄스"를 주고 프레임마다 감쇠시켜 입을 움직인다 — 실제 목소리 크기가 아니라
// 말하는 리듬(단어 단위)에 반응하는 근사 립싱크다. docs/PROGRAM_DESIGN.md §11 참고.
export default function Avatar3D({ state, pulseToken, closeup }: Avatar3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const closeupRef = useRef(closeup);
  const intensityRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    closeupRef.current = closeup;
  }, [closeup]);
  useEffect(() => {
    // 새 단어 경계마다 입 벌림 강도를 최대치로 끌어올린다(프레임 루프에서 감쇠).
    intensityRef.current = 1;
  }, [pulseToken]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(2, 3, 4);
    scene.add(key);

    const head = new THREE.Group();
    scene.add(head);

    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xfaf7ef, roughness: 0.7 }),
    );
    head.add(headMesh);

    const eyeGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f2e24 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.5, 0.25, 1.28);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.5;
    head.add(eyeL, eyeR);

    // 입: 아래쪽이 고정된 채(턱 힌지처럼) 세로로만 늘어나 보이도록 pivot을
    // 입 상단에 두고, 메시는 그 아래로 그린다.
    const mouthPivot = new THREE.Group();
    mouthPivot.position.set(0, -0.55, 1.3);
    head.add(mouthPivot);
    const mouthMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.32, 0.05, 4, 12),
      new THREE.MeshStandardMaterial({ color: 0xa8433f, roughness: 0.5 }),
    );
    mouthMesh.rotation.z = Math.PI / 2;
    mouthMesh.position.y = -0.08;
    mouthPivot.add(mouthMesh);

    let raf = 0;
    const clock = new THREE.Clock();

    function animate() {
      const t = clock.getElapsedTime();
      const dt = clock.getDelta();
      const s = stateRef.current;

      // 유휴 상태의 자연스러운 흔들림(숨쉬는 느낌)
      head.position.y = Math.sin(t * 1.1) * 0.03;
      head.rotation.y = Math.sin(t * 0.5) * 0.1;
      head.rotation.x = Math.sin(t * 0.7) * 0.03;

      if (s === 'speaking') {
        // 펄스는 프레임마다 지수 감쇠, 그 위에 짧은 떨림을 얹어 기계적으로
        // 보이지 않게 한다.
        intensityRef.current *= Math.exp(-dt * 6);
        const wobble = (Math.sin(t * 24) * 0.5 + 0.5) * 0.35;
        const open = Math.min(1, intensityRef.current * (0.65 + wobble));
        mouthPivot.scale.set(1 - open * 0.15, 0.3 + open * 1.5, 1);
      } else if (s === 'listening') {
        intensityRef.current = 0;
        const pulse = (Math.sin(t * 2) * 0.5 + 0.5) * 0.15;
        mouthPivot.scale.set(1, 0.4 + pulse, 1);
      } else {
        intensityRef.current = 0;
        mouthPivot.scale.set(1, 0.3, 1);
      }

      const targetZ = closeupRef.current ? 3.4 : 6;
      camera.position.z += (targetZ - camera.position.z) * 0.08;
      camera.position.y += ((closeupRef.current ? -0.15 : 0) - camera.position.y) * 0.08;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    function handleResize() {
      if (!mount) return;
      const w = mount.clientWidth || width;
      const h = mount.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      mount.removeChild(renderer.domElement);
      headMesh.geometry.dispose();
      (headMesh.material as THREE.Material).dispose();
      eyeGeo.dispose();
      eyeMat.dispose();
      mouthMesh.geometry.dispose();
      (mouthMesh.material as THREE.Material).dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="h-full w-full" />;
}
