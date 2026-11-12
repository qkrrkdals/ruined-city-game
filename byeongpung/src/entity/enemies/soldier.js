// 인간형 적: 번진 군졸(창)·방패 군졸·탈 쓴 군졸(정예)·묵장(중간 보스). 주인공과 같은 뼈대·자세 함수를 쓴다.
import * as THREE from 'three';
import { G } from '../../core/g.js';
import { Enemy, rel, wrapAngle } from '../enemy.js';
import { buildHumanoid } from '../humanoid.js';
import { newPose, lerpPose, copyPose, applyPose } from '../rig.js';
import * as HA from '../hanim.js';
import { Slash } from '../../gfx/slash.js';
import { P } from '../../gfx/particles.js';
import { HEX } from '../../gfx/palette.js';
import { smoothstep } from '../../core/util.js';

const D = Math.PI / 180, R = { f: 0, r: 0, dist: 0, ang: 0 }, _p = new THREE.Vector3();
const INK_RED = 0x3a0c08;

function slamRing(e, r) {
  _p.set(e.pos.x + Math.sin(e.yaw) * r, e.pos.y + 0.1, e.pos.z + Math.cos(e.yaw) * r);
  Slash.ring({ pos: _p, r0: 0.4, r1: 1.2, grow: 14, fade: 0.35, color: INK_RED, dry: 0.5 });
  P.inkBurst(_p, 18, 7, null, HEX.ink, 4); P.dust(_p, 5, 1.2); P.splat(_p.x, _p.z, 4); G.cam.shake(0.5); G.audio.play('slam', { size: 3 });
}

