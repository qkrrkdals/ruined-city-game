// 주인공(밑그림): 이동·여백(회피)·피격·회복·조준 고정·자세. 공격 실행은 player_act.js.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { CFG } from '../core/config.js';
import { F } from '../world/field.js';
import { buildHumanoid } from './humanoid.js';
import { newPose, lerpPose, copyPose, applyPose } from './rig.js';
import * as HA from './hanim.js';
import { MOVES } from './moves.js';
import { startMove, updateMove, tryActions, moveAngles } from './player_act.js';
import { P } from '../gfx/particles.js';
import { Slash } from '../gfx/slash.js';
import { HEX } from '../gfx/palette.js';
import { clamp01, damp, dampAngle, approachAngle, smoothstep, lerp, ease, rand } from '../core/util.js';

const _w = { x: 0, z: 0 }, _v = new THREE.Vector3();
const pc = CFG.player;

export function createPlayer() {
  const rig = buildHumanoid('hero');
  const group = new THREE.Group(); group.add(rig.root); G.gfx.scene.add(group);
  const p = {
    group, rig, pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: Math.PI, yawGoal: Math.PI,
    st: 'move', t: 0, move: null, hit: new Set(), alive: true, armed: true, frozen: false,
    hp: pc.hp, maxHp: pc.hp, ink: 0, inkMax: pc.inkMax, heals: pc.heal.charges, healsMax: pc.heal.charges,
    atkMul: 1, inkGain: 1, healMul: 1, perfectBonus: 0, lowHpBoost: 0, finHeal: 0.06,
    arts: { dot: false, wave: false, smash: false }, artCd: { dot: 0, wave: 0, smash: 0 },
    inv: 0, dodges: pc.dodge.charges, dodgeCd: 0, boostT: 0, empowered: false, comboCount: 0, comboT: 0,
    lungeLeft: 0, lungeV: 0, jumpY: 0, combatT: 99, combatW: 0, moveW: 0, runPh: 0, charge: 0, chargeLv: 0,
    dodgeDir: { x: 0, z: 1 }, knock: new THREE.Vector3(), radius: pc.radius, height: 1.7,
    poseCur: newPose(), poseFrom: newPose(), poseOut: newPose(), poseA: newPose(), poseB: newPose(), blendT: 1, blendDur: 0.1,
    atk() { return pc.atk * this.atkMul * (this.lowHpBoost && this.hp / this.maxHp < 0.35 ? 1 + this.lowHpBoost : 1) * CFG.difficulty[G.difficulty || 'normal'].dealt; },
    blend(dur) { copyPose(this.poseOut, this.poseFrom); this.blendT = 0; this.blendDur = dur; },
    gainInk(a) { const before = this.ink; this.ink = Math.min(this.inkMax, this.ink + a * this.inkGain); if (Math.floor(this.ink) > Math.floor(before)) G.audio.play('inkFull'); },
    healBy(a) { this.hp = Math.min(this.maxHp, this.hp + a); },
    setState(st, blend = 0.1) { this.st = st; this.t = 0; this.blend(blend); this.rig.root.rotation.y = 0; this.rig.root.scale.set(1, 1, 1); if (st !== 'attack' && st !== 'finisher') { this.move = null; this.jumpY = 0; } },
    place(x, z, yaw) { this.pos.set(x, F.h(x, z), z); this.vel.set(0, 0, 0); if (yaw !== undefined) { this.yaw = this.yawGoal = yaw; } this.group.position.copy(this.pos); },
    faceTo(x, z) { this.yaw = this.yawGoal = Math.atan2(x - this.pos.x, z - this.pos.z); },
    fullRestore() { this.hp = this.maxHp; this.heals = this.healsMax; this.dodges = pc.dodge.charges; },
    respawn(x, z, yaw) { this.alive = true; this.fullRestore(); this.ink = Math.min(this.ink, this.inkMax); this.inv = 1.5; this.setState('move', 0); this.place(x, z, yaw); G.cam.target = null; },

    // 맞았을 때. 피했으면 false
    takeHit(info) {
      if (!this.alive || G.state !== 'play' || this.st === 'finisher' || this.frozen) return false;
      if (this.st === 'dodge' && this.t < pc.dodge.iEnd) {
        if (this.t <= pc.dodge.perfect + this.perfectBonus && !this.perfectDone) this.perfect();
        return false;
      }
      if (this.inv > 0) return false;
      if (G.god) return false;
      const dmg = Math.max(1, Math.round(info.dmg * CFG.difficulty[G.difficulty || 'normal'].taken));
      this.hp -= dmg; this.combatT = 0;
      const dir = info.dir || _v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(-1);
      const pw = info.power || 1;
      G.fx.hurt(0.45 + pw * 0.15); G.fx.hitstop(CFG.combat.hitstop.hurt + (pw >= 3 ? 0.05 : 0)); G.cam.shake(0.3 + pw * 0.15); G.cam.punch(dir, 0.03 * pw);
      G.fx.flash(rig.mats, 0.12, 0.9, HEX.red);
      _v.copy(this.pos); _v.y += 1.1; P.inkBurst(_v, 8 + pw * 4, 5, dir, HEX.ink); P.paperBurst(_v, 4 + pw * 2, 4);
      G.audio.play('hurt', { power: pw });
      if (G.ui && G.ui.number) G.ui.number(_v, dmg, 'hurt');
      this.charge = 0;
      if (this.hp <= 0) { this.hp = 0; this.die(); return true; }
      if (this.move && this.move.armor && this.st === 'attack') { this.inv = 0.3; return true; }
      this.knock.set(dir.x, 0, dir.z).multiplyScalar(pw >= 3 ? 11 : 6.5);
      this.inv = pw >= 3 ? pc.hurt.down + 0.6 : pc.hurt.inv;
      this.setState(pw >= 3 ? 'down' : 'hurt', 0.05);
      G.cam.distMul = 1;
      return true;
    },
    perfect() {
      this.perfectDone = true; this.boostT = pc.perfect.boostDur; this.gainInk(pc.perfect.ink + (this.perfectInk || 0));
      G.fx.slowmo(pc.perfect.slow, pc.perfect.dur); G.fx.playerFree = pc.perfect.dur; G.fx.blank(pc.perfect.dur * 0.9);
      G.audio.play('perfect'); this.dodges = pc.dodge.charges;
      if (G.ui && G.ui.flashWord) G.ui.flashWord('perfect');
      G.emit('perfect');
    },
    die() {
      this.alive = false; this.setState('dead', 0.15); this.vel.set(0, 0, 0); G.cam.target = null; G.cam.distMul = 1;
      G.audio.play('death'); G.emit('playerDead');
    },

    update(dt) {
      if (this.inv > 0) this.inv -= dt;
      if (this.boostT > 0) this.boostT -= dt;
      if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.comboCount = 0; }
      for (const k in this.artCd) if (this.artCd[k] > 0) this.artCd[k] -= dt;
      if (this.dodges < pc.dodge.charges) { this.dodgeCd -= dt; if (this.dodgeCd <= 0) { this.dodges++; this.dodgeCd = pc.dodge.recharge; } }
      this.combatT += dt; this.t += dt;
      const I = G.input, active = G.state === 'play' && !this.frozen && this.alive;
      const hasWish = active ? wish(_w) : 0;
      let speed = 0;
      switch (this.st) {
        case 'move': {
          if (active && tryActions(this, hasWish, _w)) break;
          const tgt = G.cam.target, sprint = active && hasWish && I.down('sprint');
          speed = hasWish ? (sprint ? pc.sprint : tgt ? pc.lockSpeed : pc.run) : 0;
          this.sprinting = sprint;
          steer(this, _w.x, _w.z, speed, dt);
          if (tgt && tgt.alive && !sprint) this.yaw = dampAngle(this.yaw, Math.atan2(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z), 14, dt);
          else if (hasWish) this.yaw = dampAngle(this.yaw, Math.atan2(_w.x, _w.z), pc.turn, dt);
          break;
        }
        case 'charge': {
          // 굵은 획을 모으는 중: 천천히 걷고, 떼면 나간다
          this.charge += dt; this.combatT = 0;
          steer(this, _w.x, _w.z, hasWish ? pc.chargeSpeed : 0, dt);
          const tgt = G.cam.target;
          if (tgt && tgt.alive) this.yaw = dampAngle(this.yaw, Math.atan2(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z), 10, dt);
          else if (hasWish) this.yaw = dampAngle(this.yaw, Math.atan2(_w.x, _w.z), 9, dt);
          const lv = this.charge >= 1.05 ? 2 : this.charge >= 0.5 ? 1 : 0;
          if (lv > this.chargeLv) { this.chargeLv = lv; G.fx.flash(rig.mats, 0.14, 0.7); G.audio.play('chargeLv', { lv }); tipPos(this, _v); P.sparks(_v, 10, 6, lv === 2 ? HEX.red : HEX.white); }
          if (this.charge > 0.25 && Math.random() < dt * 30) { tipPos(this, _v); P.ink.spawn(_v.x + rand(-0.7, 0.7), _v.y + rand(-0.5, 0.7), _v.z + rand(-0.7, 0.7), 0, 0, 0, 0.06, 0.25, HEX.ink, 0, 0, 0); }
          if (active && I.tap('dodge', pc.buffer) && this.dodges > 0) { startDodge(this, hasWish, _w); break; }
          if (!active || !I.down('heavy') || this.charge > 2.2) {
            const id = this.chargeLv === 2 ? 'HC2' : this.chargeLv === 1 ? 'HC' : 'H';
            startMove(this, id, { t0: id === 'H' ? Math.min(this.charge, MOVES.H.sp.tw * 0.9) : 0, wish: hasWish ? _w : null });
            this.charge = 0; this.chargeLv = 0;
          }
          break;
        }
        case 'attack': case 'finisher': updateMove(this, dt, active, hasWish, _w); break;
        case 'dodge': {
          const d = pc.dodge, u = this.t / d.dur;
          const v = (d.dist / d.dur) * 2 * Math.max(0, 1 - u);
          this.vel.set(this.dodgeDir.x * v, 0, this.dodgeDir.z * v);
          rig.root.scale.x = 1 - 0.86 * Math.sin(clamp01(u * 1.15) * Math.PI);
          rig.root.rotation.y = ease.out2(clamp01(u * 1.1)) * Math.PI * 2;
          if (Math.random() < dt * 40) { _v.copy(this.pos); _v.y += rand(0.3, 1.5); P.paper.spawn(_v.x, _v.y, _v.z, rand(-1, 1), rand(0, 1.5), rand(-1, 1), rand(0.08, 0.16), rand(0.3, 0.6), HEX.white, 2, 2, 0); }
          if (this.t >= d.cancel && active) {
            if (this.armed && I.tap('attack', pc.buffer)) { rig.root.scale.x = 1; rig.root.rotation.y = 0; startMove(this, 'DA', { wish: hasWish ? _w : null }); break; }
            if (I.tap('dodge', 0.18) && this.dodges > 0) { startDodge(this, hasWish, _w); break; }
          }
          if (this.t >= d.dur) this.setState('move', 0.12);
          break;
        }
        case 'hurt': decay(this.vel, 10, dt); if (this.t >= pc.hurt.stun) this.setState('move', 0.14); break;
        case 'down': decay(this.vel, 6, dt); if (this.t >= pc.hurt.down) this.setState('move', 0.16); break;
        case 'heal': {
          steer(this, _w.x, _w.z, hasWish ? pc.healSpeed : 0, dt);
          if (hasWish) this.yaw = dampAngle(this.yaw, Math.atan2(_w.x, _w.z), 8, dt);
          if (!this.healed && this.t >= pc.heal.at) {
            this.healed = true; this.heals--; this.healBy(this.maxHp * pc.heal.frac * this.healMul);
            G.audio.play('heal'); G.fx.flash(rig.mats, 0.3, 0.5, 0x9fd0e8);
            _v.copy(this.pos); _v.y += 1.2; P.sparks(_v, 14, 4, 0x8fc4e0);
          }
          if (active && this.t > 0.2 && I.tap('dodge', pc.buffer) && this.dodges > 0) { startDodge(this, hasWish, _w); break; }
          if (this.t >= pc.heal.dur) this.setState('move', 0.15);
          break;
        }
        case 'dead': this.vel.set(0, 0, 0); break;
        default: steer(this, 0, 0, 0, dt);
      }
      // 넉백
      if (this.knock.lengthSq() > 0.01) { this.pos.addScaledVector(this.knock, dt); decay(this.knock, 9, dt); }
      // 이동·충돌
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
      if (this.st !== 'dodge' && this.st !== 'finisher' && G.enemies) pushOut(this);
      F.resolve(this.pos, this.radius);
      this.pos.y = F.h(this.pos.x, this.pos.z);
      const sp = Math.hypot(this.vel.x, this.vel.z);
      // 발소리
      if (this.st === 'move' && sp > 1) {
        const prev = this.runPh; this.runPh += dt * sp * (Math.PI * 2 / (4 * (0.34 + 0.15 * sp / pc.run)));
        if (Math.floor(prev / Math.PI) !== Math.floor(this.runPh / Math.PI)) { G.audio.play('step', { fast: sp > 7.5, wet: this.wet }); if (sp > 7.5) P.dust(this.pos, 1, 0.5); }
      }
      this.wet = F.zone(this.pos.x, this.pos.z) === 4 && this.pos.y < 0.95;
      // 모델
      group.position.set(this.pos.x, this.pos.y + this.jumpY, this.pos.z);
      group.rotation.y = this.yaw;
      pose(this, dt, sp);
      rig.j.weapon.visible = this.armed;
      // 일필휘지 준비: 붓끝에 붉은 기운
      if (this.boostT > 0 && Math.random() < dt * 24) { tipPos(this, _v); P.sparks(_v, 1, 2, HEX.red); }
    },
  };

  function pose(p, dt, sp) {
    const C = p.poseCur, t = G.time;
    p.combatW = damp(p.combatW, p.combatT < 4.5 && p.armed ? 1 : 0, 6, dt);
    p.moveW = damp(p.moveW, sp > 0.5 ? 1 : 0, 14, dt);
    switch (p.st) {
      case 'attack': case 'finisher': {
        const m = p.move, s = m.sp;
        if (m.kind === 'thrust') HA.thrust(C, s, p.t); else HA.swing(C, s, p.t);
        // 끝나갈 때 겨눔 자세로 돌아온다
        const rec = smoothstep(s.ts + (s.dur - s.ts) * 0.45, s.dur, p.t);
        if (rec > 0) lerpPose(C, HA.guard(p.poseA, t), rec * 0.8, C);
        if (m.leap) { const u = clamp01((p.t - 0.02) / (s.ts - 0.02)); C.fl[1] += 0.25 * Math.sin(u * Math.PI); C.fr[1] += 0.35 * Math.sin(u * Math.PI); }
        if (m.spin) rig.root.rotation.y = m.spin * Math.PI * 2 * moveAngles(p).e;
        break;
      }
      case 'charge': {
        HA.swing(C, MOVES.H.sp, Math.min(p.charge, MOVES.H.sp.tw));
        const sh = Math.min(1, p.charge) * 0.012; C.hr[0] += rand(-sh, sh); C.hr[1] += rand(-sh, sh); C.hy -= 0.04 * Math.min(1, p.charge);
        break;
      }
      case 'dodge': HA.tuck(C); break;
      case 'hurt': HA.hurt(C, p.t / pc.hurt.stun); break;
      case 'down': HA.down(C, p.t / pc.hurt.down); break;
      case 'heal': HA.drink(C, p.t / pc.heal.dur); if (sp > 0.5) { HA.run(p.poseA, p.runPh, 0.4, 0, 1, true); for (let i = 0; i < 3; i++) { C.fl[i] = p.poseA.fl[i]; C.fr[i] = p.poseA.fr[i]; } } break;
      case 'dead': HA.collapse(C, p.t / 1.1); break;
      default: {
        HA.stand(p.poseA, t); if (!p.armed) { p.poseA.hr[0] = -0.28; p.poseA.hr[1] = 0.8; p.poseA.hr[2] = 0.04; }
        if (p.combatW > 0.01) lerpPose(p.poseA, HA.guard(p.poseB, t), p.combatW, p.poseA);
        if (p.moveW > 0.01) {
          const s = Math.sin(p.yaw), c = Math.cos(p.yaw), f = p.vel.x * s + p.vel.z * c, r = -p.vel.x * c + p.vel.z * s, l = Math.max(sp, 0.01);
          HA.run(p.poseB, p.runPh, Math.max(0.35, sp / pc.run), -r / l, f / l, p.armed);
          if (p.combatW > 0.5 && G.cam.target) { const h = p.poseB.hr, wv = p.poseB.wd; h[0] = -0.25; h[1] = 0.98; h[2] = 0.05; wv[0] = 0.3; wv[1] = 0.42; wv[2] = 0.85; p.poseB.grip = 1; }
          lerpPose(p.poseA, p.poseB, p.moveW, C);
        } else copyPose(p.poseA, C);
      }
    }
    if (p.blendT < 1) { p.blendT = Math.min(1, p.blendT + dt / p.blendDur); const k = p.blendT * p.blendT * (3 - 2 * p.blendT); lerpPose(p.poseFrom, C, k, p.poseOut); }
    else copyPose(C, p.poseOut);
    applyPose(rig, p.poseOut);
  }
  G.player = p;
  return p;
}

