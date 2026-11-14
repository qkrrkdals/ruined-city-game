// 번진 학: 거리를 두고 먹을 뱉다가, 가까우면 뛰어올라 부리로 내리꽂는다. 부리가 박혔을 때가 빈틈.
import * as THREE from 'three';
import { G } from '../../core/g.js';
import { Enemy } from '../enemy.js';
import { Joints } from './quad.js';
import { ico, cyl, cone, box, merge, seedGeo, tris } from '../../gfx/geo.js';
import { entityMat } from '../../gfx/materials.js';
import { HEX } from '../../gfx/palette.js';
import { P } from '../../gfx/particles.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3();
let GEO = null;
function geos() {
  if (GEO) return GEO; seedGeo(150);
  const ink = 0x1b1b21, dark = 0x0e0e12, grey = 0x3a3a42;
  const wing = (s) => merge([tris([[[0, 0, 0.3], [s * 0.95, 0, 0.0], [0, 0, -0.5]], [[s * 0.95, 0, 0], [s * 1.25, 0, -0.55], [0, 0, -0.5]]], ink, null, 0.12), tris([[[s * 0.6, 0.01, -0.1], [s * 1.2, 0.01, -0.5], [s * 0.3, 0.01, -0.45]]], dark, null, 0.1)]);
  GEO = {
    body: merge([ico(0.36, 1, ink, { p: [0, 0, 0], s: [0.8, 0.85, 1.5] }, 0.12), tris([[[0, 0.1, -0.45], [-0.2, -0.1, -1.0], [0.2, -0.1, -1.0]], [[0, 0.16, -0.4], [-0.1, 0.0, -0.9], [0.1, 0.0, -0.9]]], dark, null, 0.1)]),
    neck: cyl(0.06, 0.075, 0.46, 5, ink, { p: [0, 0.23, 0] }, 0.1),
    head: merge([ico(0.11, 0, ink, { p: [0, 0.06, 0.02] }, 0.08), cone(0.045, 0.46, 4, grey, { p: [0, 0.05, 0.32], r: [Math.PI / 2, 0, 0] })]),
    crown: merge([box(0.09, 0.05, 0.12, HEX.red, { p: [0, 0.16, 0] }, 0), box(0.03, 0.03, 0.02, 0xf8f3e6, { p: [-0.085, 0.08, 0.07] }, 0), box(0.03, 0.03, 0.02, 0xf8f3e6, { p: [0.085, 0.08, 0.07] }, 0)]),
    wingL: wing(1), wingR: wing(-1),
    leg: cyl(0.03, 0.035, 0.58, 4, grey, { p: [0, -0.29, 0] }), shin: merge([cyl(0.025, 0.03, 0.62, 4, grey, { p: [0, -0.31, 0] }), box(0.14, 0.03, 0.2, grey, { p: [0, -0.62, 0.05] })]),
  };
  return GEO;
}

export const CRANE = {
  kind: 'crane', hp: 65, posture: 40, radius: 0.5, height: 2.0, speed: 2.9, aggro: 19, pref: 8.5, strafe: 0.5, poise: 1, flinchMax: 3, staggerTime: 2.8, ink: 24, mass: 0.8, turn: 7,
  attacks: [
    { id: 'spit', range: [4.5, 17], w: 4, windup: 0.75, strike: 0.2, recover: 0.7, cd: [2, 3.6], track: 7,
      onStrike: (e) => { const p = G.player; e.sk.j.head.getWorldPosition(_a); _b.set(p.pos.x + p.vel.x * 0.3, p.pos.y + 0.2, p.pos.z + p.vel.z * 0.3); G.shots.glob({ from: _a, to: _b, speed: 15, arc: 1.5, dmg: 10, r: 0.85, owner: e }); G.audio.play('squawk', { n: 1 }); } },
    { id: 'dive', range: [0, 4.6], w: 3, windup: 0.6, strike: 0.28, recover: 1.3, cd: [2, 3.4], lunge: 3.6, shape: { kind: 'line', len: 2.0, w: 0.75 }, dmg: 14, track: 7, hitAt: 0.25, onStrike: (e) => { e.jumpV = 3.4; G.audio.play('squawk', { n: 2 }); } },
  ],
};

