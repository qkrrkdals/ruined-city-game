// 인간형 뼈대와 자세(pose). 자세는 "몸통 각도 + 손·발 목표점 + 무기 방향"으로 정의하고
// 팔다리는 2관절 IK 로 푼다. 자세끼리는 그대로 섞을(lerp) 수 있다.
import * as THREE from 'three';

const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3();
const _S = new THREE.Vector3(), _T = new THREE.Vector3(), _E = new THREE.Vector3(), _d = new THREE.Vector3(), _pole = new THREE.Vector3();
const _X = new THREE.Vector3(), _Y = new THREE.Vector3(), _Z = new THREE.Vector3(), _m = new THREE.Matrix4();
const _qu = new THREE.Quaternion(), _ql = new THREE.Quaternion(), _qi = new THREE.Quaternion();
const _hr = new THREE.Vector3(), _hl = new THREE.Vector3(), _wd = new THREE.Vector3(), _t2 = new THREE.Vector3();

export function newPose() {
  return {
    hx: 0, hy: 0, hz: 0, hrx: 0, hry: 0, hrz: 0,     // 골반 위치 오프셋·회전
    trx: 0, try: 0, trz: 0, hdx: 0, hdy: 0,           // 몸통·머리 회전
    hr: [-0.3, 0.95, 0.1], hl: [0.3, 0.9, 0.05],      // 오른손·왼손 목표(뿌리 좌표)
    wd: [0, 1, 0], grip: 0,                           // 무기 방향, 왼손이 자루를 잡는 정도
    fl: [0.11, 0, 0], fr: [-0.11, 0, 0],              // 왼발·오른발 목표
  };
}
const NUM = ['hx', 'hy', 'hz', 'hrx', 'hry', 'hrz', 'trx', 'try', 'trz', 'hdx', 'hdy', 'grip'];
const VEC = ['hr', 'hl', 'wd', 'fl', 'fr'];
export function lerpPose(a, b, t, out) {
  for (let i = 0; i < NUM.length; i++) { const k = NUM[i]; out[k] = a[k] + (b[k] - a[k]) * t; }
  for (let i = 0; i < VEC.length; i++) { const k = VEC[i], x = a[k], y = b[k], o = out[k]; o[0] = x[0] + (y[0] - x[0]) * t; o[1] = x[1] + (y[1] - x[1]) * t; o[2] = x[2] + (y[2] - x[2]) * t; }
  return out;
}
export function copyPose(a, out) { return lerpPose(a, a, 0, out); }

// 뿌리(root) 좌표계에서 본 관절의 위치·회전
function rootSpace(obj, root, outPos, outQuat) {
  outPos.set(0, 0, 0); outQuat.identity();
  const chain = []; let o = obj;
  while (o && o !== root) { chain.push(o); o = o.parent; }
  for (let i = chain.length - 1; i >= 0; i--) { const c = chain[i]; _p.copy(c.position).applyQuaternion(outQuat); outPos.add(_p); outQuat.multiply(c.quaternion); }
}
function basisQuat(yDir, zHint, out) {
  _Y.copy(yDir).normalize();
  _X.crossVectors(_Y, zHint); if (_X.lengthSq() < 1e-6) _X.set(1, 0, 0); _X.normalize();
  _Z.crossVectors(_X, _Y);
  return out.setFromRotationMatrix(_m.makeBasis(_X, _Y, _Z));
}
// 2관절 IK. upper(어깨/엉덩이 관절)·lower(팔꿈치/무릎 관절), a·b=뼈 길이, target·pole=뿌리 좌표.
// 끝점(손/발목)의 뿌리 좌표를 outEnd 에, 아래 뼈의 회전을 outQuat 에 돌려준다.
export function solveLimb(root, upper, lower, a, b, target, pole, outEnd, outQuat) {
  rootSpace(upper.parent, root, _pp, _pq);
  _S.copy(upper.position).applyQuaternion(_pq).add(_pp);
  _d.copy(target).sub(_S);
  let dist = _d.length(); if (dist < 1e-5) { _d.set(0, -1, 0); dist = 1e-5; }
  _d.multiplyScalar(1 / dist);
  dist = Math.min(Math.max(dist, Math.abs(a - b) + 0.02), a + b - 0.002);
  const x = (a * a - b * b + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, a * a - x * x));
  _pole.copy(pole).addScaledVector(_d, -pole.dot(_d));
  if (_pole.lengthSq() < 1e-6) _pole.set(0, 0, 1); _pole.normalize();
  _E.copy(_S).addScaledVector(_d, x).addScaledVector(_pole, h);
  _T.copy(_S).addScaledVector(_d, dist);
  // 뼈는 관절에서 -Y 로 뻗는다
  basisQuat(_t2.copy(_S).sub(_E), _pole, _qu);
  upper.quaternion.copy(_qi.copy(_pq).invert()).multiply(_qu);
  basisQuat(_t2.copy(_E).sub(_T), _pole, _ql);
  lower.quaternion.copy(_qi.copy(_qu).invert()).multiply(_ql);
  if (outEnd) outEnd.copy(_T);
  if (outQuat) outQuat.copy(_ql);
}

