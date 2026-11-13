// 마을 사람들과 까치 소식. 사람은 도포 차림의 간단한 모델, 까치는 날아다니며 길을 이끈다.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { F } from '../world/field.js';
import { box, cyl, cone, ico, merge, seedGeo, tris } from '../gfx/geo.js';
import { entityMat, MAT } from '../gfx/materials.js';
import { HEX } from '../gfx/palette.js';
import { dampAngle, lerp, clamp01, ease } from '../core/util.js';

const SKIN = 0xf0dcc0;
function person(kind) {
  seedGeo(kind.length * 53);
  const b = [], h = [];
  const robe = { elder: 0xf4f0e4, granny: 0x9a8a78, scholar: 0xb4cdc0, kid: 0xe8d9a0 }[kind];
  b.push(cyl(0.2, kind === 'granny' ? 0.5 : 0.42, 1.28, 7, robe, { p: [0, 0.66, 0] }, 0.07));                       // 도포 자락
  b.push(cyl(0.23, 0.2, 0.34, 6, kind === 'granny' ? 0xe4dcc8 : robe, { p: [0, 1.38, 0], s: [1.15, 1, 0.8] }, 0.06)); // 어깨
  for (const s of [-1, 1]) b.push(box(0.17, 0.5, 0.2, kind === 'kid' ? (s < 0 ? HEX.red : 0x6f9a62) : robe, { p: [s * 0.24, 1.12, 0.12], r: [-0.55, 0, s * 0.18] }, 0.07)); // 소매
  b.push(box(0.2, 0.09, 0.16, SKIN, { p: [0, 0.98, 0.27] }));                                                        // 맞잡은 손
  b.push(box(0.28, 0.05, 0.02, kind === 'scholar' ? HEX.indigo : kind === 'kid' ? HEX.red : 0x3a3a42, { p: [0, 1.22, 0.17] }));
  h.push(ico(0.15, 1, SKIN, { p: [0, 0.12, 0] }, 0.03), cyl(0.06, 0.07, 0.1, 5, SKIN, { p: [0, -0.04, 0] }));
  h.push(box(0.03, 0.02, 0.02, 0x15151b, { p: [-0.055, 0.14, 0.14] }, 0), box(0.03, 0.02, 0.02, 0x15151b, { p: [0.055, 0.14, 0.14] }, 0));
  if (kind === 'elder') { h.push(cyl(0.44, 0.44, 0.02, 10, 0x15151b, { p: [0, 0.24, 0] }), cyl(0.12, 0.14, 0.2, 7, 0x15151b, { p: [0, 0.34, 0] }), cone(0.07, 0.24, 4, 0xf4f0e4, { p: [0, -0.04, 0.12], r: [Math.PI + 0.2, 0, 0] })); }
  if (kind === 'granny') { h.push(ico(0.155, 0, 0xc9c5bd, { p: [0, 0.15, -0.03] }, 0.04), ico(0.07, 0, 0xc9c5bd, { p: [0, 0.1, -0.17] }), box(0.2, 0.015, 0.015, HEX.gold, { p: [0, 0.1, -0.18] })); }
  if (kind === 'scholar') { h.push(box(0.26, 0.14, 0.2, 0x15151b, { p: [0, 0.3, 0] }), box(0.2, 0.1, 0.16, 0x15151b, { p: [0, 0.41, 0] }), box(0.13, 0.08, 0.1, 0x15151b, { p: [0, 0.49, 0] })); b.push(box(0.2, 0.26, 0.05, 0x6a5a48, { p: [0, 1.02, 0.36], r: [-0.5, 0, 0] })); }
  if (kind === 'kid') { h.push(ico(0.155, 0, 0x1c1c22, { p: [0, 0.16, -0.03] }, 0.04), box(0.05, 0.4, 0.05, 0x1c1c22, { p: [0, -0.1, -0.16], r: [0.2, 0, 0] }), box(0.07, 0.07, 0.07, HEX.red, { p: [0, -0.3, -0.2] })); }
  const g = new THREE.Group(), mat = entityMat(), body = new THREE.Mesh(merge(b), mat), head = new THREE.Group();
  head.position.set(0, 1.55, 0); head.add(new THREE.Mesh(merge(h), mat)); g.add(body, head);
  if (kind === 'kid') g.scale.setScalar(0.68);
  if (kind === 'elder') body.rotation.x = 0.1;
  return { g, head, mat };
}

export function createNpc(kind, x, z, yaw) {
  const m = person(kind);
  m.g.position.set(x, F.h(x, z), z); m.g.rotation.y = yaw; G.gfx.scene.add(m.g);
  const col = F.addCircle(x, z, 0.5);
  const N = {
    kind, x, z, yaw, home: yaw, g: m.g, col, talking: false, ph: Math.random() * 6,
    update(dt) {
      const t = G.time + this.ph, p = G.player, d = Math.hypot(p.pos.x - x, p.pos.z - z);
      // 가까이 오면 돌아본다
      const want = d < 6 ? Math.atan2(p.pos.x - x, p.pos.z - z) : this.home;
      this.yaw = dampAngle(this.yaw, want, 3, dt); m.g.rotation.y = this.yaw;
      m.head.rotation.x = Math.sin(t * 1.6) * 0.03 + (this.talking ? Math.sin(t * 9) * 0.05 : 0);
      m.g.position.y = F.h(x, z) + (this.talking ? Math.abs(Math.sin(t * 7)) * 0.012 : 0);
    },
  };
  return N;
}

