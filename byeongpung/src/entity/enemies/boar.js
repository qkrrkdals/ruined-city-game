// 먹멧돼지: 일직선으로 돌진한다. 피하면 바위나 벼랑에 처박혀 빈틈이 생긴다.
import * as THREE from 'three';
import { G } from '../../core/g.js';
import { Enemy } from '../enemy.js';
import { quadSkeleton, gait } from './quad.js';
import { ico, cyl, cone, box, merge, seedGeo } from '../../gfx/geo.js';
import { entityMat } from '../../gfx/materials.js';
import { HEX } from '../../gfx/palette.js';
import { P } from '../../gfx/particles.js';
import { Slash } from '../../gfx/slash.js';

const D = Math.PI / 180, _p = new THREE.Vector3();
let GEO = null;
function geos() {
  if (GEO) return GEO; seedGeo(140);
  const ink = 0x1a1a20, dark = 0x0f0f13;
  GEO = {
    body: merge([ico(0.72, 1, ink, { p: [0, 0.08, 0], s: [0.88, 0.84, 1.4] }, 0.14), ...[0, 1, 2, 3, 4].map((i) => cone(0.1, 0.34, 4, dark, { p: [0, 0.68 - i * 0.03, 0.6 - i * 0.32], r: [-0.4, 0, 0] }, 0.1))]),
    head: merge([cyl(0.17, 0.36, 0.72, 6, ink, { p: [0, -0.04, 0.2], r: [Math.PI / 2, 0, 0] }, 0.12), cone(0.09, 0.2, 4, dark, { p: [-0.22, 0.26, -0.08], r: [0, 0, 0.5] }), cone(0.09, 0.2, 4, dark, { p: [0.22, 0.26, -0.08], r: [0, 0, -0.5] }), box(0.2, 0.16, 0.08, dark, { p: [0, -0.05, 0.58] })]),
    face: merge([cone(0.05, 0.3, 4, 0xf8f3e6, { p: [-0.17, -0.02, 0.44], r: [0.9, 0, 0.35] }, 0), cone(0.05, 0.3, 4, 0xf8f3e6, { p: [0.17, -0.02, 0.44], r: [0.9, 0, -0.35] }, 0), box(0.05, 0.035, 0.03, HEX.red, { p: [-0.17, 0.12, 0.22] }, 0), box(0.05, 0.035, 0.03, HEX.red, { p: [0.17, 0.12, 0.22] }, 0)]),
    leg: cyl(0.13, 0.1, 0.46, 5, ink, { p: [0, -0.2, 0] }, 0.1), shin: merge([cyl(0.09, 0.07, 0.4, 5, ink, { p: [0, -0.2, 0] }, 0.1), box(0.13, 0.08, 0.15, dark, { p: [0, -0.4, 0.02] })]),
    tail: box(0.04, 0.04, 0.3, dark, { p: [0, 0, -0.15] }),
  };
  return GEO;
}

export const BOAR = {
  kind: 'boar', hp: 140, posture: 85, radius: 0.95, height: 1.4, speed: 3.3, aggro: 17, pref: 6.5, strafe: 0.5, poise: 2, flinchPower: 2, flinchMax: 3, staggerTime: 3.6, ink: 36, mass: 3, turn: 4,
  attacks: [
    { id: 'charge', range: [4.2, 17], w: 4, windup: 1.0, strike: 1.45, recover: 1.1, cd: [1.6, 3], shape: { kind: 'circle', r: 1.3, fwd: 0.8 }, groundShape: { kind: 'line', len: 17, w: 1.2 }, ground: true, sweep: true, dmg: 24, power: 3, track: 3.6, commit: 0.25, armor: true,
      onStrike: (e) => { e.chargeV = 4; G.audio.play('snort'); },
      onUpdate: (e, dt) => {
        e.chargeV = e.struck ? Math.max(3, e.chargeV - 30 * dt) : Math.min(15, e.chargeV + 34 * dt);
        e.vel.set(Math.sin(e.yaw) * e.chargeV, 0, Math.cos(e.yaw) * e.chargeV);
        if (Math.random() < dt * 22) { P.dust(e.pos, 1, 0.9); if (Math.random() < 0.3) G.audio.play('gallop'); }
      } },
    { id: 'gore', range: [0, 2.7], w: 3, windup: 0.5, strike: 0.16, recover: 0.8, cd: [1.2, 2.2], shape: { kind: 'sector', r: 2.8, half: 65 * D }, dmg: 14, power: 2, track: 6, hitAt: 0.3 },
  ],
};

