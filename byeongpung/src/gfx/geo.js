// 로우폴리 지오메트리 도우미: 기본 도형 → 변형 → 정점 색 → 합치기.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../core/util.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _c = new THREE.Color();
let rng = mulberry32(1234);
export const seedGeo = (s) => { rng = mulberry32(s); };

// t: { p:[x,y,z], r:[rx,ry,rz], s: 수 | [sx,sy,sz] }
export function xf(geo, t) {
  if (!t) return geo;
  _p.set(...(t.p || [0, 0, 0]));
  _e.set(...(t.r || [0, 0, 0]));
  if (typeof t.s === 'number') _s.set(t.s, t.s, t.s); else _s.set(...(t.s || [1, 1, 1]));
  _m.compose(_p, _q.setFromEuler(_e), _s);
  geo.applyMatrix4(_m);
  return geo;
}

// 삼각형마다 살짝 다른 농담으로 칠한다(접은 종이 느낌). col: 16진수 | THREE.Color | [r,g,b](선형)
export function paint(geo, col, jit = 0.07) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.attributes.position.count, arr = new Float32Array(n * 3);
  let r, gg, b;
  if (Array.isArray(col)) [r, gg, b] = col; else { _c.set(col); r = _c.r; gg = _c.g; b = _c.b; }
  for (let i = 0; i < n; i += 3) {
    const k = 1 + (rng() - 0.5) * 2 * jit;
    for (let j = 0; j < 3; j++) { arr[(i + j) * 3] = r * k; arr[(i + j) * 3 + 1] = gg * k; arr[(i + j) * 3 + 2] = b * k; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  g.deleteAttribute('uv');
  return g;
}
// 높이에 따라 아래·위 색을 섞어 칠한다
export function paintY(geo, colLo, colHi, y0, y1, jit = 0.05) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position, n = pos.count, arr = new Float32Array(n * 3);
  const a = new THREE.Color(colLo), b = new THREE.Color(colHi);
  for (let i = 0; i < n; i += 3) {
    const k = 1 + (rng() - 0.5) * 2 * jit;
    for (let j = 0; j < 3; j++) {
      const t = Math.max(0, Math.min(1, (pos.getY(i + j) - y0) / (y1 - y0)));
      arr[(i + j) * 3] = (a.r + (b.r - a.r) * t) * k; arr[(i + j) * 3 + 1] = (a.g + (b.g - a.g) * t) * k; arr[(i + j) * 3 + 2] = (a.b + (b.b - a.b) * t) * k;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  g.deleteAttribute('uv');
  return g;
}

export const box = (w, h, d, col, t, jit) => xf(paint(new THREE.BoxGeometry(w, h, d), col, jit), t);
export const cyl = (rt, rb, h, seg, col, t, jit) => xf(paint(new THREE.CylinderGeometry(rt, rb, h, seg, 1), col, jit), t);
export const cone = (r, h, seg, col, t, jit) => xf(paint(new THREE.ConeGeometry(r, h, seg, 1), col, jit), t);
export const ico = (r, det, col, t, jit) => xf(paint(new THREE.IcosahedronGeometry(r, det), col, jit), t);
export const sph = (r, ws, hs, col, t, jit) => xf(paint(new THREE.SphereGeometry(r, ws, hs), col, jit), t);
export const oct = (r, col, t, jit) => xf(paint(new THREE.OctahedronGeometry(r, 0), col, jit), t);
export const plane = (w, h, col, t, jit) => xf(paint(new THREE.PlaneGeometry(w, h), col, jit), t);
export const torus = (r, tube, rs, ts, col, t, jit) => xf(paint(new THREE.TorusGeometry(r, tube, rs, ts), col, jit), t);
// 임의 삼각형들: pts = [[x,y,z]×3, ...]
export function tris(pts, col, t, jit) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts.flat(2)), 3));
  g.computeVertexNormals();
  return xf(paint(g, col, jit), t);
}
// 정점을 조금씩 흩뜨려 손으로 접은 듯 만든다
export function jitter(geo, amt) {
  const pos = geo.attributes.position, seen = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let o = seen.get(k);
    if (!o) { o = [(rng() - 0.5) * 2 * amt, (rng() - 0.5) * 2 * amt, (rng() - 0.5) * 2 * amt]; seen.set(k, o); }
    pos.setXYZ(i, pos.getX(i) + o[0], pos.getY(i) + o[1], pos.getZ(i) + o[2]);
  }
  return geo;
}
export function merge(list) {
  const g = mergeGeometries(list.map((x) => { if (!x.attributes.normal) x.computeVertexNormals(); return x; }), false);
  list.forEach((x) => x.dispose());
  g.computeBoundingSphere();
  return g;
}
export const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.matrixAutoUpdate = true; return m; };