// 카메라 기준 이동 입력 → 세계 방향
function wish(out) {
  const I = G.input, ix = I.axisX(), iy = I.axisY();
  if (!ix && !iy) { out.x = 0; out.z = 0; return 0; }
  const cy = G.cam.yaw, x = -Math.sin(cy) * iy + Math.cos(cy) * ix, z = -Math.cos(cy) * iy - Math.sin(cy) * ix, l = Math.hypot(x, z);
  out.x = x / l; out.z = z / l; return 1;
}
function steer(p, wx, wz, speed, dt) {
  const tx = wx * speed, tz = wz * speed, dvx = tx - p.vel.x, dvz = tz - p.vel.z, dv = Math.hypot(dvx, dvz);
  const a = (speed > 0.1 ? pc.accel : pc.decel) * dt;
  if (dv <= a) { p.vel.x = tx; p.vel.z = tz; } else { p.vel.x += (dvx / dv) * a; p.vel.z += (dvz / dv) * a; }
}
function decay(v, k, dt) { const f = Math.exp(-k * dt); v.x *= f; v.z *= f; }
function pushOut(p) {
  const list = G.enemies.list;
  for (let i = 0; i < list.length; i++) {
    const e = list[i]; if (!e.alive || !e.solid) continue;
    const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, d = Math.hypot(dx, dz), min = e.radius + p.radius;
    if (d < min && d > 1e-4) { const k = (min - d) / d; p.pos.x += dx * k * 0.8; p.pos.z += dz * k * 0.8; }
  }
}
export function startDodge(p, hasWish, w) {
  const d = pc.dodge;
  if (hasWish) { p.dodgeDir.x = w.x; p.dodgeDir.z = w.z; } else { p.dodgeDir.x = -Math.sin(p.yaw); p.dodgeDir.z = -Math.cos(p.yaw); }
  p.setState('dodge', 0.05); p.dodges--; p.dodgeCd = d.recharge; p.perfectDone = false; p.charge = 0; p.chargeLv = 0; G.cam.distMul = 1;
  if (!G.cam.target && hasWish) p.yaw = Math.atan2(w.x, w.z);
  G.audio.play('dodge');
  Slash.line({ pos: p.pos, c: [0, 0.12, 0], dir: [p.dodgeDir.x, 0, p.dodgeDir.z], side: [-p.dodgeDir.z, 0, p.dodgeDir.x], len: d.dist * 0.9, width: 0.7, color: 0x8f8a80, reveal: 0.16, fade: 0.4, dry: 0.95, opacity: 0.5 });
  G.emit('dodge');
}
// 붓끝의 세계 좌표
export function tipPos(p, out) { out.set(0, p.rig.dim.tip, 0); return p.rig.j.weapon.localToWorld(out); }
