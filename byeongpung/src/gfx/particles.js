// 입자(먹 방울·종이 조각·불티·먹 번짐)와 땅의 먹 얼룩. 모두 인스턴싱 + 재사용 풀.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { F } from '../world/field.js';
import { basicMat, patch } from './materials.js';
import { splatAtlas, blotTexture } from './textures.js';
import { HEX } from './palette.js';
import { rand } from '../core/util.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0), _n = new THREE.Vector3(), _v = new THREE.Vector3();

class Pool {
  constructor(scene, geo, mat, cap, kind) {
    this.cap = cap; this.n = 0; this.kind = kind;
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.renderOrder = kind === 'puff' ? 3 : 0;
    this.mesh.setColorAt(0, _c.set(0xffffff));
    this.px = new Float32Array(cap * 3); this.vx = new Float32Array(cap * 3);
    this.rot = new Float32Array(cap * 3); this.spin = new Float32Array(cap * 3);
    this.life = new Float32Array(cap); this.max = new Float32Array(cap); this.size = new Float32Array(cap);
    this.grav = new Float32Array(cap); this.drag = new Float32Array(cap); this.flag = new Uint8Array(cap);
    scene.add(this.mesh);
  }
  spawn(x, y, z, vx, vy, vz, size, life, color, grav = 14, drag = 0.5, flag = 0) {
    let i = this.n;
    if (i >= this.cap) { i = (Math.random() * this.cap) | 0; } else this.n++;
    const k = i * 3;
    this.px[k] = x; this.px[k + 1] = y; this.px[k + 2] = z; this.vx[k] = vx; this.vx[k + 1] = vy; this.vx[k + 2] = vz;
    this.rot[k] = rand(6.28); this.rot[k + 1] = rand(6.28); this.rot[k + 2] = rand(6.28);
    this.spin[k] = rand(-9, 9); this.spin[k + 1] = rand(-9, 9); this.spin[k + 2] = rand(-9, 9);
    this.life[i] = life; this.max[i] = life; this.size[i] = size; this.grav[i] = grav; this.drag[i] = drag; this.flag[i] = flag;
    this.mesh.setColorAt(i, _c.set(color));
  }
  update(dt, camQ) {
    const { px, vx, rot, spin, life, max, size, grav, drag, flag, kind } = this;
    for (let i = this.n - 1; i >= 0; i--) {
      life[i] -= dt;
      const k = i * 3;
      if (life[i] <= 0) { this.kill(i); continue; }
      const dr = Math.exp(-drag[i] * dt);
      vx[k] *= dr; vx[k + 2] *= dr; vx[k + 1] = vx[k + 1] * dr - grav[i] * dt;
      px[k] += vx[k] * dt; px[k + 1] += vx[k + 1] * dt; px[k + 2] += vx[k + 2] * dt;
      if (kind !== 'puff' && vx[k + 1] < 0) {
        const gy = F.hr(px[k], px[k + 2]);
        if (px[k + 1] < gy + 0.03) {
          if (flag[i] === 1) { if (Math.random() < 0.5) P.splat(px[k], px[k + 2], size[i] * rand(5, 11)); this.kill(i); continue; }
          px[k + 1] = gy + 0.03; vx[k] *= 0.4; vx[k + 2] *= 0.4; vx[k + 1] = 0; spin[k] *= 0.3; spin[k + 1] *= 0.3; spin[k + 2] *= 0.3;
        }
      }
    }
    for (let i = 0; i < this.n; i++) {
      const k = i * 3, u = life[i] / max[i];
      _p.set(px[k], px[k + 1], px[k + 2]);
      if (kind === 'puff') { _q.copy(camQ); const s = size[i] * (flag[i] === 2 ? (1 - u) * 1.0 + 0.25 : Math.sin(Math.min(1, (1 - u) * 1.6) * Math.PI * 0.5) * (u < 0.4 ? u / 0.4 : 1)); _s.set(s, s, s); }
      else if (kind === 'spark') {
        _v.set(vx[k], vx[k + 1], vx[k + 2]); const sp = _v.length() || 1;
        _q.setFromUnitVectors(_up, _v.multiplyScalar(1 / sp)); _s.set(size[i] * u, size[i] * Math.min(9, 1 + sp * 0.09) * (0.3 + u), size[i] * u);
      } else {
        rot[k] += spin[k] * dt; rot[k + 1] += spin[k + 1] * dt; rot[k + 2] += spin[k + 2] * dt;
        _q.setFromEuler(_e.set(rot[k], rot[k + 1], rot[k + 2])); const s = size[i] * Math.min(1, u * 3.5); _s.set(s, s, s);
      }
      this.mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  kill(i) {
    const l = --this.n; if (i === l) return;
    const k = i * 3, j = l * 3;
    for (const a of [this.px, this.vx, this.rot, this.spin]) { a[k] = a[j]; a[k + 1] = a[j + 1]; a[k + 2] = a[j + 2]; }
    for (const a of [this.life, this.max, this.size, this.grav, this.drag, this.flag]) a[i] = a[l];
    this.mesh.getColorAt(l, _c); this.mesh.setColorAt(i, _c);
  }
}

export const P = {};
export function createParticles() {
  const scene = G.gfx.scene;
  const solid = basicMat({ vertexColors: false }, { keep: true });
  const dbl = basicMat({ vertexColors: false, side: THREE.DoubleSide }, { keep: true });
  const puffMat = patch(new THREE.MeshBasicMaterial({ map: blotTexture(true), transparent: true, depthWrite: false, opacity: 0.85 }), { keep: true });
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.3, 0, 0.5, -0.4, 0, 0.1, 0.55, 0], 3)); tri.computeVertexNormals();
  const ink = new Pool(scene, new THREE.OctahedronGeometry(0.5, 0), solid, 420, 'ink');
  const paper = new Pool(scene, tri, dbl, 300, 'paper');
  const spark = new Pool(scene, new THREE.BoxGeometry(0.5, 1, 0.5), solid, 160, 'spark');
  const puff = new Pool(scene, new THREE.PlaneGeometry(1, 1), puffMat, 120, 'puff');
  // 땅 얼룩: 아틀라스 4칸 → 메시 4개
  const atlas = splatAtlas(); const splats = [];
  for (let k = 0; k < 4; k++) {
    const t = atlas.clone(); t.repeat.set(0.5, 0.5); t.offset.set((k % 2) * 0.5, ((k / 2) | 0) * 0.5); t.needsUpdate = true;
    const mat = patch(new THREE.MeshBasicMaterial({ map: t, color: HEX.ink, transparent: true, depthWrite: false, opacity: 0.82, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { keep: true });
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    const im = new THREE.InstancedMesh(g, mat, 28); im.frustumCulled = false; im.count = 0; im.renderOrder = 1; scene.add(im);
    splats.push({ im, n: 0, life: new Float32Array(28), data: new Float32Array(28 * 5), next: 0 });
  }
  Object.assign(P, {
    ink, paper, spark, puff,
    // 먹 방울 튀기기. dir: 주된 방향(Vector3 또는 null)
    inkBurst(pos, n, speed = 6, dir = null, color = HEX.ink, up = 3) {
      for (let i = 0; i < n; i++) {
        const a = rand(6.28), s = rand(0.25, 1) * speed;
        let vx = Math.cos(a) * s, vz = Math.sin(a) * s;
        if (dir) { vx = vx * 0.55 + dir.x * speed * rand(0.5, 1.1); vz = vz * 0.55 + dir.z * speed * rand(0.5, 1.1); }
        ink.spawn(pos.x + rand(-0.2, 0.2), pos.y + rand(-0.2, 0.3), pos.z + rand(-0.2, 0.2), vx, rand(0.5, 1.6) * up, vz, rand(0.05, 0.16), rand(0.6, 1.3), color, 16, 0.6, 1);
      }
    },
    paperBurst(pos, n, speed = 5, color = HEX.white) {
      for (let i = 0; i < n; i++) {
        const a = rand(6.28), s = rand(0.3, 1) * speed;
        paper.spawn(pos.x, pos.y + rand(-0.2, 0.4), pos.z, Math.cos(a) * s, rand(1, 4.5), Math.sin(a) * s, rand(0.1, 0.24), rand(0.9, 2.0), color, 5.5, 1.8, 0);
      }
    },
    sparks(pos, n, speed = 12, color = HEX.white, dir = null) {
      for (let i = 0; i < n; i++) {
        let vx = rand(-1, 1), vy = rand(-0.3, 1), vz = rand(-1, 1); const l = Math.hypot(vx, vy, vz) || 1, s = speed * rand(0.5, 1.2);
        vx = (vx / l) * s; vy = (vy / l) * s; vz = (vz / l) * s;
        if (dir) { vx += dir.x * speed * 0.7; vz += dir.z * speed * 0.7; }
        spark.spawn(pos.x, pos.y, pos.z, vx, vy, vz, rand(0.03, 0.06), rand(0.12, 0.26), color, 8, 3, 0);
      }
    },
    puffs(pos, n, size = 1, color = HEX.inkSoft, spread = 0.5, rise = 0.6) {
      for (let i = 0; i < n; i++) puff.spawn(pos.x + rand(-spread, spread), pos.y + rand(0, spread), pos.z + rand(-spread, spread), rand(-1, 1) * spread, rand(0.2, 1) * rise, rand(-1, 1) * spread, size * rand(0.6, 1.3), rand(0.35, 0.8), color, -0.4, 2.2, 0);
    },
    // 발밑 먼지(옅은 담묵)
    dust(pos, n = 2, size = 0.5) { for (let i = 0; i < n; i++) puff.spawn(pos.x + rand(-0.2, 0.2), pos.y + 0.08, pos.z + rand(-0.2, 0.2), rand(-0.6, 0.6), rand(0.2, 0.7), rand(-0.6, 0.6), size * rand(0.7, 1.2), rand(0.3, 0.55), 0x9c978a, -0.2, 2.5, 2); },
    splat(x, z, size = 1) {
      const sp = splats[(Math.random() * 4) | 0]; const i = sp.next; sp.next = (sp.next + 1) % 28; if (sp.n < 28) sp.n++;
      sp.life[i] = rand(9, 16); const d = sp.data; d[i * 5] = x; d[i * 5 + 1] = z; d[i * 5 + 2] = size; d[i * 5 + 3] = rand(6.28); d[i * 5 + 4] = 0;
    },
    update(dt, rdt) {
      const cq = G.gfx.camera.quaternion;
      ink.update(dt, cq); paper.update(dt, cq); spark.update(dt, cq); puff.update(dt, cq);
      for (const sp of splats) {
        for (let i = 0; i < sp.n; i++) {
          const d = sp.data; sp.life[i] -= dt; d[i * 5 + 4] = Math.min(1, d[i * 5 + 4] + dt * 9);
          const x = d[i * 5], z = d[i * 5 + 1], life = sp.life[i];
          const s = life <= 0 ? 0 : d[i * 5 + 2] * (0.35 + 0.65 * d[i * 5 + 4]) * Math.min(1, life / 2);
          const y = F.hr(x, z);
          _n.set(F.hr(x - 0.5, z) - F.hr(x + 0.5, z), 1, F.hr(x, z - 0.5) - F.hr(x, z + 0.5)).normalize();
          _q.setFromUnitVectors(_up, _n); _q.multiply(_qy.setFromAxisAngle(_up, d[i * 5 + 3]));
          sp.im.setMatrixAt(i, _m.compose(_p.set(x, y + 0.045, z), _q, _s.set(s, s, s)));
        }
        sp.im.count = sp.n; sp.im.instanceMatrix.needsUpdate = true;
      }
    },
  });
  return P;
}
const _qy = new THREE.Quaternion();
