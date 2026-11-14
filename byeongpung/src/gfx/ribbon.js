// 나부끼는 띠(주인공의 쪽빛 목도리): 점 사슬을 베를레 적분으로 흔들고 띠 모양 메시로 그린다.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { basicMat } from './materials.js';

const _t = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

export function createRibbon(color, n = 10, seg = 0.15, width = 0.15) {
  const P = [], Q = []; for (let i = 0; i < n; i++) { P.push(new THREE.Vector3()); Q.push(new THREE.Vector3()); }
  const pos = new Float32Array(n * 6), idx = [];
  for (let i = 0; i < n - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, basicMat({ vertexColors: false, color, side: THREE.DoubleSide }, { keep: true }));
  mesh.frustumCulled = false; G.gfx.scene.add(mesh);
  let init = false;
  return {
    mesh,
    reset() { init = false; },
    // anchor: 매인 곳(세계 좌표), back: 몸 뒤쪽 방향, groundY: 발밑 높이
    update(dt, anchor, back, groundY) {
      if (!init) { init = true; for (let i = 0; i < n; i++) { P[i].copy(anchor).addScaledVector(back, i * seg * 0.5); P[i].y -= i * seg * 0.8; Q[i].copy(P[i]); } }
      const h = Math.min(dt, 0.034), t = G.time;
      P[0].copy(anchor); Q[0].copy(anchor);
      for (let i = 1; i < n; i++) {
        const p = P[i], q = Q[i];
        _t.copy(p).sub(q).multiplyScalar(0.93); q.copy(p);
        p.add(_t); p.y -= 7.5 * h * h * 60 * 0.016;
        p.addScaledVector(back, 0.0016 * (1 + i * 0.1));
        p.x += Math.sin(t * 5.1 + i * 0.8) * 0.0025; p.z += Math.cos(t * 4.3 + i * 0.7) * 0.0025;
      }
      for (let k = 0; k < 3; k++) for (let i = 1; i < n; i++) { // 마디 길이 지키기
        _t.copy(P[i]).sub(P[i - 1]); const d = _t.length() || 1e-4; P[i].addScaledVector(_t, (seg - d) / d);
        if (P[i].y < groundY + 0.04) P[i].y = groundY + 0.04;
      }
      for (let i = 0; i < n; i++) {
        _t.copy(P[Math.min(n - 1, i + 1)]).sub(P[Math.max(0, i - 1)]).normalize();
        _s.crossVectors(_t, _up); if (_s.lengthSq() < 0.01) _s.set(back.z, 0, -back.x); _s.normalize().multiplyScalar(width * 0.5 * (1 - (i / n) * 0.55));
        const k = i * 6; pos[k] = P[i].x - _s.x; pos[k + 1] = P[i].y - _s.y; pos[k + 2] = P[i].z - _s.z; pos[k + 3] = P[i].x + _s.x; pos[k + 4] = P[i].y + _s.y + 0.02; pos[k + 5] = P[i].z + _s.z;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
