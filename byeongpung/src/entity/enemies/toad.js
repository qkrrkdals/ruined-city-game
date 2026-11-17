// 먹두꺼비(갈대늪의 중간 보스): 뛰어 덮치기(충격 고리), 혀 채찍, 먹 뱉기, 배치기, 먹물이 부르기.
import * as THREE from 'three';
import { G } from '../../core/g.js';
import { F } from '../../world/field.js';
import { Enemy } from '../enemy.js';
import { Joints } from './quad.js';
import { ico, cyl, box, merge, seedGeo, jitter, paintY } from '../../gfx/geo.js';
import { entityMat } from '../../gfx/materials.js';
import { HEX } from '../../gfx/palette.js';
import { P } from '../../gfx/particles.js';
import { Slash } from '../../gfx/slash.js';
import { lerp, clamp01, rand } from '../../core/util.js';

const D = Math.PI / 180, _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
const RED = 0x3a0c08;
let GEO = null;
function geos() {
  if (GEO) return GEO; seedGeo(160);
  const ink = 0x1a1d1c, dark = 0x0f1110, belly = 0x34383a;
  const warts = []; for (let i = 0; i < 14; i++) { const a = rand(6.28), r = rand(0.5, 1.5); warts.push(ico(rand(0.12, 0.22), 0, 0x262a29, { p: [Math.cos(a) * r, 1.9 + rand(0, 0.5) - r * 0.35, Math.sin(a) * r * 1.1 - 0.2] }, 0.1)); }
  GEO = {
    body: merge([paintY(jitter(new THREE.IcosahedronGeometry(1, 1), 0.05).scale(1.75, 1.25, 1.95).translate(0, 1.3, 0), belly, ink, 0.2, 1.6, 0.1), ...warts, box(2.3, 0.1, 0.12, dark, { p: [0, 1.2, 1.78] })]),
    eye: ico(0.4, 1, ink, null, 0.08),
    iris: merge([ico(0.26, 1, 0xe8d98a, { p: [0, 0.05, 0.22], s: [1, 1, 0.5] }, 0.03), box(0.07, 0.3, 0.06, 0x101010, { p: [0, 0.05, 0.36] }, 0)]),
    jaw: merge([paintY(new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.45, 0.55, 1.3).translate(0, 0, 0.5), belly, 0x2a2e2d, -0.55, 0, 0.08)]),
    throat: ico(0.6, 1, belly, null, 0.06),
    arm: merge([cyl(0.2, 0.16, 0.9, 5, ink, { p: [0, -0.45, 0] }, 0.1), box(0.5, 0.1, 0.55, dark, { p: [0, -0.92, 0.12] })]),
    leg: merge([ico(0.62, 0, ink, { p: [0, 0, 0], s: [0.8, 0.75, 1.35] }, 0.12), box(0.55, 0.12, 0.9, dark, { p: [0.1, -0.45, 0.5] })]),
    tongue: box(0.34, 0.14, 1, HEX.red, { p: [0, 0, 0.5] }, 0.06),
  };
  return GEO;
}
function shockwave(e) { e.shock = { r: 2.5, max: 12.5, hit: false, x: e.pos.x, z: e.pos.z }; Slash.ring({ pos: e.pos, y: 0.18, r0: 2.5, r1: 3.5, grow: 13, fade: 0.75, color: RED, dry: 0.45 }); }
function land(e, r, dmg, power) {
  e.jumpY = 0; e.jumpV = 0; e.solid = true;
  e.tryHit({ dmg, power }, { kind: 'circle', r });
  _a.copy(e.pos); _a.y += 0.2; P.inkBurst(_a, 26, 9, null, HEX.ink, 5); P.dust(_a, 8, 1.6); P.splat(e.pos.x, e.pos.z, r * 1.6);
  G.cam.shake(0.65); G.audio.play('slam', { size: 4 }); e.squash = 1;
}

