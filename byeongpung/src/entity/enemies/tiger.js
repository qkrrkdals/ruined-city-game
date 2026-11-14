// 먹범(제1폭의 보스). 1단계: 앞발 후리기·물어뜯기·덮치기·꼬리 쓸기·포효. 2단계(체력 55% 아래): 줄무늬 칼날·먹 잠수.
import * as THREE from 'three';
import { G } from '../../core/g.js';
import { F } from '../../world/field.js';
import { Enemy, rel } from '../enemy.js';
import { gait } from './quad.js';
import { buildTiger } from './tiger_model.js';
import { blotTexture } from '../../gfx/textures.js';
import { patch } from '../../gfx/materials.js';
import { HEX } from '../../gfx/palette.js';
import { P } from '../../gfx/particles.js';
import { Slash } from '../../gfx/slash.js';
import { lerp, clamp, clamp01, damp, rand } from '../../core/util.js';

const D = Math.PI / 180, R = { f: 0, r: 0, dist: 0, ang: 0 }, _a = new THREE.Vector3(), _d = new THREE.Vector3();
const RED = 0x3a0c08, FRONT = { kind: 'sector', r: 5.7, half: 72 * D };

function ringFx(e, r0, grow, color = RED) { Slash.ring({ pos: e.pos, y: 0.18, r0, r1: r0 + 1.1, grow, fade: 0.45, color, dry: 0.5 }); }
function land(e, r, dmg) {
  e.jumpY = 0; e.jumpV = 0; e.solid = true;
  e.tryHit({ dmg, power: 3 }, { kind: 'circle', r });
  _a.copy(e.pos); _a.y += 0.2; P.inkBurst(_a, 30, 10, null, HEX.ink, 5); P.dust(_a, 8, 1.8); P.splat(e.pos.x, e.pos.z, r * 1.5);
  ringFx(e, 1.5, 15); G.cam.shake(0.7); G.audio.play('slam', { size: 4.5 });
}
function behind(e) { const p = G.player; rel(e.pos.x, e.pos.z, e.yaw, p.pos.x, p.pos.z, R); return Math.abs(R.ang) > 2.0 && R.dist < 6.6; }
function surface(e) { e.sunk = false; e.hittable = true; e.targetable = true; e.solid = true; if (e.blot) e.blot.visible = false; }