export class Boar extends Enemy {
  build() {
    const g = geos(), sk = quadSkeleton({ H: 0.92, L: 1.25, w: 0.34, u: 0.44, l: 0.42, neckLen: 0.42, neckY: 0.05, neckZ: 0.3, tail: 1, tailSeg: 0.2 });
    const body = entityMat({ rim: 0.55 }), keep = entityMat({ keep: true }); this.mats = [body, keep];
    const add = (j, geo, m = body) => sk.j[j].add(new THREE.Mesh(geo, m));
    add('body', g.body); add('head', g.head); add('head', g.face, keep); add('tail1', g.tail);
    for (const n of ['FL', 'FR', 'BL', 'BR']) { add('leg' + n, g.leg); add('shin' + n, g.shin); }
    this.sk = sk; this.model.add(sk.root); this.ph = Math.random() * 6;
  }
  // 돌진하다 벽·바위에 부딪혔다
  onWall() {
    if (this.st !== 'strike' || !this.atk || this.atk.id !== 'charge' || this.t < 0.22 || this.chargeV < 8) return;
    this.endAttack(); this.vel.set(0, 0, 0);
    _p.copy(this.pos); _p.y += 0.8; P.dust(_p, 6, 1.4); P.sparks(_p, 12, 9, HEX.white); G.cam.shake(0.4); G.audio.play('slam', { size: 2 });
    Slash.ring({ pos: this.pos, y: 0.15, r0: 0.6, r1: 1.2, grow: 9, fade: 0.3, color: 0x16161f });
    this.posture += this.postureMax * 0.65; this.postureT = 0;
    if (this.posture >= this.postureMax) this.stagger(); else { this.setState('flinch'); this.flinchDur = 1.5; this.cd = 1; }
  }
  animate(dt) {
    const J = this.sk.J, st = this.st, t = G.time + this.ph, sp = Math.hypot(this.vel.x, this.vel.z);
    J.rest();
    let rate = 14;
    J.set('body', Math.sin(t * 2.2) * 0.02, 0, 0); J.set('tail1', -0.5, Math.sin(t * 6) * 0.5, 0);
    if (st === 'windup' && this.atk.id === 'charge') { // 앞발로 땅을 긁는다
      J.set('neck', 0.55, 0, 0); J.set('legFR', -0.5 + Math.sin(t * 16) * 0.5, 0, 0); J.set('shinFR', 0.7, 0, 0); J.set('body', 0.08, 0, Math.sin(t * 40) * 0.015); J.lift('body', -0.06);
    } else if (st === 'strike' && this.atk.id === 'charge') { this.ph += dt * 16; gait(J, this.ph * 1, 1, true); J.set('neck', 0.5, 0, 0); J.set('body', 0.1 + Math.sin(this.ph * 2) * 0.06, 0, 0); rate = 26; }
    else if (st === 'windup') { J.set('neck', 0.7, -0.5, 0); J.lift('body', -0.05); }
    else if (st === 'strike') { J.set('neck', -0.65, 0.6, 0); rate = 34; }
    else if (st === 'flinch') { J.set('body', 0, 0, Math.sin(t * 22) * 0.12); J.set('neck', 0.5, Math.sin(t * 13) * 0.4, 0); }
    else if (st === 'stagger' || st === 'finish') { J.set('body', 0, 0, 0.75); J.lift('body', -0.42); J.set('neck', 0.4, 0, 0.3); for (const n of ['FL', 'FR', 'BL', 'BR']) { J.set('leg' + n, n[0] === 'F' ? -0.7 : 0.7, 0, 0.3); J.set('shin' + n, 0.5, 0, 0); } }
    else if (sp > 0.4) { this.ph += dt * sp * 2.6; gait(J, this.ph, Math.min(1, sp / 3.3)); J.set('neck', 0.15 + Math.sin(this.ph * 2) * 0.05, 0, 0); }
    else J.set('neck', 0.2 + Math.sin(t * 1.3) * 0.08, Math.sin(t * 0.7) * 0.3, 0);
    J.update(dt, rate);
  }
}
