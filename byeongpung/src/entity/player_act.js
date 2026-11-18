// 주인공의 공격 실행: 입력 → 기술 시작, 내딛기, 판정, 붓 획 이펙트, 획(기술), 맺음(마무리).
import * as THREE from 'three';
import { G } from '../core/g.js';
import { CFG } from '../core/config.js';
import { MOVES, ARTS } from './moves.js';
import { swingAngle } from './hanim.js';
import { Combat, rel, inShape, pickTarget } from './combat.js';
import { startDodge } from './player.js';
import { Slash } from '../gfx/slash.js';
import { P } from '../gfx/particles.js';
import { HEX } from '../gfx/palette.js';
import { clamp, clamp01, approachAngle, wrapAngle, lerp } from '../core/util.js';

const pc = CFG.player, TAU = Math.PI * 2;
const R = { f: 0, r: 0, dist: 0, ang: 0 }, _d = new THREE.Vector3(), _p = new THREE.Vector3();
const SH = { kind: 'line', len: 0, w: 0, r: 0, fwd: 0 };

// 이동 상태에서 누른 키를 행동으로 바꾼다. 상태가 바뀌면 true
export function tryActions(p, hasWish, w) {
  const I = G.input, buf = pc.buffer;
  if (I.tap('interact', 0.15)) {
    const e = finisherTarget(p);
    if (e) { startFinisher(p, e); return true; }
    if (G.interact && G.interact.use()) return true;
  }
  if (I.tap('dodge', buf) && p.dodges > 0) { startDodge(p, hasWish, w); return true; }
  if (I.tap('lock', 0.2)) toggleLock(p);
  if (G.cam.target && I.wheel) switchLock(p, I.wheel);
  if (I.tap('heal', buf)) {
    if (p.heals > 0 && p.hp < p.maxHp) { p.setState('heal', 0.12); p.healed = false; G.audio.play('gourd'); return true; }
    G.audio.play('deny');
  }
  if (!p.armed) return false;
  if (tryArts(p, hasWish, w)) return true;
  if (I.tap('attack', buf)) { startMove(p, p.sprinting && Math.hypot(p.vel.x, p.vel.z) > 7.6 ? 'RUN' : 'L1', { wish: hasWish ? w : null }); return true; }
  if (I.tap('heavy', buf)) { p.setState('charge', 0.1); p.charge = 0; p.chargeLv = 0; G.audio.play('charge'); return true; }
  return false;
}

function tryArts(p, hasWish, w) {
  const I = G.input;
  for (const id in ARTS) {
    const a = ARTS[id];
    if (!I.tap(a.key, pc.buffer)) continue;
    const m = MOVES[a.move];
    if (!p.arts[id]) return false;
    if (p.artCd[id] > 0 || p.ink < m.cost) { G.audio.play('deny'); if (G.ui && G.ui.denyArt) G.ui.denyArt(id, p.ink < m.cost); return false; }
    p.ink -= m.cost; p.artCd[id] = m.cd;
    startMove(p, a.move, { wish: hasWish ? w : null });
    G.audio.play('art', { id });
    G.emit('art', id);
    return true;
  }
  return false;
}

