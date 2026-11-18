// 먹물이: 작은 먹 방울. 떼로 덤비고, 움츠렸다가 튀어 오른다.
import * as THREE from 'three';
import { G } from '../../core/g.js';
import { Enemy } from '../enemy.js';
import { ico, cone, box, merge, seedGeo } from '../../gfx/geo.js';
import { entityMat } from '../../gfx/materials.js';
import { HEX } from '../../gfx/palette.js';
import { damp } from '../../core/util.js';

let GEO = null;
function geos() {
  if (GEO) return GEO;
  seedGeo(77);
  const body = merge([
    ico(0.42, 1, 0x17171d, { p: [0, 0.4, 0], s: [1, 0.86, 1] }, 0.14),
    cone(0.16, 0.36, 5, 0x101015, { p: [0, 0.9, -0.05], r: [-0.25, 0, 0] }, 0.1),
    cone(0.13, 0.2, 4, 0x121217, { p: [0.3, 0.1, 0.1], r: [0, 0, -2.2] }), cone(0.13, 0.2, 4, 0x121217, { p: [-0.28, 0.1, -0.12], r: [0, 0, 2.2] }),
    cone(0.12, 0.18, 4, 0x121217, { p: [0.05, 0.08, -0.34], r: [-2.2, 0, 0] }),
  ]);
  const eyes = merge([
    ico(0.09, 0, HEX.white, { p: [-0.15, 0.5, 0.33], s: [1, 1.25, 0.5] }, 0.02), ico(0.09, 0, HEX.white, { p: [0.15, 0.5, 0.33], s: [1, 1.25, 0.5] }, 0.02),
    box(0.045, 0.07, 0.03, HEX.red, { p: [-0.14, 0.49, 0.38] }, 0), box(0.045, 0.07, 0.03, HEX.red, { p: [0.14, 0.49, 0.38] }, 0),
  ]);
  return (GEO = { body, eyes });
}

export const INKLING = {
  kind: 'inkling', hp: 26, posture: 18, radius: 0.42, height: 0.9, speed: 3.7, aggro: 13, pref: 1.7, strafe: 0.55, poise: 1, flinchMax: 9, flinchTime: 0.42, staggerTime: 2.4, ink: 8, mass: 0.6, accel: 26,
  attacks: [
    { id: 'pounce', range: [0.2, 3.8], windup: 0.58, strike: 0.3, recover: 0.75, cd: [1.3, 2.8], lunge: 3.3, shape: { kind: 'circle', r: 0.78 }, dmg: 8, track: 7, hitAt: 0.1, onStrike: (e) => { e.jumpV = 4.4; } },
  ],
};

export class Inkling extends Enemy {
  build() {
    const g = geos(), body = entityMat({ rim: 0.6 }), keep = entityMat({ keep: true });
    this.mats = [body, keep];
    this.body = new THREE.Group(); this.body.add(new THREE.Mesh(g.body, body), new THREE.Mesh(g.eyes, keep)); this.model.add(this.body);
    this.ph = Math.random() * 6; this.sy = 1; this.hop = 0;
  }
  animate(dt) {
    const st = this.st, t = G.time * 4 + this.ph, sp = Math.hypot(this.vel.x, this.vel.z);
    let sy = 1 + Math.sin(t) * 0.05, tilt = 0, hop = 0;
    if (st === 'windup') { const u = Math.min(1, this.t / this.windup); sy = 1 - 0.42 * u + Math.sin(G.time * 60) * 0.03 * u; }
    else if (st === 'strike') { sy = 1.3; tilt = 0.5; }
    else if (st === 'flinch') { sy = 0.8; tilt = -0.5; }
    else if (st === 'stagger' || st === 'finish') { sy = 0.45 + Math.sin(t * 1.5) * 0.04; this.body.rotation.y += dt * 5; }
    else if (sp > 0.5) { this.ph += dt * sp * 1.6; const h = Math.abs(Math.sin(this.ph * 1.5)); hop = h * 0.22; sy = 0.85 + h * 0.3; }
    if (st !== 'stagger' && st !== 'finish') this.body.rotation.y = 0;
    this.sy = damp(this.sy, sy, 22, dt);
    const w = 1 / Math.sqrt(Math.max(0.2, this.sy));
    this.body.scale.set(w, this.sy, w); this.body.rotation.x = damp(this.body.rotation.x, tilt, 14, dt); this.body.position.y = hop;
  }
}
