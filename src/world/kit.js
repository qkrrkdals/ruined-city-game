// Instanced prop geometries (built once) + InstancedMesh factory.
import * as THREE from 'three';
import { Geo, V } from './geo.js';

const C = (h) => new THREE.Color(h);
const rnd = Math.random;

function grassGeo(n, h0, h1, base, tip) {
  const g = new Geo(rnd), cb = C(base);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.6, r = 0.02 + rnd() * 0.09, h = h0 + rnd() * (h1 - h0), w = 0.03 + rnd() * 0.03;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, lean = 0.1 + rnd() * 0.22, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    const tc = C(tip).multiplyScalar(0.88 + rnd() * 0.24);
    g.triC(V(cx - px, 0, cz - pz), V(cx + px, 0, cz + pz), V(cx + Math.cos(a) * lean, h, cz + Math.sin(a) * lean), cb, cb, tc);
  }
  return g.build();
}
function flowerGeo() {
  const g = new Geo(rnd), stem = C('#56804a'), w = C('#ffffff'), ctr = C('#fff1b8');
  g.triC(V(-0.012, 0, 0), V(0.012, 0, 0), V(0.01, 0.34, 0), stem, stem, stem);
  g.triC(V(0, 0, -0.012), V(0, 0, 0.012), V(0.01, 0.3, 0), stem, stem, stem);
  const n = 5, r = 0.075;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    g.triC(V(0.01, 0.35, 0), V(Math.cos(a1) * r, 0.33, Math.sin(a1) * r), V(Math.cos(a0) * r, 0.33, Math.sin(a0) * r), ctr, w, w);
  }
  return g.build();
}
function leafGeo() {
  const g = new Geo(rnd), a = C('#5f9258'), b = C('#9cc47f');
  g.triC(V(0, 0, 0), V(0.11, 0.13, 0.03), V(0, 0.3, 0), a, b, b);
  g.triC(V(0, 0, 0), V(0, 0.3, 0), V(-0.11, 0.13, 0.03), a, b, b);
  return g.build();
}
function treeGeo(kind) {
  const g = new Geo(rnd), trunk = '#8a6a58';
  if (kind === 'tall') {
    g.prism(0, 0, 0, 0.17, 0.11, 2.2, 6, trunk);
    g.prism(0, 1.5, 0, 1.55, 0, 2.6, 7, '#5f8f63', { jit: 0.1 });
    g.prism(0, 2.7, 0, 1.2, 0, 2.3, 7, '#6d9d6c', { jit: 0.1, a0: 0.4 });
    g.prism(0, 3.8, 0, 0.82, 0, 1.9, 7, '#7cab76', { jit: 0.1, a0: 0.9 });
  } else {
    g.prism(0, 0, 0, 0.22, 0.14, 2.7, 6, trunk);
    g.beam(0, 2.0, 0, 0.7, 2.9, 0.2, 0.12, trunk);
    g.beam(0, 2.1, 0, -0.6, 2.8, -0.3, 0.11, trunk);
    const cols = kind === 'blossom' ? ['#f2b8c6', '#f7cbd5', '#eaa5b8', '#f9dbe2'] : ['#7fae6e', '#8fbc78', '#6d9f63', '#9cc483'];
    g.ico(0, 3.5, 0, 1.6, cols[0], { sy: 0.85, j: 0.22, jit: 0.1 });
    g.ico(0.95, 3.1, 0.45, 1.1, cols[1], { j: 0.2, jit: 0.1 });
    g.ico(-0.85, 3.2, -0.35, 1.15, cols[2], { j: 0.2, jit: 0.1 });
    g.ico(0.1, 4.3, -0.2, 0.95, cols[3], { j: 0.2, jit: 0.1 });
  }
  return g.build();
}
function bushGeo() {
  const g = new Geo(rnd);
  g.ico(0, 0.45, 0, 0.7, '#7aa66a', { sy: 0.75, jit: 0.1 });
  g.ico(0.5, 0.35, 0.2, 0.5, '#8bb878', { sy: 0.8, jit: 0.1 });
  g.ico(-0.45, 0.32, -0.15, 0.48, '#6c9a60', { sy: 0.8, jit: 0.1 });
  return g.build();
}
function carGeo() {
  const g = new Geo(rnd), paint = '#ffffff', dark = '#34363e', glass = '#58697e', tire = '#2a2a2e';
  g.box(0, 0.6, 0, 1.8, 0.62, 4.2, paint, { jit: 0.02 });
  g.box(0, 1.15, -0.2, 1.62, 0.52, 2.3, paint, { jit: 0.02 });
  g.panel(0, 1.15, 0.96, 1.42, 0.4, 0, glass); g.panel(0, 1.15, -1.36, 1.42, 0.4, Math.PI, glass);
  g.panel(0.82, 1.15, -0.2, 2.0, 0.38, Math.PI / 2, glass); g.panel(-0.82, 1.15, -0.2, 2.0, 0.38, -Math.PI / 2, glass);
  for (const [x, z] of [[0.82, 1.35], [-0.82, 1.35], [0.82, -1.35], [-0.82, -1.35]]) g.prism(x + 0.12, 0.34, z, 0.34, 0.34, 0.24, 8, tire, { rz: Math.PI / 2, jit: 0 });
  g.panel(0.6, 0.66, 2.11, 0.36, 0.16, 0, '#f6eed6'); g.panel(-0.6, 0.66, 2.11, 0.36, 0.16, 0, '#f6eed6');
  g.panel(0.62, 0.66, -2.11, 0.34, 0.14, Math.PI, '#d9807a'); g.panel(-0.62, 0.66, -2.11, 0.34, 0.14, Math.PI, '#d9807a');
  g.box(0, 0.34, 2.13, 1.84, 0.16, 0.12, dark); g.box(0, 0.34, -2.13, 1.84, 0.16, 0.12, dark);
  return g.build();
}
function lampGeo() {
  const g = new Geo(rnd), c = '#77727f';
  g.prism(0, 0, 0, 0.13, 0.09, 5.2, 6, c);
  g.box(0.62, 5.12, 0, 1.3, 0.1, 0.1, c);
  g.box(1.18, 4.98, 0, 0.5, 0.18, 0.3, '#5c5864');
  g.box(1.18, 4.87, 0, 0.38, 0.04, 0.22, '#ece4c6');
  return g.build();
}
function poleGeo() {
  const g = new Geo(rnd), w = '#8c7b6b';
  g.prism(0, 0, 0, 0.15, 0.11, 8, 6, w);
  g.box(0, 7.4, 0, 1.8, 0.12, 0.12, w);
  for (const x of [-0.75, 0, 0.75]) g.prism(x, 7.46, 0, 0.05, 0.04, 0.18, 5, '#e6e1d6');
  g.box(0.2, 5.6, 0.18, 0.4, 0.55, 0.3, '#9a9aa0');
  return g.build();
}
function chairGeo() {
  const g = new Geo(rnd), c = '#ffffff', leg = '#c9c9cf';
  g.box(0, 0.45, 0, 0.44, 0.04, 0.42, c);
  g.box(0, 0.73, 0.2, 0.44, 0.38, 0.04, c, { rx: -0.08 });
  for (const [x, z] of [[0.19, 0.18], [-0.19, 0.18], [0.19, -0.18], [-0.19, -0.18]]) g.box(x, 0.22, z, 0.03, 0.45, 0.03, leg);
  return g.build();
}
function benchGeo() {
  const g = new Geo(rnd), w = '#b88b68', m = '#5f5b66';
  for (let i = 0; i < 3; i++) g.box(0, 0.46, -0.16 + i * 0.16, 1.8, 0.05, 0.13, w);
  for (let i = 0; i < 2; i++) g.box(0, 0.68 + i * 0.16, 0.26, 1.8, 0.11, 0.04, w, { rx: -0.15 });
  for (const x of [-0.75, 0.75]) { g.box(x, 0.23, 0, 0.07, 0.46, 0.5, m); g.box(x, 0.65, 0.25, 0.07, 0.5, 0.05, m); }
  return g.build();
}
function lanternGeo() {
  const g = new Geo(rnd);
  g.prism(0, -0.18, 0, 0.16, 0.2, 0.18, 8, '#ffffff', { cap: false, jit: 0.02 });
  g.prism(0, 0, 0, 0.2, 0.16, 0.18, 8, '#ffffff', { jit: 0.02 });
  g.prism(0, -0.24, 0, 0.09, 0.09, 0.06, 6, '#7d6f6a', { bottom: true });
  g.beam(0, 0.18, 0, 0, 0.42, 0, 0.015, '#4d4848');
  return g.build();
}
function crateGeo() {
  const g = new Geo(rnd), w = '#c79b6b', d = '#9c7450', s = 0.9, h = s / 2;
  g.box(0, 0, 0, s, s, s, w, { bottom: true, jit: 0.05 });
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    g.box(a * (h - 0.03), 0, b * (h - 0.03), 0.08, s + 0.02, 0.08, d);
    g.box(0, a * (h - 0.03), b * (h - 0.03), s + 0.02, 0.08, 0.08, d);
    g.box(a * (h - 0.03), b * (h - 0.03), 0, 0.08, 0.08, s + 0.02, d);
  }
  g.box(0, 0, h + 0.005, 0.1, s * 0.9, 0.02, d, { rz: 0.78 });
  g.box(0, 0, -h - 0.005, 0.1, s * 0.9, 0.02, d, { rz: -0.78 });
  return g.build();
}
function rockGeo() { const g = new Geo(rnd); g.ico(0, 0, 0, 1, '#ffffff', { sy: 0.65, j: 0.28 }); return g.build(); }
function slabGeo() { const g = new Geo(rnd); g.box(0, 0, 0, 1.6, 0.25, 1.0, '#ffffff', { jit: 0.08 }); g.box(0.3, 0.15, 0.1, 0.03, 0.03, 1.4, '#6a5a55', { ry: 0.4 }); return g.build(); }
function bagGeo() {
  const g = new Geo(rnd);
  g.box(0, 0.16, 0, 0.42, 0.32, 0.18, '#ffffff', { jit: 0.06 });
  g.box(0, 0.36, 0, 0.3, 0.08, 0.04, '#ffffff', { jit: 0.06 });
  g.box(0, 0.3, 0.095, 0.3, 0.12, 0.02, '#dddddd');
  return g.build();
}
function coneGeo() {
  const g = new Geo(rnd);
  g.box(0, 0.02, 0, 0.42, 0.04, 0.42, '#d86f4f');
  g.prism(0, 0.04, 0, 0.17, 0.05, 0.6, 8, '#ee8a5e', { jit: 0.02 });
  g.prism(0, 0.3, 0, 0.115, 0.1, 0.1, 8, '#f4efe4', { cap: false, jit: 0 });
  return g.build();
}

