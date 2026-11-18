// 네발짐승 뼈대와 "목표 각도로 부드럽게 따라가는" 관절 도우미(멧돼지·범·두꺼비·학이 함께 쓴다).
import * as THREE from 'three';
import { damp } from '../../core/util.js';

export class Joints {
  constructor() { this.m = {}; this.list = []; }
  add(name, obj) { const e = { o: obj, x: 0, y: 0, z: 0, py: null, base: obj.position.clone() }; this.m[name] = e; this.list.push(e); return obj; }
  // 이번 프레임의 목표 각도를 0 으로 되돌린다
  rest() { for (const e of this.list) { e.x = e.y = e.z = 0; e.py = null; } }
  set(name, x = 0, y = 0, z = 0) { const e = this.m[name]; e.x = x; e.y = y; e.z = z; }
  add3(name, x = 0, y = 0, z = 0) { const e = this.m[name]; e.x += x; e.y += y; e.z += z; }
  lift(name, dy) { this.m[name].py = dy; }
  update(dt, k = 14) {
    for (const e of this.list) {
      const r = e.o.rotation; r.x = damp(r.x, e.x, k, dt); r.y = damp(r.y, e.y, k, dt); r.z = damp(r.z, e.z, k, dt);
      if (e.py !== null || e.o.position.y !== e.base.y) e.o.position.y = damp(e.o.position.y, e.base.y + (e.py || 0), k, dt);
    }
  }
  snap() { for (const e of this.list) { e.o.rotation.set(e.x, e.y, e.z); e.o.position.y = e.base.y + (e.py || 0); } }
}

// p: { H(어깨 높이), L(몸길이), w(다리 벌림), u·l(다리 위·아래 길이), neckLen, tail(마디 수), tailSeg }
export function quadSkeleton(p) {
  const root = new THREE.Group(), J = new Joints(), j = {};
  const mk = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); (parent || root).add(g); j[name] = g; J.add(name, g); return g; };
  mk('body', null, 0, p.H, 0);
  mk('chest', j.body, 0, 0, p.L / 2); mk('hips', j.body, 0, 0, -p.L / 2);
  mk('neck', j.chest, 0, p.neckY ?? 0.2, p.neckZ ?? 0.4); mk('head', j.neck, 0, p.headY ?? 0.1, p.neckLen ?? 0.6); mk('jaw', j.head, 0, p.jawY ?? -0.1, p.jawZ ?? 0.15);
  for (const [n, par, sx] of [['FL', 'chest', 1], ['FR', 'chest', -1], ['BL', 'hips', 1], ['BR', 'hips', -1]]) { mk('leg' + n, j[par], sx * p.w, p.legY ?? -0.1, 0); mk('shin' + n, j['leg' + n], 0, -p.u, 0); }
  let par = j.hips;
  for (let i = 1; i <= (p.tail || 0); i++) par = mk('tail' + i, par, 0, i === 1 ? (p.tailY ?? 0.2) : 0, i === 1 ? -0.3 : -p.tailSeg);
  return { root, j, J };
}

// 네발 걸음. ph=위상, amp=보폭 세기(0~1), gallop=달리기(앞·뒤 다리가 짝지어 움직인다)
export function gait(J, ph, amp, gallop = false) {
  const legs = gallop ? [['FL', 0], ['FR', 0.5], ['BL', Math.PI], ['BR', Math.PI + 0.5]] : [['FL', 0], ['BR', 0.3], ['FR', Math.PI], ['BL', Math.PI + 0.3]];
  for (const [n, off] of legs) {
    const s = Math.sin(ph + off), c = Math.cos(ph + off), front = n[0] === 'F';
    J.set('leg' + n, -s * 0.62 * amp, 0, 0);
    J.set('shin' + n, (front ? 1 : -1) * Math.max(0, c) * 0.9 * amp + (front ? 0 : 0.25 * amp), 0, 0);
  }
}
