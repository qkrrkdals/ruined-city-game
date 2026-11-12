// 낙관: 맺음의 순간 붉은 도장이 쾅 찍힌다.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { sealTexture } from './textures.js';
import { ease, rand } from '../core/util.js';

export function createStamp() {
  const pool = [], tex = {};
  const getTex = (text) => tex[text] || (tex[text] = sealTexture(text, 256));
  function get() {
    let s = pool.find((x) => !x.on);
    if (!s) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, fog: false })); sp.renderOrder = 20; G.gfx.scene.add(sp); s = { sp, on: false, t: 0 }; pool.push(s); }
    return s;
  }
  const api = (pos, kill = true, text, size = 0.95) => {
    const s = get(); s.on = true; s.t = 0; s.size = size * (kill ? 1 : 1.25); s.sp.visible = true;
    s.sp.material.map = getTex(text || G.text.ui.sealFinish); s.sp.material.rotation = rand(-0.22, 0.22); s.sp.material.opacity = 1; s.sp.material.needsUpdate = true;
    s.sp.position.copy(pos);
  };
  api.update = (rdt) => {
    for (const s of pool) {
      if (!s.on) continue; s.t += rdt;
      const k = s.t < 0.1 ? 2.6 - 1.6 * ease.out3(s.t / 0.1) : 1 + Math.max(0, 0.1 - (s.t - 0.1)) * 1.2;
      s.sp.scale.setScalar(s.size * k); s.sp.position.y += rdt * 0.12;
      if (s.t > 0.75) { s.sp.material.opacity = Math.max(0, 1 - (s.t - 0.75) / 0.4); if (s.t > 1.15) { s.on = false; s.sp.visible = false; } }
    }
  };
  return api;
}