export function startMove(p, id, o = {}) {
  const m = MOVES[id];
  p.st = m.fin ? 'finisher' : 'attack'; p.t = o.t0 || 0; p.move = m; p.hit.clear();
  p.vfxDone = false; p.hitDone = false; p.endDone = false; p.jumpY = 0; p.combatT = 0;
  p.rig.root.rotation.y = 0; p.rig.root.scale.set(1, 1, 1);
  p.blend(0.07);
  p.empowered = p.boostT > 0 && !m.fin; if (p.empowered) { p.boostT = 0; G.audio.play('boost'); if (G.ui) G.ui.flashWord('boost'); }
  if (m.fin) return;
  // 조준: 입력 방향(없으면 보는 방향) 근처의 적을 향해 몸을 돌리고 거리를 맞춰 내딛는다
  const dirYaw = o.wish ? Math.atan2(o.wish.x, o.wish.z) : p.yaw;
  let tgt = G.cam.target && G.cam.target.alive ? G.cam.target : null;
  const range = m.reach + m.lunge * 1.6 + 1.5;
  if (tgt && Math.hypot(tgt.pos.x - p.pos.x, tgt.pos.z - p.pos.z) > range + 3) tgt = null;
  if (!tgt) tgt = pickTarget(p.pos.x, p.pos.z, dirYaw, range, o.wish ? 1.15 : 1.9);
  p.aimTarget = tgt;
  if (tgt) {
    p.yawGoal = Math.atan2(tgt.pos.x - p.pos.x, tgt.pos.z - p.pos.z);
    const d = Math.hypot(tgt.pos.x - p.pos.x, tgt.pos.z - p.pos.z) - tgt.radius;
    p.lungeLeft = m.dash ? Math.max(m.lunge * 0.6, Math.min(m.lunge, d + 2.2)) : clamp(d - Math.min(1.5, m.reach * 0.5), 0, m.lunge * 1.6);
  } else { p.yawGoal = dirYaw; p.lungeLeft = m.lunge * (o.wish || m.dash ? 1 : 0.65); }
  const s = m.sp, l0 = s.tw * 0.35;
  p.lungeV = p.lungeLeft / Math.max(0.04, (m.dash ? s.ts - 0.02 : s.ts) - l0);
  if (m.dash) p.inv = Math.max(p.inv, s.ts);
  G.audio.play('swing', { power: m.power, heavy: m.heavy, kind: m.kind });
}

export function moveAngles(p) { return swingAngle(p.move.sp, p.t); }