// ── 까치 ──
function magpieModel() {
  seedGeo(303);
  const g = new THREE.Group(), mat = entityMat({ keep: true, double: true }), black = 0x16161c, white = 0xf8f3e6, blue = 0x1f3558;
  const body = new THREE.Mesh(merge([
    ico(0.2, 1, black, { p: [0, 0.2, 0], s: [0.85, 0.9, 1.35] }, 0.08), ico(0.15, 0, white, { p: [0, 0.14, 0.03], s: [0.8, 0.75, 1.1] }, 0.03),
    ico(0.13, 1, black, { p: [0, 0.37, 0.2] }, 0.06), cone(0.045, 0.16, 4, 0x2a2a30, { p: [0, 0.36, 0.38], r: [Math.PI / 2, 0, 0] }),
    box(0.025, 0.025, 0.02, white, { p: [-0.07, 0.4, 0.3] }, 0), box(0.025, 0.025, 0.02, white, { p: [0.07, 0.4, 0.3] }, 0),
    box(0.07, 0.025, 0.62, blue, { p: [0, 0.2, -0.52], r: [-0.12, 0, 0] }, 0.1), box(0.11, 0.02, 0.3, black, { p: [0, 0.21, -0.3], r: [-0.1, 0, 0] }),
    cyl(0.012, 0.012, 0.14, 4, 0x2a2a30, { p: [-0.06, 0.02, 0.02] }), cyl(0.012, 0.012, 0.14, 4, 0x2a2a30, { p: [0.06, 0.02, 0.02] }),
  ]), mat);
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * 0.13, 0.27, 0);
    w.add(new THREE.Mesh(merge([tris([[[0, 0, 0.16], [s * 0.5, 0, 0.02], [0, 0, -0.2]], [[s * 0.5, 0, 0.02], [s * 0.62, 0, -0.22], [0, 0, -0.2]]], black, null, 0.1), tris([[[s * 0.12, 0.004, 0.1], [s * 0.42, 0.004, 0.0], [s * 0.14, 0.004, -0.12]]], white, null, 0.03)]), mat));
    g.add(w); wings.push(w);
  }
  g.add(body); g.scale.setScalar(1.55);
  return { g, wings, body, mat };
}
export function createMagpie() {
  const m = magpieModel(); G.gfx.scene.add(m.g);
  const M = {
    g: m.g, pos: m.g.position, yaw: 0, flying: false, t: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), dur: 1, visible: true, hop: 0, onLand: null,
    // 앉을 자리로 순간 이동
    perch(x, y, z, yaw = 0) { this.pos.set(x, y, z); this.yaw = yaw; this.flying = false; m.g.visible = true; this.visible = true; },
    // 날아간다(포물선). y 를 주지 않으면 땅 위 높이 h
    flyTo(x, z, h = 0, cb, y) {
      this.from.copy(this.pos); this.to.set(x, (y ?? F.hr(x, z)) + h, z); this.flying = true; this.t = 0; this.onLand = cb || null;
      this.dur = Math.max(0.8, this.from.distanceTo(this.to) / 15); m.g.visible = true; this.visible = true;
      G.audio.play('magpie', { n: 2 });
    },
    hide() { m.g.visible = false; this.visible = false; this.flying = false; },
    update(dt) {
      if (!this.visible) return;
      const t = G.time;
      if (this.flying) {
        this.t += dt; const u = clamp01(this.t / this.dur), e = ease.io2(u);
        this.pos.lerpVectors(this.from, this.to, e); this.pos.y += Math.sin(u * Math.PI) * Math.min(7, 2 + this.dur * 1.6);
        this.yaw = Math.atan2(this.to.x - this.from.x, this.to.z - this.from.z);
        const f = Math.sin(t * 26) * 0.9; m.wings[0].rotation.z = f; m.wings[1].rotation.z = -f; m.body.rotation.x = -0.25;
        if (u >= 1) { this.flying = false; const cb = this.onLand; this.onLand = null; if (cb) cb(); }
      } else {
        // 앉아서: 꽁지를 까딱이고 주인공을 본다
        const p = G.player, want = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
        if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 14) this.yaw = dampAngle(this.yaw, want, 4, dt);
        m.wings[0].rotation.z = 1.3; m.wings[1].rotation.z = -1.3;
        m.body.rotation.x = Math.sin(t * 2.1) * 0.06 + (Math.sin(t * 0.9) > 0.92 ? -0.3 : 0);
        this.hop = Math.max(0, Math.sin(t * 1.3 + 2)) > 0.97 ? 0.08 : lerp(this.hop, 0, Math.min(1, dt * 10));
      }
      m.g.rotation.y = this.yaw; m.g.position.y += this.flying ? 0 : 0;
    },
  };
  return M;
}
export { MAT };