export const HUMANOID = {
  soldier: {
    kind: 'soldier', model: 'soldier', hp: 70, posture: 55, radius: 0.45, height: 1.75, speed: 3.4, aggro: 15, pref: 2.5, strafe: 0.3, poise: 1, flinchMax: 4, staggerTime: 3.2, ink: 20,
    attacks: [
      { id: 'thrust', anim: 'thrust', range: [0.4, 3.3], w: 3, windup: 0.62, strike: 0.14, recover: 0.78, cd: [1.3, 2.5], lunge: 1.5, shape: { kind: 'line', len: 3.3, w: 0.62 }, dmg: 14, track: 5, hitAt: 0.3 },
      { id: 'sweep', anim: 'swing', sp: { tilt: 8 * D, a0: 110 * D, a1: -80 * D, lead: 'L' }, range: [0, 2.3], w: 2, windup: 0.72, strike: 0.18, recover: 0.82, cd: [1.5, 2.8], shape: { kind: 'sector', r: 3.0, half: 75 * D }, dmg: 12, track: 4, hitAt: 0.35 },
    ],
  },
  shield: {
    kind: 'shield', model: 'shield', hp: 85, posture: 72, radius: 0.48, height: 1.75, speed: 3.0, aggro: 15, pref: 2.1, strafe: 0.25, poise: 1, flinchMax: 3, staggerTime: 3.4, ink: 28, shield: true,
    attacks: [
      { id: 'slash', anim: 'swing', sp: { tilt: 30 * D, a0: 115 * D, a1: -70 * D, lead: 'R', grip: 0, rh: 0.42 }, range: [0, 2.2], w: 3, windup: 0.6, strike: 0.16, recover: 0.95, cd: [1.4, 2.6], shape: { kind: 'sector', r: 2.6, half: 68 * D }, dmg: 15, track: 5, hitAt: 0.35 },
      { id: 'bash', anim: 'bash', range: [1.6, 4.2], w: 2, windup: 0.5, strike: 0.22, recover: 0.9, cd: [2, 3.4], lunge: 2.8, shape: { kind: 'line', len: 1.5, w: 0.8 }, dmg: 10, power: 2, track: 6, hitAt: 0.2 },
    ],
  },
  elite: {
    kind: 'elite', model: 'elite', hp: 175, posture: 100, radius: 0.5, height: 1.95, speed: 3.9, aggro: 17, pref: 2.6, strafe: 0.45, poise: 2, flinchPower: 2, flinchMax: 2, staggerTime: 3.4, ink: 62, mass: 1.5,
    attacks: [
      { id: 'c1', anim: 'swing', sp: { tilt: 20 * D, a0: 118 * D, a1: -78 * D, lead: 'L' }, range: [0, 2.9], w: 4, windup: 0.56, strike: 0.15, recover: 0.5, cd: [1.2, 2.2], lunge: 0.9, shape: { kind: 'sector', r: 3.1, half: 78 * D }, dmg: 17, track: 6, hitAt: 0.35, chain: 'c2' },
      { id: 'c2', anim: 'swing', sp: { tilt: -16 * D, a0: -115 * D, a1: 82 * D, lead: 'R' }, range: [99, 99], windup: 0.5, strike: 0.15, recover: 0.5, lunge: 1.0, shape: { kind: 'sector', r: 3.1, half: 78 * D }, dmg: 17, track: 6, hitAt: 0.35, chain: 'c3' },
      { id: 'c3', anim: 'swing', sp: { tilt: 90 * D, a0: 128 * D, a1: -38 * D, lead: 'R', cy: 1.25 }, range: [99, 99], windup: 0.7, strike: 0.16, recover: 1.1, cd: [1.6, 2.6], lunge: 1.2, shape: { kind: 'line', len: 3.6, w: 0.9 }, dmg: 24, power: 2, track: 5, hitAt: 0.5 },
      { id: 'lunge', anim: 'thrust', range: [3, 6.5], w: 3, windup: 0.7, strike: 0.2, recover: 0.95, cd: [1.6, 2.8], lunge: 4.0, shape: { kind: 'line', len: 2.6, w: 0.75 }, dmg: 20, power: 2, track: 6, hitAt: 0.2 },
    ],
  },
  general: {
    kind: 'general', model: 'general', boss: true, hp: 540, posture: 170, radius: 0.85, height: 2.75, speed: 3.1, aggro: 30, lose: 80, leash: 60, pref: 3.2, strafe: 0.3, poise: 3, staggerTime: 4.2, finFrac: 0.24, ink: 300, mass: 4, turn: 4.5,
    attacks: [
      { id: 'sweep', anim: 'swing', sp: { tilt: 6 * D, a0: 125 * D, a1: -100 * D, lead: 'L' }, range: [0, 4.2], w: 4, windup: 0.9, strike: 0.2, recover: 0.95, cd: [0.9, 1.8], lunge: 1.2, shape: { kind: 'sector', r: 4.8, half: 88 * D }, ground: true, dmg: 22, power: 2, track: 4, hitAt: 0.4, chain: 'slam', chainCond: (e) => e.hp < e.maxHp * 0.6 },
      { id: 'slam', anim: 'swing', sp: { tilt: 90 * D, a0: 132 * D, a1: -36 * D, lead: 'R', cy: 1.25 }, range: [1.5, 5], w: 3, windup: 1.1, strike: 0.18, recover: 1.25, cd: [1, 2], lunge: 1.0, shape: { kind: 'line', len: 5.6, w: 1.15 }, ground: true, dmg: 30, power: 3, track: 3.5, commit: 0.3, hitAt: 0.6, onStrikeEnd: (e) => slamRing(e, 4.2) },
      { id: 'lunge', anim: 'thrust', range: [4.5, 10], w: 4, windup: 0.8, strike: 0.26, recover: 1.1, cd: [1.2, 2.2], lunge: 5.2, shape: { kind: 'line', len: 4.0, w: 1.0 }, groundShape: { kind: 'line', len: 9, w: 1.0 }, ground: true, dmg: 24, power: 2, track: 5, hitAt: 0.15 },
      { id: 'spin', anim: 'swing', sp: { tilt: 3 * D, a0: 160 * D, a1: -200 * D, lead: 'L', back: 0.2 }, spin: -1, range: [0, 4.5], w: 3, cond: (e) => e.hp < e.maxHp * 0.5, windup: 1.0, strike: 0.3, recover: 1.3, cd: [1.4, 2.4], shape: { kind: 'circle', r: 5.2 }, ground: true, dmg: 24, power: 2, track: 2, hitAt: 0.3 },
    ],
  },
};