export function updateMove(p, dt, active, hasWish, w) {
  const m = p.move, s = m.sp, t = p.t, I = G.input;
  if (m.fin) return updateFinisher(p, dt);
  // 준비 동작 동안은 표적을 따라 몸을 돌린다
  if (t < s.tw + 0.03) {
    const tg = p.aimTarget;
    if (tg && tg.alive) p.yawGoal = Math.atan2(tg.pos.x - p.pos.x, tg.pos.z - p.pos.z);
    p.yaw = approachAngle(p.yaw, p.yawGoal, 28 * dt);
  }
  // 내딛기
  const l0 = s.tw * 0.35, sn = Math.sin(p.yaw), cs = Math.cos(p.yaw);
  if (t > l0 && p.lungeLeft > 0 && t < s.ts + 0.05) {
    let step = Math.min(p.lungeLeft, p.lungeV * dt);
    const tg = p.aimTarget;
    if (!m.dash && tg && tg.alive) { const d = Math.hypot(tg.pos.x - p.pos.x, tg.pos.z - p.pos.z) - tg.radius - 0.9; if (d < step) step = Math.max(0, d); }
    p.vel.set((sn * step) / dt, 0, (cs * step) / dt); p.lungeLeft -= step;
  } else p.vel.set(0, 0, 0);
  if (m.leap) p.jumpY = m.leap * Math.sin(clamp01((t - 0.02) / (s.ts - 0.02)) * Math.PI);
  // 붓 획 이펙트
  if (!p.vfxDone && t >= s.tw) { p.vfxDone = true; spawnVfx(p, m); }
  // 판정
  if (t >= s.tw && !p.hitDone) {
    const list = G.enemies ? G.enemies.list : [];
    if (!m.shape) { // 부채꼴: 붓이 지나가는 순서대로 맞는다
      const sign = Math.sign(s.a1 - s.a0) || 1, a0 = s.a0 - sign * (s.back ?? 0.35), total = Math.abs(s.a1 - a0) + 0.3;
      const prog = Math.abs(swingAngle(s, Math.min(t, s.ts)).aw - a0) + 0.3;
      const reach = m.reach * (p.empowered ? 1.15 : 1);
      for (let i = 0; i < list.length; i++) {
        const e = list[i]; if (!e.alive || !e.hittable || p.hit.has(e)) continue;
        rel(p.pos.x, p.pos.z, p.yaw, e.pos.x, e.pos.z, R);
        if (R.dist > reach + e.radius) continue;
        let dl = sign > 0 ? R.ang - a0 : a0 - R.ang; dl = ((dl % TAU) + TAU) % TAU; if (dl > TAU - 0.4) dl = 0;
        if (R.dist < e.radius + 0.9) dl = Math.min(dl, total * 0.5); // 바짝 붙은 적은 각도를 너그럽게
        if (dl <= total && prog >= dl) applyHit(p, e, m, sign);
      }
      if (t >= s.ts) p.hitDone = true;
    } else if (t >= (m.shape === 'circle' ? s.ts : lerp(s.tw, s.ts, 0.55))) {
      p.hitDone = true;
      const k = p.empowered ? 1.15 : 1;
      SH.kind = m.shape; SH.len = m.reach * k; SH.w = (m.width || 1) * k; SH.r = (m.radius || 0) * k; SH.fwd = m.fwd || 0; SH.back = m.dash ? 1 : 0;
      for (let i = 0; i < list.length; i++) {
        const e = list[i]; if (!e.alive || !e.hittable || p.hit.has(e)) continue;
        if (inShape(SH, p.pos.x, p.pos.z, p.yaw, e.pos.x, e.pos.z, e.radius)) applyHit(p, e, m, 0);
      }
    }
  }
  // 돌진 찌르기는 지나가며 맞힌다
  if (m.dash && t > l0 && t < s.ts) {
    const list = G.enemies ? G.enemies.list : [];
    SH.kind = 'line'; SH.len = 2.4; SH.w = m.width; SH.back = 0.6;
    for (let i = 0; i < list.length; i++) { const e = list[i]; if (e.alive && e.hittable && !p.hit.has(e) && inShape(SH, p.pos.x, p.pos.z, p.yaw, e.pos.x, e.pos.z, e.radius)) applyHit(p, e, m, 0); }
  }
  // 휘두름이 끝나는 순간: 내려찍기 충격, 먹 칼날
  if (!p.endDone && t >= s.ts) {
    p.endDone = true;
    if (m.slam) slamFx(p, m);
    if (m.wave && G.shots) G.shots.wave(p, m.wave, p.empowered);
    if (m.dash) { _p.set(p.pos.x + sn * 1.6, p.pos.y + 0.1, p.pos.z + cs * 1.6); P.inkBurst(_p, 16, 6, null); P.splat(_p.x, _p.z, 2.6); }
  }
  if (!active) { if (t >= s.dur) p.setState('move', 0.16); return; }
  // 다음 행동(선입력)
  if (t >= m.combo) {
    if (I.tap('dodge', pc.buffer) && p.dodges > 0) { startDodge(p, hasWish, w); return; }
    if (tryArts(p, hasWish, w)) return;
    if (I.tap('attack', pc.buffer)) { startMove(p, m.next.L || 'L1', { wish: hasWish ? w : null }); return; }
    if (I.tap('heavy', pc.buffer)) {
      if (m.next.H) { startMove(p, m.next.H, { wish: hasWish ? w : null }); return; }
      p.setState('charge', 0.1); p.charge = 0; p.chargeLv = 0; G.audio.play('charge'); return;
    }
    const e = I.peek('interact', 0.15) ? finisherTarget(p) : null;
    if (e) { I.tap('interact', 0.15); startFinisher(p, e); return; }
  } else if (t >= Math.min(m.combo, s.ts + 0.04) && !m.armor && I.tap('dodge', 0.1) && p.dodges > 0) { startDodge(p, hasWish, w); return; } // 휘두른 직후엔 회피로 끊을 수 있다
  if ((t >= m.cancel && hasWish) || t >= s.dur) p.setState('move', 0.16);
}