export class Rig {
  constructor() { this.root = new THREE.Group(); this.j = {}; this.dim = {}; this.meshes = []; }
  joint(name, parent, x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.userData.rest = new THREE.Vector3(x, y, z);
    (parent ? this.j[parent] : this.root).add(g); this.j[name] = g; return g;
  }
  add(name, geo, mat) { const m = new THREE.Mesh(geo, mat); this.j[name].add(m); this.meshes.push(m); return m; }
}

const POLE_ARM_R = new THREE.Vector3(-0.55, -0.75, -0.5), POLE_ARM_L = new THREE.Vector3(0.55, -0.75, -0.5);
const POLE_LEG = new THREE.Vector3(0, 0.1, 1), _fq = new THREE.Quaternion(), _hq = new THREE.Quaternion(), _zh = new THREE.Vector3();

// 인간형 뼈대에 자세를 입힌다. rig.dim = { arm:[a,b], leg:[a,b], grip(왼손이 잡는 자루 위치) }
export function applyPose(rig, P) {
  const j = rig.j, dm = rig.dim, root = rig.root;
  const hr0 = j.hips.userData.rest;
  j.hips.position.set(hr0.x + P.hx, hr0.y + P.hy, hr0.z + P.hz);
  j.hips.rotation.set(P.hrx, P.hry, P.hrz, 'YXZ');
  j.torso.rotation.set(P.trx, P.try, P.trz, 'YXZ');
  j.head.rotation.set(P.hdx, P.hdy, 0, 'YXZ');
  // 다리
  _zh.set(Math.sin(P.hry) * 0.6, 0.1, 1);
  _t2.set(P.fl[0], P.fl[1] + dm.ankle, P.fl[2]); solveLimb(root, j.legL, j.shinL, dm.leg[0], dm.leg[1], _t2, _pole2(_zh, 0.25), null, _fq);
  if (j.footL) j.footL.quaternion.copy(_fq).invert();
  _t2.set(P.fr[0], P.fr[1] + dm.ankle, P.fr[2]); solveLimb(root, j.legR, j.shinR, dm.leg[0], dm.leg[1], _t2, _pole2(_zh, -0.25), null, _fq);
  if (j.footR) j.footR.quaternion.copy(_fq).invert();
  // 오른팔 + 무기
  _hr.set(P.hr[0], P.hr[1], P.hr[2]);
  solveLimb(root, j.armR, j.foreR, dm.arm[0], dm.arm[1], _hr, POLE_ARM_R, _hr, _hq);
  _wd.set(P.wd[0], P.wd[1], P.wd[2]).normalize();
  if (j.weapon) {
    basisQuat(_wd, _zh.set(0.3, 0.2, 1), _q);
    j.weapon.quaternion.copy(_qi.copy(_hq).invert()).multiply(_q);
  }
  // 왼팔: 자유 목표와 자루 위치 사이
  _hl.set(P.hl[0], P.hl[1], P.hl[2]);
  if (P.grip > 0.001) { _t2.copy(_hr).addScaledVector(_wd, dm.grip); _hl.lerp(_t2, P.grip); }
  solveLimb(root, j.armL, j.foreL, dm.arm[0], dm.arm[1], _hl, POLE_ARM_L, null, null);
}
const _pv = new THREE.Vector3();
function _pole2(z, side) { return _pv.set(z.x + side, z.y, z.z); }
export { POLE_LEG };
