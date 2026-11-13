// 식생·바위 뿌리기(인스턴싱). 구역과 길에서의 거리에 따라 솔·대·풀·갈대·연잎·바위를 놓는다.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { F } from './field.js';
import { BOUNDS, WATER } from './layout.js';
import { MAT } from '../gfx/materials.js';
import { box, cyl, cone, ico, merge, tris, jitter, seedGeo, paintY } from '../gfx/geo.js';
import { HEX } from '../gfx/palette.js';
import { mulberry32, fbm2, hash2 } from '../core/util.js';

const TILE = 96;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

function pineGeo(v, white) {
  seedGeo(40 + v);
  const bark = white ? 0xf3eee2 : 0x7a5645, leaf = white ? 0xf6f2e8 : HEX.pine, leaf2 = white ? 0xece6d8 : HEX.pineDark;
  const g = [
    cyl(0.2, 0.3, 3.2, 5, bark, { p: [0.1, 1.6, 0], r: [0, 0, -0.07] }), cyl(0.15, 0.2, 2.8, 5, bark, { p: [0.05, 4.4, 0.1], r: [0.09, 0, 0.12] }), cyl(0.07, 0.15, 2.2, 5, bark, { p: [-0.2, 6.7, 0.25], r: [0.1, 0, 0.14] }),
    cyl(0.06, 0.1, 2.4, 4, bark, { p: [1.1, 4.2, 0.2], r: [0, 0, -1.15] }), cyl(0.05, 0.09, 2.1, 4, bark, { p: [-1.0, 5.4, -0.3], r: [0.2, 0, 1.2] }),
  ];
  const clumps = v === 0 ? [[2.2, 4.7, 0.3, 1.9], [-2.0, 5.9, -0.5, 1.7], [-0.4, 7.9, 0.4, 2.1], [0.9, 6.6, -1.0, 1.4]] : [[1.9, 4.6, 0.2, 1.6], [-1.8, 5.8, -0.4, 2.0], [-0.5, 8.0, 0.4, 1.7], [-1.0, 4.0, 1.2, 1.2], [1.2, 7.0, 0.9, 1.3]];
  for (const [x, y, z, r] of clumps) g.push(paintY(new THREE.IcosahedronGeometry(r, 0).scale(1, 0.36, 0.9).translate(x, y, z), leaf2, leaf, y - r * 0.3, y + r * 0.3, 0.1));
  return merge(g);
}
function bambooGeo(white) {
  seedGeo(61);
  const st = white ? 0xf3eee2 : HEX.bamboo, lf = white ? 0xece6d8 : HEX.bambooDark, g = [], R = mulberry32(8);
  for (let i = 0; i < 4; i++) {
    const x = (R() - 0.5) * 1.5, z = (R() - 0.5) * 1.5, h = 8 + R() * 4.5, tx = (R() - 0.5) * 0.16, tz = (R() - 0.5) * 0.16;
    g.push(cyl(0.05, 0.085, h, 5, st, { p: [x + tz * h * 0.5, h / 2, z - tx * h * 0.5], r: [tx, 0, tz] }, 0.1));
    for (let k = 0; k < 4; k++) {
      const y = h * (0.62 + R() * 0.36), a = R() * 6.28, L = 1.1 + R() * 0.9, cx = x + tz * y, cz = z - tx * y, dx = Math.cos(a), dz = Math.sin(a);
      g.push(tris([[[cx, y, cz], [cx + dx * L * 0.5 - dz * 0.14, y + 0.1, cz + dz * L * 0.5 + dx * 0.14], [cx + dx * L, y - 0.55, cz + dz * L]], [[cx, y, cz], [cx + dx * L, y - 0.55, cz + dz * L], [cx + dx * L * 0.5 + dz * 0.14, y + 0.1, cz + dz * L * 0.5 - dx * 0.14]]], lf, null, 0.14));
    }
  }
  return merge(g);
}
function rockGeo(v, white) { seedGeo(90 + v); const g = jitter(new THREE.IcosahedronGeometry(1, v === 0 ? 1 : 0).scale(1, 0.72, 0.85).translate(0, 0.5, 0), 0.17); return paintY(g, white ? 0xe9e2d2 : HEX.stoneDark, white ? 0xf6f2e8 : HEX.stone, 0, 1.2, 0.08); }
function grassGeo() { seedGeo(12); const g = []; for (let i = 0; i < 3; i++) { const a = i * 2.1, c = Math.cos(a), s = Math.sin(a), h = 0.4 + i * 0.1; g.push(tris([[[c * -0.07, 0, s * -0.07], [c * 0.07, 0, s * 0.07], [c * 0.16 + s * 0.1, h, s * 0.16 - c * 0.1]]], 0xffffff, null, 0.12)); } return merge(g); }
function reedGeo() { seedGeo(15); const g = []; for (let i = 0; i < 4; i++) { const a = i * 1.7, c = Math.cos(a) * 0.14, s = Math.sin(a) * 0.14, h = 1.5 + i * 0.25; g.push(tris([[[c - 0.03, 0, s], [c + 0.03, 0, s], [c * 2.2, h, s * 2.2]]], HEX.reed, null, 0.1)); if (i % 2) g.push(cone(0.05, 0.3, 4, 0x8a6a48, { p: [c * 2.2, h, s * 2.2] })); } return merge(g); }
function lotusGeo(flower) { seedGeo(18); const g = [cyl(0.55, 0.55, 0.03, 7, HEX.leaf, { p: [0, 0.02, 0] }, 0.1)]; if (flower) for (let i = 0; i < 5; i++) { const a = i * 1.257; g.push(cone(0.1, 0.34, 4, HEX.lotus, { p: [Math.cos(a) * 0.1, 0.34, Math.sin(a) * 0.1], r: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] }, 0.08)); } return merge(g); }
function bushGeo() { seedGeo(22); return paintY(jitter(new THREE.IcosahedronGeometry(0.7, 0).scale(1, 0.7, 1).translate(0, 0.4, 0), 0.12), 0x4c6a4a, 0x7fa06a, 0, 0.9, 0.1); }
export function plumGeo() {
  seedGeo(27); const bark = 0x3a2e2a, g = [cyl(0.12, 0.2, 1.6, 5, bark, { p: [0, 0.8, 0], r: [0, 0, 0.12] }), cyl(0.07, 0.12, 1.5, 4, bark, { p: [0.45, 2.1, 0], r: [0, 0, -0.6] }), cyl(0.06, 0.1, 1.4, 4, bark, { p: [-0.45, 2.2, 0.1], r: [0.2, 0, 0.7] }), cyl(0.04, 0.07, 1.1, 4, bark, { p: [0.1, 3.0, -0.3], r: [-0.4, 0, 0.1] })];
  const R = mulberry32(5); for (let i = 0; i < 16; i++) g.push(ico(0.1 + R() * 0.07, 0, i % 4 ? HEX.plum : 0xf2c6cc, { p: [(R() - 0.5) * 2.6, 1.9 + R() * 1.7, (R() - 0.5) * 1.6] }, 0.1));
  return merge(g);
}
export function willowGeo() {
  seedGeo(29); const bark = 0x5a4a3a, g = [cyl(0.18, 0.3, 3, 5, bark, { p: [0, 1.5, 0], r: [0, 0, 0.08] }), cyl(0.1, 0.17, 2.2, 5, bark, { p: [0.3, 3.8, 0], r: [0, 0, -0.3] })];
  const R = mulberry32(6); for (let i = 0; i < 16; i++) { const a = R() * 6.28, r = 0.6 + R() * 1.6, x = 0.5 + Math.cos(a) * r, z = Math.sin(a) * r, top = 4.6 + R() * 0.5, len = 2.2 + R() * 1.6; g.push(tris([[[0.5, top + 0.3, 0], [x - 0.06, top - 0.4, z], [x, top - len, z]], [[0.5, top + 0.3, 0], [x, top - len, z], [x + 0.06, top - 0.4, z]]], 0x9ab06a, null, 0.12)); }
  return merge(g);
}