export const TOAD = {
  kind: 'toad', nameKey: 'toad', boss: true, hp: 2600, posture: 360, radius: 1.9, height: 2.6, speed: 1.7, aggro: 40, lose: 99, leash: 99, pref: 5.5, strafe: 0.2, poise: 3, staggerTime: 4.4, finFrac: 0.13, postureTaken: 0.45, ink: 300, mass: 8, turn: 3.2, wake: 40,
  attacks: [
    { id: 'leap', range: [5, 24], w: 5, windup: 0.9, strike: 0.85, recover: 1.35, cd: [0.8, 1.8], track: 4, power: 3,
      onStrike: (e) => {
        const p = G.player; e.from = e.pos.clone(); e.to = new THREE.Vector3(p.pos.x, 0, p.pos.z);
        for (let i = 0; i < 8 && F.sdf(e.to.x, e.to.z) > -2.2; i++) e.to.lerp(e.home3, 0.15);
        e.solid = false;
        e.landFx = Slash.arc({ pos: _a.set(e.to.x, F.h(e.to.x, e.to.z), e.to.z), c: [0, 0.16, 0], tilt: 0, a0: 0, a1: Math.PI * 2, r0: 0.7, r1: 4.4, color: HEX.red, reveal: 0.3, hold: 0.55, fade: 0.2, flat: 1, opacity: 0.6, dry: 0.75 });
      },
      onUpdate: (e) => { const u = clamp01(e.t / 0.85); e.pos.x = lerp(e.from.x, e.to.x, u); e.pos.z = lerp(e.from.z, e.to.z, u); e.jumpY = 6 * Math.sin(u * Math.PI); e.vel.set(0, 0, 0); },
      onStrikeEnd: (e) => { land(e, 4.4, 28, 3); shockwave(e); }, onEnd: (e) => { e.solid = true; e.jumpY = 0; } },
    { id: 'tongue', range: [2.5, 11.5], w: 4, windup: 0.62, strike: 0.2, recover: 0.9, cd: [0.8, 1.8], shape: { kind: 'line', len: 12, w: 0.85 }, ground: true, dmg: 18, power: 2, track: 5, hitAt: 0.35 },
    { id: 'spit', range: [7, 24], w: 3, cond: (e) => e.hp < e.maxHp * 0.75, windup: 0.8, strike: 0.2, recover: 0.9, cd: [1, 2], track: 5,
      onStrike: (e) => {
        const p = G.player; _a.set(e.pos.x + Math.sin(e.yaw) * 1.6, e.pos.y + 1.6, e.pos.z + Math.cos(e.yaw) * 1.6);
        const px = Math.cos(e.yaw), pz = -Math.sin(e.yaw);
        for (const o of [-3.4, 0, 3.4]) { _b.set(p.pos.x + px * o + p.vel.x * 0.4, p.pos.y, p.pos.z + pz * o + p.vel.z * 0.4); G.shots.glob({ from: _a, to: _b, speed: 13, arc: 4.5, dmg: 16, r: 1.0, splash: 2.3, power: 1, size: 1.6, owner: e }); }
        G.audio.play('croak');
      } },
    { id: 'slam', range: [0, 3.4], w: 4, windup: 0.75, strike: 0.42, recover: 1.1, cd: [0.8, 1.6], shape: null, groundShape: { kind: 'circle', r: 4.0 }, ground: true, track: 3, power: 2,
      onStrike: (e) => { e.jumpV = 5.5; }, onStrikeEnd: (e) => land(e, 4.0, 24, 2) },
    { id: 'summon', range: [0, 99], w: 50, cond: (e) => e.hp < e.maxHp * 0.5 && !e.summoned, windup: 1.1, strike: 0.2, recover: 0.8, cd: [1, 1.5], track: 2,
      onStrike: (e) => {
        e.summoned = true; G.audio.play('croak');
        for (let i = 0; i < 4; i++) { const a = e.yaw + i * 1.57 + 0.8; _d.set(e.pos.x + Math.sin(a) * 5.5, 0, e.pos.z + Math.cos(a) * 5.5); F.resolve(_d, 0.6); const k = G.enemies.spawn('inkling', _d.x, _d.z, { ambush: true }); k.def = { ...k.def, wake: 60 }; k.ink = 0; e.kids.push(k); }
      } },
  ],
};