export const TIGER = {
  kind: 'tiger', nameKey: 'tigerBoss', boss: true, hp: 5600, posture: 460, radius: 1.7, height: 2.5, speed: 4.6, aggro: 70, lose: 999, leash: 999, pref: 4.4, strafe: 0.28, poise: 3, staggerTime: 4.8, finFrac: 0.1, ink: 0, mass: 10, turn: 3.8, wake: 70, accel: 16,
  attacks: [
    { id: 'swipeR', range: [0, 4.7], w: 5, windup: 0.62, strike: 0.2, recover: 0.72, cd: [0.5, 1.3], lunge: 1.6, shape: FRONT, dmg: 22, power: 2, track: 5, hitAt: 0.35, chain: 'swipeL', chainCond: (e) => Math.random() < (e.phase2 ? 0.8 : 0.45) },
    { id: 'swipeL', range: [99, 99], windup: 0.52, strike: 0.2, recover: 0.82, cd: [0.6, 1.4], lunge: 1.8, shape: FRONT, dmg: 22, power: 2, track: 5, hitAt: 0.35, chain: 'pounce', chainCond: (e) => e.phase2 && Math.random() < 0.35 },
    { id: 'bite', range: [3.2, 8.6], w: 4, windup: 0.72, strike: 0.24, recover: 0.86, cd: [0.6, 1.4], lunge: 5.0, shape: { kind: 'line', len: 3.6, w: 1.4 }, dmg: 26, power: 2, track: 5.5, hitAt: 0.15 },
    { id: 'pounce', range: [6.5, 23], w: 4, windup: 0.95, strike: 0.72, recover: 1.3, cd: [0.8, 1.8], track: 5, power: 3,
      onStrike: (e) => {
        const p = G.player; e.from = e.pos.clone(); e.to = new THREE.Vector3(p.pos.x + p.vel.x * 0.25, 0, p.pos.z + p.vel.z * 0.25);
        const dx = e.to.x - e.from.x, dz = e.to.z - e.from.z, d = Math.hypot(dx, dz); if (d > 20) { e.to.x = e.from.x + (dx / d) * 20; e.to.z = e.from.z + (dz / d) * 20; }
        for (let i = 0; i < 8 && F.sdf(e.to.x, e.to.z) > -2.4; i++) e.to.lerp(e.home3, 0.15);
        e.solid = false; G.audio.play('roar', { short: true });
        Slash.arc({ pos: _a.set(e.to.x, F.h(e.to.x, e.to.z), e.to.z), c: [0, 0.16, 0], tilt: 0, a0: 0, a1: Math.PI * 2, r0: 0.8, r1: 4.9, color: HEX.red, reveal: 0.25, hold: 0.47, fade: 0.2, flat: 1, opacity: 0.6, dry: 0.75 });
      },
      onUpdate: (e) => { const u = clamp01(e.t / 0.72); e.pos.x = lerp(e.from.x, e.to.x, u); e.pos.z = lerp(e.from.z, e.to.z, u); e.jumpY = 3.7 * Math.sin(u * Math.PI); e.vel.set(0, 0, 0); },
      onStrikeEnd: (e) => land(e, 4.9, 32), onEnd: (e) => { e.solid = true; e.jumpY = 0; } },
    { id: 'tail', range: [0, 6.6], w: 30, cond: behind, windup: 0.55, strike: 0.36, recover: 0.8, cd: [0.5, 1.2], shape: { kind: 'circle', r: 6.4 }, ground: true, dmg: 20, power: 2, track: 0.5, hitAt: 0.4 },
    { id: 'roar', range: [0, 7.5], w: 3, cond: (e) => e.roarCd <= 0, windup: 0.85, strike: 0.5, recover: 0.9, cd: [0.8, 1.5], shape: { kind: 'circle', r: 9.5 }, ground: true, dmg: 6, power: 3, track: 2, hitAt: 0.1,
      onStrike: (e) => { e.roarCd = 15; G.audio.play('roar'); G.cam.shake(0.6); ringFx(e, 2, 18); ringFx(e, 1, 12, 0x16161f); } },
    { id: 'blades', range: [5, 34], w: 4, cond: (e) => e.phase2, windup: 1.05, strike: 0.3, recover: 1.1, cd: [1, 2], track: 4,
      onStrike: (e) => {
        const p = G.player, base = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z), n = e.hp < e.maxHp * 0.3 ? 7 : 5;
        for (let i = 0; i < n; i++) { const yaw = base + (i - (n - 1) / 2) * 0.3; G.shots.blade({ x: e.pos.x + Math.sin(yaw) * 2.6, z: e.pos.z + Math.cos(yaw) * 2.6, yaw, speed: 21, range: 36, delay: 0.5 + i * 0.045, dmg: 20, r: 1.15, power: 2, owner: e }); }
        G.fx.flash(e.mats, 0.3, 0.6, HEX.red); G.audio.play('roar', { short: true });
      } },
    { id: 'dive', range: [0, 60], w: 3, cond: (e) => e.phase2 && e.diveCd <= 0, windup: 0.75, strike: 3.0, recover: 1.35, cd: [1, 2], track: 0, armor: true,
      onStrike: (e) => { e.sunk = true; e.hittable = false; e.targetable = false; e.solid = false; e.diveCd = 17; e.ringed = false; e.erupted = false; e.trailT = 0; P.inkBurst(e.pos, 30, 7, null, HEX.ink, 4); P.splat(e.pos.x, e.pos.z, 7); G.audio.play('splat'); },
      onUpdate: (e, dt) => {
        const p = G.player; e.vel.set(0, 0, 0);
        if (e.t < 2.2) { // 먹 속을 헤엄쳐 쫓아온다
          const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, d = Math.hypot(dx, dz) || 1;
          if (d > 0.6) { e.pos.x += (dx / d) * 7.6 * dt; e.pos.z += (dz / d) * 7.6 * dt; }
          e.trailT -= dt; if (e.trailT <= 0) { e.trailT = 0.13; P.splat(e.pos.x + rand(-0.6, 0.6), e.pos.z + rand(-0.6, 0.6), rand(2.5, 4)); }
          e.blot.visible = true;
        } else if (!e.ringed) {
          e.ringed = true; G.audio.play('tell', { big: true });
          Slash.arc({ pos: _a.set(e.pos.x, F.h(e.pos.x, e.pos.z), e.pos.z), c: [0, 0.16, 0], tilt: 0, a0: 0, a1: Math.PI * 2, r0: 0.8, r1: 5.3, color: HEX.red, reveal: 0.22, hold: 0.33, fade: 0.2, flat: 1, opacity: 0.65, dry: 0.75 });
        }
        if (e.t >= 2.75 && !e.erupted) { // 발밑에서 솟구친다
          e.erupted = true; surface(e); e.jumpV = 9.5; e.sink = 0.6;
          e.tryHit({ dmg: 30, power: 3 }, { kind: 'circle', r: 5.3 });
          _a.copy(e.pos); P.inkBurst(_a, 50, 12, null, HEX.ink, 7); P.splat(e.pos.x, e.pos.z, 9); ringFx(e, 1.5, 16); G.cam.shake(0.8); G.audio.play('slam', { size: 5 }); G.audio.play('roar', { short: true });
        }
      },
      onEnd: (e) => surface(e) },
  ],
};

