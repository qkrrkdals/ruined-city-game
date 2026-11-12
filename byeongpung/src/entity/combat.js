// 전투 공용: 판정 도형, 타격 연출, 공격 순번(동시에 덤비는 적 수 제한), 떠오르는 숫자.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { CFG } from '../core/config.js';
import { P } from '../gfx/particles.js';
import { HEX } from '../gfx/palette.js';
import { wrapAngle, rand } from '../core/util.js';

const _v = new THREE.Vector3(), _hp = new THREE.Vector3();

// (px,pz,yaw) 기준으로 본 (tx,tz): f=앞쪽 거리, r=오른쪽 거리, ang=오른쪽이 +
export function rel(px, pz, yaw, tx, tz, out) {
  const dx = tx - px, dz = tz - pz, s = Math.sin(yaw), c = Math.cos(yaw);
  out.f = dx * s + dz * c; out.r = -dx * c + dz * s; out.dist = Math.hypot(dx, dz); out.ang = Math.atan2(out.r, out.f);
  return out;
}
const R = { f: 0, r: 0, dist: 0, ang: 0 };

// 도형 안에 (tx,tz, 반지름 tr)이 있는가. shape: sector{r,half,off} | line{len,w} | circle{r,fwd}
export function inShape(sh, px, pz, yaw, tx, tz, tr) {
  rel(px, pz, yaw, tx, tz, R);
  if (sh.kind === 'sector') {
    if (R.dist > sh.r + tr || R.dist < (sh.r0 || 0) - tr) return false;
    if (R.dist < tr + 0.4) return true;
    const slack = Math.asin(Math.min(1, tr / Math.max(R.dist, 0.01)));
    return Math.abs(wrapAngle(R.ang - (sh.off || 0))) <= sh.half + slack;
  }
  if (sh.kind === 'line') return R.f > -tr - (sh.back || 0) && R.f < sh.len + tr && Math.abs(R.r) < sh.w + tr;
  if (sh.kind === 'circle') { const f = sh.fwd || 0; return Math.hypot(R.f - f, R.r) < sh.r + tr; }
  return false;
}

export const Combat = {
  attackers: new Set(), lastStart: -9,
  // 적이 공격을 시작해도 되는지(순번). heavy 는 혼자만
  request(e) {
    for (const a of this.attackers) if (!a.alive || !a.attacking) this.attackers.delete(a);
    if (this.attackers.has(e)) return true;
    if (this.attackers.size >= CFG.combat.tokens || G.time - this.lastStart < 0.45) return false;
    this.attackers.add(e); this.lastStart = G.time; return true;
  },
  release(e) { this.attackers.delete(e); },
  reset() { this.attackers.clear(); },

  // 주인공의 공격이 적에게 닿았을 때의 연출
  hitFx(e, info) {
    const p = G.player, pw = info.power || 1;
    _hp.copy(e.pos); _hp.y += (e.height || 1.4) * 0.55;
    _v.set(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z).normalize();
    _hp.addScaledVector(_v, e.radius * 0.7);
    const dir = info.dir;
    if (info.blocked) {
      P.sparks(_hp, 10, 11, HEX.white); G.cam.shake(0.14); G.fx.hitstop(0.05); G.audio.play('clang');
      this.number(_hp, G.text ? G.text.ui.blocked : '', 'block');
      return;
    }
    P.inkBurst(_hp, 5 + pw * 5 + (info.kill ? 12 : 0), 5 + pw * 2.2, dir, e.inkColor || HEX.ink);
    P.sparks(_hp, 4 + pw * 4, 12 + pw * 3, info.crit ? HEX.red : HEX.white, dir);
    if (pw >= 2 || info.kill) P.paperBurst(_hp, pw * 3 + (info.kill ? 8 : 0), 4 + pw);
    P.puffs(_hp, 1 + pw, 0.5 + pw * 0.25, HEX.ink, 0.25, 0.3);
    const hs = CFG.combat.hitstop;
    G.fx.hitstop(pw >= 3 ? hs.big : pw === 2 ? hs.heavy : hs.light);
    G.cam.shake(0.12 + pw * 0.13 + (info.crit ? 0.15 : 0));
    if (dir) G.cam.punch(dir, 0.012 + pw * 0.014);
    if (pw >= 2) G.cam.zoomPunch(pw * 0.9);
    G.audio.play('hit', { power: pw, note: info.note || 0, crit: info.crit, kill: info.kill });
    this.number(_hp, Math.round(info.dmg), info.crit ? 'crit' : pw >= 2 ? 'heavy' : '');
  },
  // 떠오르는 숫자(UI 가 있으면)
  number(pos, text, cls) { if (G.ui && G.ui.number) G.ui.number(pos, text, cls); },
};

// 범위 안에서 가장 알맞은 적을 고른다(자동 조준). dirYaw 기준 각도와 거리를 함께 본다.
export function pickTarget(px, pz, dirYaw, range, maxAng) {
  let best = null, bs = 1e9;
  const list = G.enemies ? G.enemies.list : [];
  for (let i = 0; i < list.length; i++) {
    const e = list[i]; if (!e.alive || !e.targetable) continue;
    rel(px, pz, dirYaw, e.pos.x, e.pos.z, R);
    const d = R.dist - e.radius; if (d > range) continue;
    const a = Math.abs(R.ang); if (a > maxAng && d > 1.2) continue;
    const s = a * 2.2 + d * 0.35 + (e === G.cam.target ? -1.5 : 0);
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}
export { rand };