export class HumanoidEnemy extends Enemy {
  build() {
    const rig = buildHumanoid(this.def.model); this.rig = rig; this.model.add(rig.root); this.mats = rig.mats;
    this.poseCur = newPose(); this.poseFrom = newPose(); this.poseOut = newPose(); this.poseA = newPose(); this.poseB = newPose();
    this.blendT = 1; this.blendDur = 0.12; this.runPh = Math.random() * 6; this.lastSt = ''; this.moveW = 0;
    HA.sentry(this.poseOut, 0); applyPose(rig, this.poseOut);
    this.scale = rig.root.scale.x;
  }
  blocks(info) {
    if (!this.def.shield || this.staggered || info.guardBreak) return false;
    if (this.st === 'strike' || this.st === 'recover' || this.st === 'flinch' || this.st === 'rise') return false;
    const p = G.player; rel(this.pos.x, this.pos.z, this.yaw, p.pos.x, p.pos.z, R);
    return Math.abs(R.ang) < 75 * D;
  }
  onBlock() { this.pop = 0.6; this.blockT = 0.25; }
  startAttack(a) {
    super.startAttack(a);
    if (a.groundShape && this.tellFx) { Slash.kill(this.tellFx); this.tellFx = this.groundTell({ ...a, shape: a.groundShape }); }
    const w = this.windup; this.sp = { ...(a.sp || {}), tw: w, ts: w + a.strike, dur: w + a.strike + a.recover };
    this.vfx = false;
  }
  animate(dt) {
    const C = this.poseCur, t = G.time + this.runPh, st = this.st, rig = this.rig;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.runPh += dt * sp * 3.2 / this.scale;
    this.moveW += ((sp > 0.4 ? 1 : 0) - this.moveW) * Math.min(1, dt * 12);
    const key = st === 'chase' || st === 'engage' || st === 'alert' ? 'm' : st === 'windup' || st === 'strike' || st === 'recover' ? 'a' + (this.atk ? this.atk.id : '') : st;
    if (key !== this.lastSt) { copyPose(this.poseOut, this.poseFrom); this.blendT = 0; this.blendDur = key[0] === 'a' ? 0.14 : 0.16; this.lastSt = key; rig.root.rotation.y = 0; }
    if (key[0] === 'a' && this.atk) {
      const a = this.atk, s = this.sp, ta = st === 'windup' ? this.t : st === 'strike' ? s.tw + this.t : s.ts + this.t;
      if (a.anim === 'swing') HA.swing(C, s, ta); else HA.thrust(C, s, ta);
      if (a.anim === 'bash') { C.hl[0] = 0.02; C.hl[1] = 1.15; C.hl[2] = st === 'windup' ? 0.2 : 0.62; C.hr[0] = -0.35; C.hr[1] = 0.95; C.hr[2] = -0.15; C.wd[0] = -0.3; C.wd[1] = 0.5; C.wd[2] = -0.8; C.grip = 0; }
      const rec = smoothstep(s.ts + (s.dur - s.ts) * 0.5, s.dur, ta); if (rec > 0) lerpPose(C, HA.guard(this.poseA, t), rec * 0.8, C);
      if (a.spin) rig.root.rotation.y = a.spin * Math.PI * 2 * HA.swingAngle(s, ta).e;
      if (st === 'strike' && !this.vfx && a.anim === 'swing') {
        this.vfx = true; const sh = a.shape, sign = Math.sign(s.a1 - s.a0);
        Slash.arc({ parent: this.group, c: [0, (s.cy ?? 1.2) * this.scale, 0.06], tilt: s.tilt, a0: s.a0 - sign * 0.2, a1: s.a1 + sign * 0.2, r0: 0.9 * this.scale, r1: (sh.r || sh.len) - 0.1, color: INK_RED, reveal: a.strike, fade: 0.3, dry: 0.6 });
      } else if (st === 'strike' && !this.vfx && a.anim === 'thrust') {
        this.vfx = true;
        Slash.line({ parent: this.group, c: [-0.1, 1.1 * this.scale, 0.4], dir: [0, 0, 1], side: [0.2, 1, 0], len: a.shape.len, width: 0.5 * this.scale, color: INK_RED, reveal: a.strike, fade: 0.25, dry: 0.6 });
      }
    } else if (st === 'idle' || st === 'return' && sp < 0.4) HA.sentry(C, t);
    else if (st === 'flinch') HA.hurt(C, this.t / (this.flinchDur || 0.36));
    else if (st === 'stagger' || st === 'finish') HA.kneel(C, t);
    else {
      HA.guard(this.poseA, t);
      if (this.moveW > 0.01) {
        const s = Math.sin(this.yaw), c = Math.cos(this.yaw), f = this.vel.x * s + this.vel.z * c, r = -this.vel.x * c + this.vel.z * s, l = Math.max(sp, 0.01);
        HA.run(this.poseB, this.runPh, Math.max(0.3, sp / 4.5), -r / l, f / l, true);
        for (let i = 0; i < 3; i++) { this.poseB.hr[i] = this.poseA.hr[i]; this.poseB.wd[i] = this.poseA.wd[i]; } this.poseB.grip = 1;
        lerpPose(this.poseA, this.poseB, this.moveW, C);
      } else copyPose(this.poseA, C);
    }
    if (this.def.shield && key[0] !== 'a' && st !== 'stagger' && st !== 'finish' && st !== 'flinch') {
      // 방패를 앞으로, 칼은 옆으로
      C.grip = 0; C.hl[0] = 0.06; C.hl[1] = 1.12 - (this.blockT > 0 ? 0.05 : 0); C.hl[2] = 0.42 - (this.blockT > 0 ? 0.12 : 0);
      C.hr[0] = -0.34; C.hr[1] = 0.95; C.hr[2] = 0.05; C.wd[0] = -0.25; C.wd[1] = 0.75; C.wd[2] = 0.6;
    }
    if (this.blockT > 0) this.blockT -= dt;
    if (this.blendT < 1) { this.blendT = Math.min(1, this.blendT + dt / this.blendDur); const k = this.blendT * this.blendT * (3 - 2 * this.blendT); lerpPose(this.poseFrom, C, k, this.poseOut); } else copyPose(C, this.poseOut);
    applyPose(rig, this.poseOut);
  }
}
export { wrapAngle };
