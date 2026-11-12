// 먹물 방울: 적이 맺어지면 튀어나와 주인공에게 빨려 든다.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { F } from '../world/field.js';
import { basicMat } from '../gfx/materials.js';
import { P } from '../gfx/particles.js';
import { rand } from '../core/util.js';

const CAP = 90, _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

export function createLoot() {
  const mesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.11, 0), basicMat({ vertexColors: false, color: 0x1c2740 }, { keep: true }), CAP);
  mesh.frustumCulled = false; mesh.count = 0; G.gfx.scene.add(mesh);
  const items = [];
  let streak = 0, streakT = 0;
  return {
    ink(pos, amount) {
      const n = Math.max(1, Math.min(10, Math.round(amount / 7))), v = amount / n;
      for (let i = 0; i < n && items.length < CAP; i++) {
        const a = rand(6.28), s = rand(1.5, 4.5);
        items.push({ x: pos.x, y: pos.y + 0.6, z: pos.z, vx: Math.cos(a) * s, vy: rand(4, 7.5), vz: Math.sin(a) * s, t: 0, v, delay: rand(0.45, 0.8) });
      }
    },
    clear() { items.length = 0; mesh.count = 0; },
    update(dt) {
      const p = G.player; streakT -= dt; if (streakT <= 0) streak = 0;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]; it.t += dt;
        if (it.t < it.delay) {
          it.vy -= 20 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
          const gy = F.hr(it.x, it.z) + 0.15; if (it.y < gy) { it.y = gy; it.vy *= -0.45; it.vx *= 0.6; it.vz *= 0.6; }
        } else {
          const tx = p.pos.x, ty = p.pos.y + 1.0, tz = p.pos.z, dx = tx - it.x, dy = ty - it.y, dz = tz - it.z, d = Math.hypot(dx, dy, dz) || 1;
          const sp = 9 + (it.t - it.delay) * 34;
          if (d < 0.55 || d < sp * dt) {
            items.splice(i, 1);
            if (G.prog) G.prog.addInk(it.v);
            streak++; streakT = 0.5; G.audio.play('pickup', { n: streak });
            _p.set(tx, ty, tz); P.sparks(_p, 2, 3, 0x6f8fb8);
            continue;
          }
          it.x += (dx / d) * sp * dt; it.y += (dy / d) * sp * dt; it.z += (dz / d) * sp * dt;
        }
      }
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        mesh.setMatrixAt(i, _m.compose(_p.set(it.x, it.y, it.z), _q.setFromEuler(_e.set(it.t * 5, it.t * 7, 0)), _s.set(1, 1.4, 1)));
      }
      mesh.count = items.length; mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