function applyHit(p, e, m, sign) {
  p.hit.add(e);
  const crit = p.empowered;
  const dmg = p.atk() * m.dmg * (crit ? pc.perfect.boost : 1);
  rel(p.pos.x, p.pos.z, p.yaw, e.pos.x, e.pos.z, R);
  // 밀리는 방향: 바깥쪽 + 붓이 지나간 쪽
  const rx = (e.pos.x - p.pos.x) / (R.dist || 1), rz = (e.pos.z - p.pos.z) / (R.dist || 1);
  _d.set(rx - sign * rz * 0.5, 0, rz + sign * rx * 0.5).normalize();
  const info = { dmg, pos: m.pos * (crit ? 1.8 : 1), power: Math.min(3, m.power + (crit ? 1 : 0)), dir: _d, crit, note: p.comboCount, guardBreak: m.guardBreak || crit, launch: m.launch, move: m, from: p };
  const res = e.takeHit(info) || {};
  info.blocked = res.blocked; info.kill = res.kill; info.dmg = res.dmg ?? dmg;
  Combat.hitFx(e, info);
  if (!res.blocked) { p.gainInk(m.power >= 2 ? pc.ink.heavy : pc.ink.light); if (res.kill) p.gainInk(pc.ink.kill); p.comboCount++; p.comboT = 2.4; }
  G.emit('playerHit', e, info);
}

function spawnVfx(p, m) {
  const s = m.sp, big = (m.big || 1) * (p.empowered ? 1.25 : 1), color = p.empowered ? HEX.red : 0x16161f;
  const reveal = Math.max(0.05, s.ts - s.tw);
  if (m.kind === 'thrust') {
    Slash.line({ parent: p.group, c: [-0.1, s.y ?? 1.12, 0.5], dir: [0, 0, 1], side: [0.25, 1, 0], len: m.reach * big + (m.dash ? 1 : 0), width: 0.55 * big, color, reveal, fade: 0.26, dry: 0.6 });
    if (m.dash) Slash.line({ pos: p.pos, c: [0, 0.14, 0], dir: [Math.sin(p.yaw), 0, Math.cos(p.yaw)], side: [-Math.cos(p.yaw), 0, Math.sin(p.yaw)], len: p.lungeLeft + 2.5, width: 1.1, color: 0x16161f, reveal: reveal * 1.2, fade: 0.6, dry: 0.75 });
    return;
  }
  const sign = Math.sign(s.a1 - s.a0) || 1, a0 = s.a0 - sign * (s.back ?? 0.35) * 0.5;
  Slash.arc({ parent: p.group, c: [0, s.cy ?? 1.2, 0.06], tilt: s.tilt, a0, a1: s.a1 + sign * 0.2, r0: 1.05, r1: (m.reach - 0.15) * big, color, reveal, fade: m.power >= 2 ? 0.34 : 0.26, dry: m.power >= 2 ? 0.55 : 0.75 });
  if (p.empowered) Slash.arc({ parent: p.group, c: [0, s.cy ?? 1.2, 0.06], tilt: s.tilt, a0, a1: s.a1 + sign * 0.2, r0: 1.4, r1: (m.reach - 0.5) * big, color: HEX.white, reveal, fade: 0.2, dry: 0.3, opacity: 0.9 });
}

function slamFx(p, m) {
  const sn = Math.sin(p.yaw), cs = Math.cos(p.yaw), f = (m.fwd ?? 1.6) + (m.shape === 'line' ? 1.4 : 0);
  _p.set(p.pos.x + sn * f, 0, p.pos.z + cs * f); _p.y = G.world.F.hr(_p.x, _p.z) + 0.05;
  Slash.ring({ pos: _p, r0: 0.3, r1: 0.9 + m.slam * 0.12, grow: m.slam * 5, fade: 0.32, color: 0x16161f, dry: 0.6 });
  P.inkBurst(_p, 10 + m.slam * 5, 5 + m.slam, null, HEX.ink, 4); P.dust(_p, 4 + (m.slam | 0), 0.8 + m.slam * 0.15);
  P.splat(_p.x, _p.z, 1.6 + m.slam * 0.9);
  G.cam.shake(0.25 + m.slam * 0.09); G.audio.play('slam', { size: m.slam });
}

