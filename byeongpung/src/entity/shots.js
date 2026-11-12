// 투사체: 주인공의 먹 칼날(삐침), 적이 뱉는 먹 덩이, 땅을 달리는 칼날.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { CFG } from '../core/config.js';
import { F } from '../world/field.js';
import { Combat } from './combat.js';
import { Slash } from '../gfx/slash.js';
import { P } from '../gfx/particles.js';
import { ico } from '../gfx/geo.js';
import { basicMat } from '../gfx/materials.js';
import { HEX } from '../gfx/palette.js';

const _d = new THREE.Vector3(), _p = new THREE.Vector3();

export function createShots() {
  const list = [];
  const globGeo = ico(0.3, 1, 0x15151b, null, 0.15), globMat = basicMat({}, { keep: true });
  const globPool = [];
  function globMesh() { let m = globPool.pop(); if (!m) m = new THREE.Mesh(globGeo, globMat); G.gfx.scene.add(m); m.visible = true; return m; }
  const S = {
    list,
    // 주인공의 삐침: 앞으로 날아가는 초승달 먹 칼날
    wave(p, w, crit) {
      const yaw = p.yaw, sn = Math.sin(yaw), cs = Math.cos(yaw), k = crit ? 1.3 : 1;
      const fx = Slash.arc({ pos: _p.set(p.pos.x + sn * 0.6, p.pos.y, p.pos.z + cs * 0.6), yaw, c: [0, 1.0, -1.2 * k], tilt: 0.3, a0: -1.0, a1: 1.0, r0: 1.5 * k, r1: 2.5 * k, color: crit ? HEX.red : 0x16161f, reveal: 0, hold: 9, fade: 0.2, dry: 0.45 });
      fx.vel = new THREE.Vector3(sn * w.speed, 0, cs * w.speed);
      list.push({ kind: 'wave', fx, x: p.pos.x + sn * 0.6, z: p.pos.z + cs * 0.6, vx: sn * w.speed, vz: cs * w.speed, left: w.range, r: w.r * k, w, crit, hit: new Set(), yaw });
      G.audio.play('wave');
    },
    // 적의 먹 덩이. o: { from:Vector3, to:Vector3, speed, arc(곡사 높이), dmg, r, power, owner }
    glob(o) {
      const m = globMesh(); m.position.copy(o.from); m.scale.setScalar(o.size || 1);
      const dx = o.to.x - o.from.x, dz = o.to.z - o.from.z, d = Math.hypot(dx, dz) || 1, T = d / o.speed;
      list.push({ kind: 'glob', m, t: 0, T, from: o.from.clone(), to: o.to.clone(), arc: o.arc || 0, dmg: o.dmg, r: o.r || 0.9, power: o.power || 1, owner: o.owner, splash: o.splash || 0 });
    },
    // 땅을 달리는 붉은 먹 칼날(범의 줄무늬). 미리 붉은 선으로 예고한 뒤 지나간다.
    blade(o) {
      const sn = Math.sin(o.yaw), cs = Math.cos(o.yaw);
      Slash.line({ pos: _p.set(o.x, F.hr(o.x, o.z) + 0.12, o.z), c: [0, 0, 0], dir: [sn, 0, cs], side: [-cs, 0, sn], len: o.range, width: 1.1, color: HEX.red, reveal: o.delay * 0.6, hold: o.delay * 0.4, fade: 0.25, dry: 0.8, opacity: 0.55, flat: 1 });
      list.push({ kind: 'blade', t: -o.delay, x: o.x, z: o.z, vx: sn * o.speed, vz: cs * o.speed, left: o.range, dmg: o.dmg, r: o.r || 1.1, power: o.power || 2, yaw: o.yaw, owner: o.owner, fx: null, done: false });
    },
    clear() { for (const s of list) end(s, true); list.length = 0; },
    update(dt) {
      const p = G.player;
      for (let i = list.length - 1; i >= 0; i--) {
        const s = list[i];
        if (s.kind === 'wave') {
          const step = Math.hypot(s.vx, s.vz) * dt; s.x += s.vx * dt; s.z += s.vz * dt; s.left -= step;
          const es = G.enemies.list;
          for (let j = 0; j < es.length; j++) {
            const e = es[j]; if (!e.alive || !e.hittable || s.hit.has(e)) continue;
            if (Math.hypot(e.pos.x - s.x, e.pos.z - s.z) < s.r + e.radius) {
              s.hit.add(e); _d.set(s.vx, 0, s.vz).normalize();
              const info = { dmg: p.atk() * s.w.dmg * (s.crit ? CFG.player.perfect.boost : 1), pos: s.w.pos, power: 2, dir: _d, crit: s.crit, note: p.comboCount, guardBreak: true, from: p };
              const res = e.takeHit(info) || {}; info.kill = res.kill; info.blocked = res.blocked; info.dmg = res.dmg ?? info.dmg; Combat.hitFx(e, info);
              if (!res.blocked) { p.gainInk(CFG.player.ink.light); p.comboCount++; p.comboT = 2.4; }
            }
          }
          if (Math.random() < dt * 40) { _p.set(s.x, F.hr(s.x, s.z) + 0.1, s.z); P.ink.spawn(_p.x, _p.y + 0.6, _p.z, 0, 1, 0, 0.08, 0.4, HEX.ink, 9, 1, 1); }
          if (s.left <= 0 || F.sdf(s.x, s.z) > 1.5) { s.fx.hold = 0; s.fx.t = s.fx.reveal; s.fx.vel = null; list.splice(i, 1); }
        } else if (s.kind === 'glob') {
          s.t += dt; const u = Math.min(1, s.t / s.T);
          s.m.position.lerpVectors(s.from, s.to, u); s.m.position.y += Math.sin(u * Math.PI) * s.arc; s.m.rotation.x += dt * 9; s.m.rotation.z += dt * 7;
          if (Math.random() < dt * 30) P.ink.spawn(s.m.position.x, s.m.position.y, s.m.position.z, 0, 0, 0, 0.07, 0.3, HEX.ink, 6, 0, 0);
          const dp = Math.hypot(p.pos.x - s.m.position.x, p.pos.z - s.m.position.z), dy = Math.abs(p.pos.y + 1 - s.m.position.y);
          const near = dp < s.r && dy < 1.3;
          if (near || u >= 1) {
            if (near || (s.splash && dp < s.splash)) { _d.set(p.pos.x - s.from.x, 0, p.pos.z - s.from.z).normalize(); p.takeHit({ dmg: s.dmg, power: s.power, dir: _d, from: s.owner }); }
            _p.copy(s.m.position); P.inkBurst(_p, 12, 5, null, HEX.ink, 3); P.splat(_p.x, _p.z, 2 + (s.splash || 0)); G.audio.play('splat');
            end(s); list.splice(i, 1);
          }
        } else if (s.kind === 'blade') {
          s.t += dt;
          if (s.t < 0) continue;
          if (!s.fx) { s.fx = Slash.arc({ pos: _p.set(s.x, F.hr(s.x, s.z), s.z), yaw: s.yaw, c: [0, 0.9, -1.0], tilt: 1.35, a0: -0.9, a1: 0.9, r0: 1.3, r1: 2.3, color: 0x2a0806, reveal: 0, hold: 9, fade: 0.15, dry: 0.4 }); s.fx.vel = new THREE.Vector3(s.vx, 0, s.vz); G.audio.play('eSwing', { big: true }); }
          const step = Math.hypot(s.vx, s.vz) * dt; s.x += s.vx * dt; s.z += s.vz * dt; s.left -= step;
          s.fx.mesh.position.y = F.hr(s.x, s.z);
          if (!s.done && Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < s.r + p.radius) { s.done = true; _d.set(s.vx, 0, s.vz).normalize(); p.takeHit({ dmg: s.dmg, power: s.power, dir: _d, from: s.owner }); }
          if (s.left <= 0) { s.fx.hold = 0; s.fx.t = s.fx.reveal; s.fx.vel = null; list.splice(i, 1); }
        }
      }
    },
  };
  function end(s, kill) { if (s.m) { s.m.visible = false; G.gfx.scene.remove(s.m); globPool.push(s.m); } if (s.fx && kill) Slash.kill(s.fx); }
  return S;
}