export class Toad extends Enemy {
  build() {
    const g = geos(), root = new THREE.Group(), J = new Joints(), j = {};
    const body = entityMat({ rim: 0.6 }), keep = entityMat({ keep: true }); this.mats = [body, keep];
    const mk = (name, parent, x, y, z, geo, m = body) => { const o = new THREE.Group(); o.position.set(x, y, z); (parent ? j[parent] : root).add(o); j[name] = o; J.add(name, o); if (geo) o.add(new THREE.Mesh(geo, m)); return o; };
    mk('body', null, 0, 0, 0, g.body);
    for (const s of [-1, 1]) { mk('eye' + s, 'body', s * 0.75, 2.42, 1.0, g.eye); j['eye' + s].add(new THREE.Mesh(g.iris, keep)); j['eye' + s].rotation.y = s * 0.35; }
    mk('jaw', 'body', 0, 1.15, 0.6, g.jaw); mk('throat', 'body', 0, 0.75, 1.25, g.throat);
    mk('armL', 'body', 1.25, 1.0, 1.1, g.arm); mk('armR', 'body', -1.25, 1.0, 1.1, g.arm); mk('legL', 'body', 1.55, 0.6, -0.9, g.leg); mk('legR', 'body', -1.55, 0.6, -0.9, g.leg);
    mk('tongue', 'body', 0, 1.1, 1.7, g.tongue, keep); j.tongue.scale.set(1, 1, 0.01); j.tongue.visible = false;
    this.sk = { root, j, J }; this.model.add(root); this.kids = []; this.squash = 0; this.sq = 1; this.ph = 0;
    this.home3 = new THREE.Vector3(this.home.x, 0, this.home.z);
  }
  intro() { G.audio.play('croak'); this.jumpV = 6; this.introTime = 2.3; setTimeout(() => G.audio.play('croak'), 900); }
  onDeath() { for (const k of this.kids) if (k.alive) k.die(); }
  update(dt) {
    super.update(dt);
    const s = this.shock;
    if (s) { // 땅을 타고 퍼지는 충격 고리: 지나갈 때 서 있으면 맞는다
      s.r += 13 * dt; const p = G.player, d = Math.hypot(p.pos.x - s.x, p.pos.z - s.z);
      if (!s.hit && Math.abs(d - s.r) < 0.85 && p.jumpY < 0.6) { s.hit = true; _d.set(p.pos.x - s.x, 0, p.pos.z - s.z).normalize(); p.takeHit({ dmg: 14, power: 1, dir: _d, from: this }); }
      if (s.r > s.max) this.shock = null;
    }
  }
  animate(dt) {
    const J = this.sk.J, j = this.sk.j, st = this.st, t = G.time, a = this.atk;
    J.rest(); let rate = 12, sy = 1 + Math.sin(t * 2.4) * 0.025, tongue = 0;
    j.throat.scale.setScalar(1 + Math.max(0, Math.sin(t * 2.4)) * 0.22);
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > 0.3 && st !== 'strike') { this.ph += dt * 5; const h = Math.abs(Math.sin(this.ph)); J.lift('body', h * 0.25); sy = 0.92 + h * 0.14; J.set('armL', -Math.sin(this.ph) * 0.5); J.set('armR', Math.sin(this.ph) * 0.5); }
    if (st === 'windup') {
      const u = clamp01(this.t / this.windup);
      if (a.id === 'leap' || a.id === 'slam') { sy = 1 - 0.3 * u; J.set('legL', 0.4 * u); J.set('legR', 0.4 * u); }
      else if (a.id === 'tongue') { J.set('jaw', 0.5 * u); J.set('body', -0.12 * u); }
      else if (a.id === 'spit') { J.set('jaw', 0.2 * u); J.set('body', -0.3 * u); j.throat.scale.setScalar(1 + u * 0.7); }
      else { j.throat.scale.setScalar(1 + u * 0.9 + Math.sin(t * 30) * 0.05); J.set('body', -0.2 * u); }
    } else if (st === 'strike') {
      rate = 30;
      if (a.id === 'leap' || a.id === 'slam') { sy = 1.2; J.set('legL', -0.9); J.set('legR', -0.9); J.set('armL', -0.8); J.set('armR', -0.8); }
      else if (a.id === 'tongue') { J.set('jaw', 0.75); tongue = clamp01(this.t / 0.07) * 11.5; }
      else if (a.id === 'spit') { J.set('jaw', 0.8); J.set('body', 0.2); }
    } else if (st === 'recover' && a && a.id === 'tongue') { J.set('jaw', 0.4); tongue = Math.max(0, 11.5 * (1 - this.t / 0.25)); }
    else if (st === 'flinch') { J.set('body', -0.25, 0, Math.sin(t * 20) * 0.08); }
    else if (st === 'stagger' || st === 'finish') { sy = 0.72; J.set('body', 0.12, 0, 0.35); J.set('jaw', 0.5); J.set('eye1', 0, 0, 0.5); J.set('eye-1', 0, 0, -0.5); }
    if (this.squash > 0) { this.squash = Math.max(0, this.squash - dt * 3.5); sy *= 1 - this.squash * 0.35; }
    this.sq += (sy - this.sq) * Math.min(1, dt * 16);
    const w = 1 / Math.sqrt(this.sq); j.body.scale.set(w, this.sq, w);
    j.tongue.visible = tongue > 0.05; j.tongue.scale.z = Math.max(0.01, tongue);
    J.update(dt, rate);
  }
}