export class Tiger extends Enemy {
  build() {
    const t = buildTiger('boss'); this.sk = t; this.mats = t.mats; this.model.add(t.root); t.root.scale.setScalar(1.28);
    this.ph = 0; this.roarCd = 6; this.diveCd = 5; this.phase2 = false; this.sink = 0; this.sunk = false;
    this.home3 = new THREE.Vector3(this.home.x, 0, this.home.z + 13.5);
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    this.blot = new THREE.Mesh(g, patch(new THREE.MeshBasicMaterial({ map: blotTexture(true), color: 0x08080c, transparent: true, depthWrite: false, opacity: 0.95 }), { keep: true }));
    this.blot.scale.setScalar(6.5); this.blot.position.y = 0.09; this.blot.renderOrder = 2; this.blot.visible = false; this.group.add(this.blot);
  }
  // 등장: 벼루못의 먹에서 솟아오른다
  intro() {
    this.sink = 3.6; this.sunk = false; this.introTime = 3.4; this.yaw = Math.atan2(G.player.pos.x - this.pos.x, G.player.pos.z - this.pos.z);
    P.splat(this.pos.x, this.pos.z, 8);
    setTimeout(() => { if (this.alive) { G.audio.play('roar'); G.cam.shake(0.6); ringFx(this, 2, 16); } }, 1700);
  }
  update(dt) {
    if (this.roarCd > 0) this.roarCd -= dt; if (this.diveCd > 0) this.diveCd -= dt;
    if (this.alive && !this.phase2 && !this.staggered && this.hp < this.maxHp * 0.55 && (this.st === 'engage' || this.st === 'chase' || this.st === 'recover')) {
      // 2단계: 온몸의 먹이 끓어오른다
      this.endAttack(); this.setState('rage'); this.hittable = false; this.posture = 0; this.vel.set(0, 0, 0);
      G.audio.play('roar'); G.cam.shake(0.8); ringFx(this, 2, 20); G.ui.hint(G.text.dlg.tigerPhase[0][1], 4.5);
      const p = G.player, d = this.distP; if (d < 9) { _d.set(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z).normalize(); p.knock.addScaledVector(_d, 13); }
    }
    if (this.st === 'rage') {
      this.t += dt; this.vel.set(0, 0, 0);
      if (Math.random() < dt * 30) { _a.set(this.pos.x + rand(-2.5, 2.5), this.pos.y + rand(0, 2), this.pos.z + rand(-2.5, 2.5)); P.ink.spawn(_a.x, _a.y, _a.z, rand(-1, 1), rand(4, 9), rand(-1, 1), rand(0.08, 0.2), rand(0.5, 1), HEX.ink, 6, 0.5, 0); }
      if (this.t > 2.1) { this.phase2 = true; this.rage = 1.22; this.hittable = true; this.setState('engage'); this.cd = 0.5; this.roarCd = 8; this.diveCd = 3; G.fx.flash(this.mats, 0.4, 0.8, HEX.red); }
      this.integrate(dt); this.animate(dt); this.sync(); return;
    }
    super.update(dt);
  }
  animate(dt) {
    const J = this.sk.J, st = this.st, t = G.time, a = this.atk, id = a ? a.id : '', sp = Math.hypot(this.vel.x, this.vel.z), p = G.player;
    J.rest(); let rate = 13, lift = Math.sin(t * 1.8) * 0.02, spin = 0;
    // 기본: 고개로 주인공을 좇고, 꼬리를 흔든다
    rel(this.pos.x, this.pos.z, this.yaw, p.pos.x, p.pos.z, R);
    const look = clamp(-R.ang, -0.8, 0.8);
    J.set('neck', -0.12, look * 0.6, 0); J.set('head', 0.1, look * 0.3, 0);
    const tw = (k, x) => J.set('tail' + k, x, Math.sin(t * 1.6 + k * 0.7) * 0.32, 0);
    tw(1, -0.55); tw(2, 0.25); tw(3, 0.35); tw(4, 0.4);
    const legs = (fx, fs, bx, bs) => { J.set('legFL', fx); J.set('legFR', fx); J.set('shinFL', fs); J.set('shinFR', fs); J.set('legBL', bx); J.set('legBR', bx); J.set('shinBL', bs); J.set('shinBR', bs); };
    const wind = st === 'windup', hit = st === 'strike';
    if (st === 'rage') { J.set('neck', -0.85, Math.sin(t * 30) * 0.05, 0); J.set('jaw', 1.0); J.set('chest', -0.2, 0, Math.sin(t * 40) * 0.03); tw(1, 0.6); tw(2, 0.3); lift = 0.1; rate = 20; }
    else if (st === 'stagger' || st === 'finish') { lift = -0.82; legs(-1.25, 1.2, 1.25, -1.2); J.set('neck', 0.55, 0.3, 0.2); J.set('jaw', 0.35); J.set('chest', 0.05, 0, 0.16); tw(1, -0.95); tw(2, -0.1); tw(3, 0); tw(4, 0); }
    else if (st === 'flinch') { J.set('chest', -0.3, 0, Math.sin(t * 24) * 0.06); J.set('neck', -0.45, 0, 0); lift = 0.08; }
    else if (id === 'swipeR' || id === 'swipeL') {
      const s = id === 'swipeR' ? 1 : -1, leg = id === 'swipeR' ? 'FR' : 'FL';
      if (wind) { J.set('leg' + leg, -1.9, 0, -0.3 * s); J.set('shin' + leg, -0.3); J.set('chest', -0.3, 0.32 * s, 0); J.set('neck', -0.25, look * 0.4, 0); J.set('jaw', 0.4); lift = 0.12; }
      else if (hit) { J.set('leg' + leg, 0.4, 0, 0.5 * s); J.set('shin' + leg, 0.2); J.set('chest', 0.2, -0.5 * s, 0); J.set('neck', 0.25, -0.3 * s, 0); J.set('jaw', 0.7); rate = 34; }
      else { J.set('leg' + leg, 0.25, 0, 0.3 * s); J.set('chest', 0.12, -0.25 * s, 0); }
    } else if (id === 'bite') {
      if (wind) { lift = -0.32; J.set('chest', 0.2); J.set('neck', 0.38, look * 0.4, 0); J.set('jaw', 0.75); legs(-0.3, 0.7, 0.45, -0.8); }
      else if (hit) { J.set('neck', -0.12); J.set('jaw', this.t < 0.14 ? 0.95 : 0); J.set('chest', 0.1); legs(-0.9, 0.2, 0.9, -0.2); rate = 34; }
      else { lift = -0.15; J.set('neck', 0.3); }
    } else if (id === 'pounce') {
      if (wind) { lift = -0.56; J.set('chest', 0.26); J.set('hips', -0.22); legs(-0.5, 1.1, 0.6, -1.2); tw(1, 0.9); tw(2, 0.4); J.set('jaw', 0.3); }
      else if (hit) { const u = clamp01(this.t / 0.72); J.set('chest', lerp(-0.35, 0.3, u)); J.set('hips', lerp(-0.2, 0.25, u)); legs(-1.4, 0.2, 1.15, -0.2); J.set('jaw', 0.8); tw(1, 0.3); rate = 26; }
      else { lift = -0.36 * (1 - clamp01(this.t / 0.6)); legs(-0.4, 0.8, 0.4, -0.8); }
    } else if (id === 'tail') {
      if (wind) { J.set('neck', 0, (R.ang > 0 ? -1 : 1) * 1.0, 0); tw(1, 0.15); tw(2, 0); tw(3, 0); tw(4, 0); lift = -0.1; }
      else if (hit) { spin = -Math.PI * 2 * clamp01(this.t / 0.36); J.set('tail1', 0.05); J.set('tail2', 0); J.set('tail3', 0); J.set('tail4', 0); rate = 40; }
    } else if (id === 'roar') {
      if (wind) { lift = -0.26; J.set('neck', 0.32); J.set('jaw', 0.2); }
      else if (hit) { J.set('neck', -0.78, 0, Math.sin(t * 50) * 0.04); J.set('jaw', 1.0); J.set('chest', -0.25); rate = 28; }
    } else if (id === 'blades') {
      if (wind) { J.set('neck', -0.92); J.set('jaw', 0.6); lift = 0.1; legs(0.15, 0, -0.15, 0); tw(1, 0.8); }
      else if (hit) { J.set('neck', 0.3); J.set('jaw', 0.95); J.set('chest', 0.15); rate = 30; }
    } else if (id === 'dive') { lift = -0.5; J.set('neck', 0.5); if (st === 'recover') { lift = -0.3 * (1 - clamp01(this.t / 0.7)); legs(-0.4, 0.8, 0.4, -0.8); } }
    else if (sp > 0.5) { // 걷기·달리기
      this.ph += dt * sp * 1.25; const run = sp > 5.5;
      gait(J, this.ph, Math.min(1, sp / 4.6), run);
      J.add3('chest', run ? Math.sin(this.ph) * 0.1 : 0, Math.sin(this.ph) * 0.07, 0); J.add3('hips', run ? -Math.sin(this.ph) * 0.1 : 0, -Math.sin(this.ph) * 0.07, 0);
      lift += Math.abs(Math.sin(this.ph)) * (run ? 0.1 : 0.03);
    }
    J.lift('body', lift);
    J.update(dt, rate);
    // 먹에 잠기기·솟아오르기
    this.sink = this.sunk ? damp(this.sink, 3.6, 7, dt) : Math.max(0, this.sink - dt * (G.state === 'cine' ? 2.4 : 6));
    this.sk.root.position.y = -this.sink; this.sk.root.rotation.y = spin; this.shadow.visible = this.sink < 1.5;
    if (this.sink > 0.3 && !this.sunk && Math.random() < dt * 40) { _a.set(this.pos.x + rand(-1.6, 1.6), this.pos.y + rand(0.2, 1.6), this.pos.z + rand(-1.6, 1.6)); P.ink.spawn(_a.x, _a.y, _a.z, rand(-1, 1), rand(-2, 1), rand(-1, 1), rand(0.06, 0.16), rand(0.5, 0.9), HEX.ink, 14, 0.5, 1); }
  }
}