// ── 맺음 ──
export function finisherTarget(p) {
  const list = G.enemies ? G.enemies.list : []; let best = null, bd = CFG.combat.finisherRange;
  for (let i = 0; i < list.length; i++) {
    const e = list[i]; if (!e.alive || !e.staggered) continue;
    const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) - e.radius;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function startFinisher(p, e) {
  startMove(p, 'FIN');
  p.finTarget = e; p.inv = 2.2; p.vel.set(0, 0, 0); p.charge = 0;
  const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, d = Math.hypot(dx, dz) || 1;
  p.finFrom = p.pos.clone(); p.finTo = new THREE.Vector3(e.pos.x + (dx / d) * (e.radius + 1.55), 0, e.pos.z + (dz / d) * (e.radius + 1.55));
  p.yaw = p.yawGoal = Math.atan2(-dx, -dz);
  e.beginFinish(); G.fx.slowmo(0.45, 0.32); G.cam.distMul = 0.74; G.cam.zoomPunch(4);
  G.audio.play('finStart');
}
function updateFinisher(p, dt) {
  const m = p.move, s = m.sp, t = p.t, e = p.finTarget;
  if (t < 0.18) { const u = clamp01(t / 0.16); p.pos.x = lerp(p.finFrom.x, p.finTo.x, u); p.pos.z = lerp(p.finFrom.z, p.finTo.z, u); }
  p.vel.set(0, 0, 0);
  if (!p.vfxDone && t >= s.tw) {
    p.vfxDone = true;
    Slash.arc({ parent: p.group, c: [0, 1.25, 0.06], tilt: s.tilt, a0: s.a0, a1: s.a1 - 0.25, r0: 1.0, r1: 2.9, color: 0x16161f, reveal: s.ts - s.tw, fade: 0.5, dry: 0.6 });
    G.audio.play('swing', { power: 3, heavy: true });
  }
  if (!p.hitDone && t >= lerp(s.tw, s.ts, 0.6)) {
    p.hitDone = true;
    if (e && e.alive) {
      _d.set(Math.sin(p.yaw), 0, Math.cos(p.yaw));
      const res = e.finish({ dir: _d, from: p }) || {};
      _p.copy(e.pos); _p.y += (e.height || 1.4) * 0.6;
      P.inkBurst(_p, 34, 9, _d, e.inkColor || HEX.ink, 4); P.paperBurst(_p, 16, 7); P.sparks(_p, 18, 16, HEX.red);
      _p.y = e.pos.y + (e.height || 1.4) + 0.5;
      Slash.ring({ pos: e.pos, y: 0.15, r0: 0.4, r1: 1.3, grow: 16, fade: 0.4, color: HEX.red, dry: 0.5 });
      if (G.stamp) G.stamp(_p, res.kill !== false);
      G.fx.hitstop(CFG.combat.hitstop.finisher); G.cam.shake(0.85); G.cam.punch(_d, 0.07); G.cam.zoomPunch(6);
      G.audio.play('finisher', { boss: !!e.boss });
      p.gainInk(pc.ink.finisher); p.healBy(p.maxHp * p.finHeal);
      G.emit('finisher', e);
    }
  }
  if (t >= s.ts + 0.25) G.cam.distMul = 1;
  if (t >= m.combo * 0.82) { p.setState('move', 0.2); p.inv = Math.max(p.inv, 0.4); }
}

// ── 조준 고정 ──
export function toggleLock(p) {
  if (G.cam.target) { G.cam.target = null; G.audio.play('lockOff'); return; }
  const yaw = Math.atan2(-Math.sin(G.cam.yaw), -Math.cos(G.cam.yaw));
  const e = pickTarget(p.pos.x, p.pos.z, yaw, CFG.cam.lockRange, 1.0) || pickTarget(p.pos.x, p.pos.z, yaw, 12, 3.2);
  if (e) { G.cam.target = e; G.audio.play('lockOn'); }
}
function switchLock(p, dirSign) {
  const cur = G.cam.target, list = G.enemies.list; let best = null, bs = 1e9;
  const base = Math.atan2(cur.pos.x - p.pos.x, cur.pos.z - p.pos.z);
  for (const e of list) {
    if (e === cur || !e.alive || !e.targetable || Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) > CFG.cam.lockRange) continue;
    const a = wrapAngle(Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z) - base) * dirSign * -1;
    const s = a > 0 ? a : a + TAU; if (s < bs) { bs = s; best = e; }
  }
  if (best) { G.cam.target = best; G.audio.play('lockOn'); }
}