export function buildScatter(scene) {
  const q = G.gfx.q.density;
  const kinds = {
    pineA: { geo: pineGeo(0), mat: MAT.tree }, pineB: { geo: pineGeo(1), mat: MAT.tree }, pineW: { geo: pineGeo(0, true), mat: MAT.tree },
    bamboo: { geo: bambooGeo(), mat: MAT.leaf }, rockA: { geo: rockGeo(0), mat: MAT.world }, rockB: { geo: rockGeo(1), mat: MAT.world }, rockW: { geo: rockGeo(1, true), mat: MAT.world },
    grass: { geo: grassGeo(), mat: MAT.grass }, reed: { geo: reedGeo(), mat: MAT.reed }, lotus: { geo: lotusGeo(false), mat: MAT.world }, lotusF: { geo: lotusGeo(true), mat: MAT.world }, bush: { geo: bushGeo(), mat: MAT.tree },
  };
  const buckets = new Map(); // "kind:tx:tz" → 행렬·색 목록
  function put(kind, x, y, z, ry, s, sy, tint) {
    const key = `${kind}:${Math.floor(x / TILE)}:${Math.floor(z / TILE)}`;
    let b = buckets.get(key); if (!b) buckets.set(key, (b = { kind, m: [], c: [] }));
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(s, s * (sy || 1), s));
    b.m.push(..._m.elements); b.c.push(tint, tint, tint);
  }
  const R = mulberry32(2024);
  const GRASS_TINT = [null, [0.62, 0.74, 0.5], [0.72, 0.76, 0.5], [0.56, 0.74, 0.46], [0.56, 0.68, 0.46], [0.6, 0.62, 0.55]];
  // 큰 것들: 6m 격자를 흔들어 뿌린다
  for (let z = BOUNDS.z0 + 3; z < BOUNDS.z1; z += 6) for (let x = BOUNDS.x0 + 3; x < BOUNDS.x1; x += 6) {
    const px = x + (R() - 0.5) * 5.4, pz = z + (R() - 0.5) * 5.4, d = F.sdfGround(px, pz);
    if (d < 0.8 || d > 70) continue;
    const zone = F.zone(px, pz), y = F.hr(px, pz), n = fbm2(px * 0.03 + 9, pz * 0.03 + 4, 2), r = R(), ry = R() * 6.28;
    if (zone === 0) { if (d > 4 && d < 40 && r < 0.1) put(r < 0.07 ? 'pineW' : 'rockW', px, y - 0.1, pz, ry, 0.8 + R() * 0.5, 1, 1); continue; }
    if (zone === 4) { // 늪: 물가의 바위, 드문 솔
      if (y > WATER + 0.3 && d > 6 && r < 0.12) put(r < 0.06 ? 'pineB' : 'rockA', px, y - 0.15, pz, ry, 0.8 + R() * 0.6, 1, 0.9 + R() * 0.2);
      continue;
    }
    if (zone === 3) {
      if (d > 1.6 && d < 46 && r < 0.62 + n * 0.3) put('bamboo', px, y - 0.2, pz, ry, 0.85 + R() * 0.45, 1, 0.82 + R() * 0.3);
      else if (d > 3 && r > 0.94) put('rockB', px, y - 0.2, pz, ry, 0.7 + R() * 0.9, 1, 0.9 + R() * 0.2);
      continue;
    }
    const dens = zone === 1 ? 0.34 + n * 0.3 : zone === 2 ? 0.16 + n * 0.14 : 0.1 + n * 0.14; // 솔숲 > 붓골 > 벼룻길
    if (d > 3.6 && r < dens) put(R() < 0.5 ? 'pineA' : 'pineB', px, y - 0.25, pz, ry, 0.8 + R() * 0.65, 0.9 + R() * 0.3, 0.84 + R() * 0.3);
    else if (d > 2 && r > (zone === 5 ? 0.8 : 0.93)) put(R() < 0.5 ? 'rockA' : 'rockB', px, y - 0.25, pz, ry, (zone === 5 ? 1.2 : 0.7) + R() * (zone === 5 ? 2.2 : 1.1), zone === 5 ? 1.2 + R() * 1.2 : 1, 0.88 + R() * 0.2);
    else if (d > 1.2 && d < 12 && r > 0.8 && zone !== 5) put('bush', px, y - 0.05, pz, ry, 0.8 + R() * 0.8, 1, 0.85 + R() * 0.3);
  }
  // 작은 것들: 2m 격자(품질에 따라 솎는다)
  for (let z = BOUNDS.z0 + 1; z < BOUNDS.z1; z += 2) for (let x = BOUNDS.x0 + 1; x < BOUNDS.x1; x += 2) {
    const r = hash2(x * 7 + 1, z * 13 + 5); if (r > q) continue;
    const px = x + (R() - 0.5) * 1.9, pz = z + (R() - 0.5) * 1.9, d = F.sdf(px, pz), dg = F.sdfGround(px, pz);
    if (d > 9) continue;
    const zone = F.zone(px, pz); if (zone === 0) continue;
    const y = F.hr(px, pz), path = F.path(px, pz), ry = R() * 6.28, rr = R();
    if (zone === 4) {
      if (dg > 0.4 && dg < 9 && y < WATER + 0.1 && y > WATER - 1.0 && rr < 0.5) put('reed', px, Math.max(y, WATER - 0.5), pz, ry, 0.8 + R() * 0.6, 1, 0.85 + R() * 0.3);
      else if (dg > 2.5 && y < WATER - 0.4 && rr < 0.035) put(R() < 0.3 ? 'lotusF' : 'lotus', px, WATER + 0.01, pz, ry, 0.7 + R() * 0.9, 1, 0.9 + R() * 0.2);
      else if (dg < 0.4 && path < 0.25 && rr < 0.5) put('grass', px, y, pz, ry, 0.9 + R() * 0.8, 1, 0.9 + R() * 0.2);
      continue;
    }
    if (zone === 2 && dg < -3 && Math.hypot(px, pz) < 30) continue; // 마을 마당은 비운다
    if (dg < 4.5 && path < 0.3 && d > -40 && rr < (zone === 5 ? 0.25 : 0.62)) put('grass', px, y, pz, ry, 0.9 + R() * 0.9, 1, 0.88 + R() * 0.24);
  }
  const group = new THREE.Group(); group.name = 'scatter';
  const tiles = [];
  for (const b of buckets.values()) {
    const k = kinds[b.kind], n = b.m.length / 16;
    const im = new THREE.InstancedMesh(k.geo, k.mat, n);
    im.instanceMatrix.array.set(b.m);
    const zone = b.kind === 'grass';
    for (let i = 0; i < n; i++) {
      const t = b.c[i * 3];
      if (zone) { _m.fromArray(b.m, i * 16); const gx = _m.elements[12], gz = _m.elements[14], gt = GRASS_TINT[F.zone(gx, gz)] || GRASS_TINT[1]; _c.setRGB(gt[0] * t, gt[1] * t, gt[2] * t); }
      else _c.setRGB(t, t, t);
      im.setColorAt(i, _c);
    }
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.matrixAutoUpdate = false;
    im.computeBoundingSphere();
    group.add(im); tiles.push(im);
  }
  scene.add(group);
  let acc = 0;
  return {
    group, count: tiles.length,
    update(rdt) { // 먼 조각은 그리지 않는다
      acc -= rdt; if (acc > 0) return; acc = 0.4;
      const p = G.gfx.camera.position;
      for (const t of tiles) { const s = t.boundingSphere; t.visible = Math.hypot(s.center.x - p.x, s.center.z - p.z) - s.radius < 300; }
    },
  };
}