export const INST = {
  grass: { mat: 'veg', density: true, geo: () => grassGeo(6, 0.28, 0.6, '#5e8c57', '#b9d699') },
  tall: { mat: 'tall', density: true, geo: () => grassGeo(11, 0.75, 1.25, '#6b8d55', '#d9d68f') },
  flower: { mat: 'veg', density: true, geo: flowerGeo },
  leaf: { mat: 'leaf', density: true, geo: leafGeo },
  rock: { mat: 'world', cast: true, geo: rockGeo },
  slab: { mat: 'world', cast: true, geo: slabGeo },
  treeA: { mat: 'tree', cast: true, geo: () => treeGeo('round') },
  treeB: { mat: 'tree', cast: true, geo: () => treeGeo('tall') },
  treeC: { mat: 'tree', cast: true, geo: () => treeGeo('blossom') },
  bush: { mat: 'tree', cast: true, geo: bushGeo },
  hedge: { mat: 'tree', geo: bushGeo },
  car: { mat: 'world', cast: true, geo: carGeo },
  lamp: { mat: 'world', cast: true, geo: lampGeo },
  pole: { mat: 'world', cast: true, geo: poleGeo },
  chair: { mat: 'world', geo: chairGeo },
  bench: { mat: 'world', cast: true, geo: benchGeo },
  lantern: { mat: 'cloth', geo: lanternGeo },
  crate: { mat: 'world', cast: true, geo: crateGeo },
  bag: { mat: 'world', geo: bagGeo },
  cone: { mat: 'world', geo: coneGeo },
};
const cache = {};
export const instGeo = (type) => (cache[type] ||= INST[type].geo());

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
export function makeInst(geo, mat, items, def = {}) {
  // shuffle so that lowering .count thins uniformly (quality setting)
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const colored = items.some((it) => it.c !== undefined);
  items.forEach((it, i) => {
    _e.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ'); _q.setFromEuler(_e);
    const s = it.s ?? 1;
    if (typeof s === 'number') _s.set(s, s, s); else _s.set(s[0], s[1], s[2]);
    _m.compose(_p.set(it.x, it.y, it.z), _q, _s);
    mesh.setMatrixAt(i, _m);
    if (colored) mesh.setColorAt(i, _c.set(it.c ?? '#ffffff'));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.castShadow = !!def.cast;
  mesh.receiveShadow = true;
  return mesh;
}