export class Crane extends Enemy {
  build() {
    const g = geos(), root = new THREE.Group(), J = new Joints(), j = {};
    const body = entityMat({ rim: 0.55, double: true }), keep = entityMat({ keep: true }); this.mats = [body, keep];
    const mk = (name, parent, x, y, z, geo, m = body) => { const o = new THREE.Group(); o.position.set(x, y, z); (parent ? j[parent] : root).add(o); j[name] = o; J.add(name, o); if (geo) o.add(new THREE.Mesh(geo, m)); return o; };
    mk('body', null, 0, 1.22, 0, g.body); mk('neck1', 'body', 0, 0.1, 0.42, g.neck); mk('neck2', 'neck1', 0, 0.46, 0, g.neck); mk('head', 'neck2', 0, 0.46, 0, g.head);
    j.head.add(new THREE.Mesh(g.crown, keep));
    mk('wingL', 'body', 0.2, 0.16, 0.05, g.wingL); mk('wingR', 'body', -0.2, 0.16, 0.05, g.wingR);
    mk('legL', 'body', 0.12, -0.15, -0.05, g.leg); mk('shinL', 'legL', 0, -0.58, 0, g.shin); mk('legR', 'body', -0.12, -0.15, -0.05, g.leg); mk('shinR', 'legR', 0, -0.58, 0, g.shin);
    this.sk = { root, j, J }; this.model.add(root); this.ph = Math.random() * 6; this.evadeCd = 1.5;
  }
  think(dt, d) {
    // 주인공이 바짝 붙으면 푸드덕 물러난다
    this.evadeCd -= dt;
    if (d < 3.6 && this.evadeCd <= 0 && this.cd > 0.25) {
      const p = G.player, dx = (this.pos.x - p.pos.x) / (d || 1), dz = (this.pos.z - p.pos.z) / (d || 1);
      this.knock.set(dx * 12, 0, dz * 12); this.jumpV = 6; this.evadeCd = 4.5; this.flapT = 0.7; G.audio.play('squawk', { n: 1 }); P.dust(this.pos, 3, 0.7);
    }
    super.think(dt, d);
  }
  animate(dt) {
    const J = this.sk.J, st = this.st, t = G.time + this.ph, sp = Math.hypot(this.vel.x, this.vel.z);
    J.rest(); let rate = 13;
    if (this.flapT > 0) this.flapT -= dt;
    const air = this.jumpY > 0.1 || this.flapT > 0, flap = Math.sin(t * 24) * 0.8;
    J.set('wingL', 0, 0, air ? flap : -1.3); J.set('wingR', 0, 0, air ? -flap : 1.3);
    J.set('neck1', -0.5 + Math.sin(t * 1.4) * 0.05, 0, 0); J.set('neck2', 0.75, 0, 0); J.set('head', 0.15, Math.sin(t * 0.8) * 0.3, 0);
    if (st === 'windup' && this.atk.id === 'spit') { J.set('neck1', -1.0, 0, 0); J.set('neck2', 1.5, 0, 0); J.set('head', -0.3, 0, 0); J.set('body', -0.2, 0, 0); }
    else if (st === 'strike' && this.atk.id === 'spit') { J.set('neck1', 0.5, 0, 0); J.set('neck2', 0.2, 0, 0); J.set('head', 0.4, 0, 0); rate = 34; }
    else if (st === 'windup') { J.set('neck1', -0.8, 0, 0); J.set('neck2', 0.6, 0, 0); J.set('body', -0.3, 0, 0); J.lift('body', -0.18); J.set('legL', 0.5, 0, 0); J.set('legR', 0.5, 0, 0); J.set('shinL', -1.0, 0, 0); J.set('shinR', -1.0, 0, 0); J.set('wingL', 0, 0, -0.5); J.set('wingR', 0, 0, 0.5); }
    else if (st === 'strike' || (st === 'recover' && this.atk && this.atk.id === 'dive')) { // 내리꽂은 채 부리가 박혀 있다
      J.set('body', 0.75, 0, 0); J.set('neck1', 0.55, 0, 0); J.set('neck2', 0.1, 0, 0); J.set('head', 0.5, 0, 0); J.set('wingL', 0, 0, 0.2 + (st === 'recover' ? Math.sin(t * 18) * 0.25 : 0)); J.set('wingR', 0, 0, -0.2 - (st === 'recover' ? Math.sin(t * 18) * 0.25 : 0)); rate = st === 'strike' ? 30 : 13;
    } else if (st === 'flinch') { J.set('body', -0.4, 0, 0.2); J.set('neck1', -1.0, 0, 0.3); }
    else if (st === 'stagger' || st === 'finish') { J.set('body', 0.5, 0, 0.3); J.lift('body', -0.7); J.set('neck1', 0.6, 0, 0.4); J.set('neck2', 0.4, 0, 0); J.set('legL', -1.2, 0, 0); J.set('legR', -1.0, 0, 0); J.set('shinL', 2.0, 0, 0); J.set('shinR', 1.9, 0, 0); J.set('wingL', 0, 0, -0.3 + Math.sin(t * 9) * 0.1); J.set('wingR', 0, 0, 0.3); }
    else if (sp > 0.4 && !air) { this.ph += dt * sp * 2.2; const s = Math.sin(this.ph * 2); J.set('legL', -s * 0.5, 0, 0); J.set('legR', s * 0.5, 0, 0); J.set('shinL', Math.max(0, -s) * 0.7, 0, 0); J.set('shinR', Math.max(0, s) * 0.7, 0, 0); J.add3('neck1', Math.sin(this.ph * 4) * 0.08); }
    J.update(dt, rate);
  }
}
