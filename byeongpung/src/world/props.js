// 소품 모양. 정적인 것은 [[지오메트리, 재질 이름], ...] 을 돌려주고(Kit.place 로 합친다), 움직이는 것은 Group 을 돌려준다.
import * as THREE from 'three';
import { box, cyl, cone, ico, merge, jitter, paintY, seedGeo, tris, torus } from '../gfx/geo.js';
import { HEX } from '../gfx/palette.js';
import { MAT, patch } from '../gfx/materials.js';

const W = 'world', K = 'keep';
const rock = (sx, sy, sz, t, lo = HEX.stoneDark, hi = HEX.stone) => { const g = jitter(new THREE.IcosahedronGeometry(1, 0), 0.16).scale(sx, sy, sz); if (t) g.translate(...t); return paintY(g, lo, hi, (t ? t[1] : 0) - sy, (t ? t[1] : 0) + sy, 0.08); };

// 초가집. 앞(+Z)에 문과 툇마루
export function house(w = 5.2, d = 3.6) {
  seedGeo(w * 31 + d * 7);
  const wall = 0xe6dcc2, wood = HEX.woodDark, p = [];
  p.push(box(w + 0.5, 0.36, d + 0.5, HEX.stone, { p: [0, 0.18, 0] }, 0.1));
  p.push(box(w, 2.1, d, wall, { p: [0, 1.4, 0] }, 0.05));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(box(0.2, 2.2, 0.2, wood, { p: [sx * w / 2, 1.4, sz * d / 2] }));
  p.push(box(w + 0.1, 0.16, 0.16, wood, { p: [0, 2.4, d / 2] }), box(w + 0.1, 0.16, 0.16, wood, { p: [0, 2.4, -d / 2] }));
  p.push(box(0.95, 1.6, 0.08, 0x4a3828, { p: [-w * 0.18, 1.2, d / 2 + 0.02] }));                         // 문
  p.push(box(0.9, 0.8, 0.06, 0xf4eedd, { p: [w * 0.24, 1.6, d / 2 + 0.02] }), box(0.9, 0.05, 0.08, wood, { p: [w * 0.24, 1.6, d / 2 + 0.03] }), box(0.05, 0.8, 0.08, wood, { p: [w * 0.24, 1.6, d / 2 + 0.03] })); // 창
  p.push(box(w * 0.74, 0.14, 0.95, HEX.wood, { p: [0, 0.52, d / 2 + 0.5] }), box(0.12, 0.5, 0.12, wood, { p: [-w * 0.3, 0.26, d / 2 + 0.9] }), box(0.12, 0.5, 0.12, wood, { p: [w * 0.3, 0.26, d / 2 + 0.9] })); // 툇마루
  const roof = paintY(new THREE.SphereGeometry(1, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(w * 0.74, 1.65, d * 0.86).translate(0, 2.42, 0), 0x9a7f48, HEX.thatch, 2.4, 4.1, 0.09);
  p.push(roof, cyl(1, 1, 0.08, 9, 0x6e5a36, { p: [0, 2.44, 0], s: [w * 0.74, 1, d * 0.86] }));
  return [[merge(p), W]];
}
// 기와 정자
export function pavilion() {
  seedGeo(77); const p = [], post = 0x7a3b2a;
  p.push(box(4.6, 0.3, 4.6, HEX.stone, { p: [0, 0.15, 0] }, 0.08), box(4.3, 0.16, 4.3, HEX.wood, { p: [0, 0.7, 0] }, 0.06));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(cyl(0.15, 0.16, 2.9, 6, post, { p: [sx * 1.9, 1.75, sz * 1.9] }), box(0.5, 0.4, 0.5, HEX.stoneDark, { p: [sx * 1.9, 0.5, sz * 1.9] }));
  p.push(box(4.2, 0.2, 0.2, post, { p: [0, 3.05, 1.9] }), box(4.2, 0.2, 0.2, post, { p: [0, 3.05, -1.9] }), box(0.2, 0.2, 4.2, post, { p: [1.9, 3.05, 0] }), box(0.2, 0.2, 4.2, post, { p: [-1.9, 3.05, 0] }));
  p.push(cone(3.9, 1.7, 4, HEX.tile, { p: [0, 4.0, 0], r: [0, Math.PI / 4, 0] }, 0.1), cone(4.3, 0.35, 4, 0x2c2e34, { p: [0, 3.25, 0], r: [0, Math.PI / 4, 0] }), ico(0.22, 0, HEX.gold, { p: [0, 4.95, 0] }));
  return [[merge(p), W]];
}
// 돌담 한 토막(길이 len, +X 방향)
export function wall(len, h = 1.0) { seedGeo(len * 13); return [[merge([box(len, h, 0.55, HEX.stone, { p: [0, h / 2, 0] }, 0.12), box(len + 0.1, 0.14, 0.75, HEX.tile, { p: [0, h + 0.07, 0] }, 0.08)]), W]]; }
// 마을 어귀 문(기둥 둘 + 지붕)
export function gatePosts(w = 4.6) {
  seedGeo(31); const post = 0x7a3b2a, p = [];
  for (const s of [-1, 1]) p.push(cyl(0.2, 0.23, 3.6, 6, post, { p: [(s * w) / 2, 1.8, 0] }), box(0.6, 0.35, 0.6, HEX.stoneDark, { p: [(s * w) / 2, 0.17, 0] }));
  p.push(box(w + 1.2, 0.24, 0.3, post, { p: [0, 3.2, 0] }), box(w + 0.6, 0.18, 0.24, post, { p: [0, 2.75, 0] }));
  p.push(box(w + 2, 0.16, 1.3, HEX.tile, { p: [0, 3.62, 0.34], r: [0.42, 0, 0] }, 0.08), box(w + 2, 0.16, 1.3, HEX.tile, { p: [0, 3.62, -0.34], r: [-0.42, 0, 0] }, 0.08));
  return [[merge(p), W]];
}
// 석등
export function lantern() {
  seedGeo(41);
  const s = merge([box(0.8, 0.26, 0.8, HEX.stoneDark, { p: [0, 0.13, 0] }, 0.1), cyl(0.15, 0.19, 1.0, 6, HEX.stone, { p: [0, 0.76, 0] }, 0.1), box(0.62, 0.12, 0.62, HEX.stoneDark, { p: [0, 1.3, 0] }), box(0.5, 0.46, 0.5, HEX.stone, { p: [0, 1.59, 0] }, 0.08), cone(0.62, 0.4, 4, HEX.stoneDark, { p: [0, 2.02, 0], r: [0, Math.PI / 4, 0] }, 0.1), ico(0.09, 0, HEX.stone, { p: [0, 2.28, 0] })]);
  const glow = merge([box(0.24, 0.26, 0.52, 0xffd27a, { p: [0, 1.59, 0] }, 0), box(0.52, 0.26, 0.24, 0xffd27a, { p: [0, 1.59, 0] }, 0)]);
  return [[s, W], [glow, K]];
}
// 솟대
export function sotdae(h = 6.5) { seedGeo(43); return [[merge([cyl(0.045, 0.07, h, 5, HEX.woodDark, { p: [0, h / 2, 0], r: [0, 0, 0.03] }), box(0.16, 0.14, 0.5, HEX.wood, { p: [0.1, h + 0.05, 0.05] }), cone(0.05, 0.22, 4, HEX.woodDark, { p: [0.1, h + 0.1, 0.4], r: [Math.PI / 2, 0, 0] }), box(0.1, 0.05, 0.3, HEX.woodDark, { p: [0.1, h + 0.12, -0.3], r: [0.4, 0, 0] })]), W]]; }
// 쪽글이 붙은 돌
export function memoStone() {
  seedGeo(47);
  return [[merge([paintY(jitter(new THREE.BoxGeometry(1.0, 1.5, 0.4, 1, 2, 1), 0.07).translate(0, 0.75, 0), HEX.stoneDark, HEX.stone, 0, 1.5, 0.08)]), W],
    [merge([box(0.5, 0.72, 0.02, 0xf8f3e6, { p: [0, 0.95, 0.22], r: [0, 0, 0.05] }, 0.02), box(0.09, 0.09, 0.03, HEX.red, { p: [0.14, 0.7, 0.235] }, 0), ...[0, 1, 2, 3].map((i) => box(0.03, 0.42 - i * 0.05, 0.03, 0x2a2a30, { p: [-0.14 + i * 0.09, 1.02 + i * 0.02, 0.232] }, 0))]), K]];
}
// 먹물 항아리
export function jar() { seedGeo(53); return [[merge([paintY(new THREE.SphereGeometry(0.34, 7, 5).scale(1, 1.05, 1).translate(0, 0.34, 0), 0x3a2c22, 0x6a5038, 0, 0.7, 0.08), cyl(0.2, 0.16, 0.12, 7, 0x4a3a2c, { p: [0, 0.7, 0] })]), W], [merge([cyl(0.23, 0.23, 0.05, 7, 0xf4eedd, { p: [0, 0.78, 0] }), torus(0.2, 0.02, 4, 8, HEX.red, { p: [0, 0.72, 0], r: [Math.PI / 2, 0, 0] })]), K]]; }
// 다리 한 토막: 원점에서 +Z 로 len, 반폭 hw. rail=난간
export function deck(len, hw, rail) {
  seedGeo(len * 17 + hw); const p = [], wood = HEX.wood, dark = HEX.woodDark;
  p.push(box(hw * 2, 0.16, len + 0.2, wood, { p: [0, -0.08, len / 2] }, 0.1));
  for (let z = 0.4; z < len; z += 0.8) p.push(box(hw * 2 + 0.1, 0.04, 0.06, dark, { p: [0, 0.01, z] }));
  for (let z = 0.6; z < len; z += rail ? 2.4 : 3.2) for (const s of [-1, 1]) {
    p.push(cyl(0.09, 0.09, 4, 5, dark, { p: [s * (hw - 0.15), -2.1, z] }));
    if (rail) p.push(box(0.12, 0.95, 0.12, dark, { p: [s * (hw - 0.08), 0.47, z] }));
  }
  if (rail) for (const s of [-1, 1]) p.push(box(0.09, 0.09, len, 0x7a3b2a, { p: [s * (hw - 0.08), 0.9, len / 2] }), box(0.07, 0.07, len, dark, { p: [s * (hw - 0.08), 0.5, len / 2] }));
  return [[merge(p), W]];
}
// 바위(충돌 있는 엄폐물용)
export function boulder(s = 1, tall = 1) { seedGeo((s * 100) | 0); return [[rock(1.1 * s, 0.9 * s * tall, 0.95 * s, [0, 0.6 * s * tall, 0]), W]]; }
// 부서진 정자(묵장의 터)
export function ruin() {
  seedGeo(59); const post = 0x5a3026, p = [];
  p.push(cyl(8.5, 8.8, 0.24, 12, 0xa9a69c, { p: [0, 0.1, 0] }, 0.07));
  const posts = [[-3.2, -3.2, 2.9, 0.05], [3.2, -3.2, 1.4, -0.1], [-3.2, 3.2, 0.9, 0.2], [3.2, 3.2, 2.2, 0.03]];
  for (const [x, z, h, t] of posts) p.push(cyl(0.2, 0.22, h, 6, post, { p: [x, 0.2 + h / 2, z], r: [t, 0, t] }), box(0.7, 0.4, 0.7, HEX.stoneDark, { p: [x, 0.3, z] }));
  p.push(cone(3.6, 1.5, 4, HEX.tile, { p: [1.2, 0.95, -1.0], r: [0.5, 0.6, 0.35] }, 0.1), box(3.8, 0.2, 0.22, post, { p: [-1.4, 0.4, 1.8], r: [0, 0.5, 0.06] }), box(2.6, 0.2, 0.22, post, { p: [0.6, 0.36, 3.6], r: [0, -0.3, 0] }));
  return [[merge(p), W]];
}
// 벼루(먹범의 싸움터) 바닥과 테두리
export function inkstone(r = 25.4) {
  seedGeo(61); const p = [];
  p.push(cyl(r, r + 0.4, 0.3, 36, 0x2c2d34, { p: [0, -0.13, 0] }, 0.06));
  p.push(torus(r, 0.75, 5, 40, 0x1b1b21, { p: [0, 0.15, 0], r: [Math.PI / 2, 0, 0] }, 0.08));
  for (const rr of [8.5, 17]) p.push(torus(rr, 0.09, 3, 40, 0x1d1e24, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0] }, 0.05));
  const pool = cyl(9.2, 9.2, 0.05, 28, 0x08080c, { p: [0, 0.04, -13.5] }, 0.02);
  return [[merge(p), W], [merge([pool]), K]];
}
// 큰 먹(검은 비석)
export function inkStick() {
  seedGeo(67); const p = [box(3.0, 10, 1.3, 0x17171c, { p: [0, 4.6, 0], r: [0.05, 0.2, -0.07] }, 0.1)];
  const g = []; for (const [x, y, w, h] of [[-1.3, 4.6, 0.06, 8.6], [1.3, 4.6, 0.06, 8.6], [0, 8.9, 2.6, 0.06], [0, 0.4, 2.6, 0.06]]) g.push(box(w, h, 0.04, HEX.gold, { p: [x, y, 0.67], r: [0.05, 0.2, -0.07] }, 0.05));
  return [[merge(p), W], [merge(g), K]];
}

// ── 움직이는 소품 ──
// 연적(쉼터). setActive(true) 면 백자빛을 되찾고 물이 찬다.
export function shrine() {
  seedGeo(71); const g = new THREE.Group();
  const base = new THREE.Mesh(merge([paintY(jitter(new THREE.CylinderGeometry(1.5, 1.7, 0.42, 8), 0.08).translate(0, 0.21, 0), HEX.stoneDark, HEX.stone, 0, 0.42, 0.08), torus(1.05, 0.15, 5, 12, HEX.stone, { p: [0, 0.46, 0], r: [Math.PI / 2, 0, 0] }, 0.1), cyl(0.24, 0.3, 0.6, 6, HEX.stone, { p: [0, 0.7, 0] }, 0.08)]), MAT.world);
  const vMat = patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: 0x55555a }));
  const vessel = new THREE.Mesh(merge([
    paintY(new THREE.SphereGeometry(0.6, 9, 6).scale(1, 0.78, 1).translate(0, 1.4, 0), 0xe4e8e2, 0xfbfbf6, 0.95, 1.85, 0.04),
    torus(0.57, 0.035, 4, 14, HEX.indigo, { p: [0, 1.45, 0], r: [Math.PI / 2, 0, 0] }, 0.05), torus(0.4, 0.03, 4, 12, HEX.indigo, { p: [0, 1.7, 0], r: [Math.PI / 2, 0, 0] }, 0.05),
    cone(0.09, 0.3, 5, 0xf4f4ee, { p: [0.62, 1.42, 0], r: [0, 0, -1.9] }), ico(0.09, 0, HEX.indigo, { p: [0, 1.9, 0] }),
    ...[0, 1, 2, 3, 4].map((i) => ico(0.05, 0, HEX.indigo, { p: [Math.cos(i * 1.257) * 0.5, 1.58, Math.sin(i * 1.257) * 0.5] })),
  ]), vMat);
  const water = new THREE.Mesh(cyl(0.95, 0.95, 0.03, 12, 0xbfe2e4, { p: [0, 0.5, 0] }, 0.03), MAT.world); water.visible = false;
  g.add(base, vessel, water);
  g.userData = { vessel, water, setActive(on) { vMat.color.set(on ? 0xffffff : 0x55555a); water.visible = on; } };
  return g;
}
// 궤(보물 상자). open() 하면 뚜껑이 열린다.
export function chest() {
  seedGeo(73); const g = new THREE.Group(), wood = 0x5a4330;
  const body = new THREE.Mesh(merge([box(0.95, 0.46, 0.58, wood, { p: [0, 0.23, 0] }, 0.08), box(0.06, 0.5, 0.62, 0x3a2a1e, { p: [-0.46, 0.24, 0] }), box(0.06, 0.5, 0.62, 0x3a2a1e, { p: [0.46, 0.24, 0] })]), MAT.world);
  const brass = new THREE.Mesh(merge([box(0.2, 0.2, 0.03, HEX.gold, { p: [0, 0.3, 0.3] }, 0.05), box(0.99, 0.05, 0.03, HEX.gold, { p: [0, 0.44, 0.3] }, 0.05)]), MAT.keep);
  const lid = new THREE.Group(); lid.position.set(0, 0.46, -0.29);
  lid.add(new THREE.Mesh(merge([box(0.99, 0.13, 0.62, wood, { p: [0, 0.065, 0.29] }, 0.08)]), MAT.world), new THREE.Mesh(box(0.14, 0.1, 0.03, HEX.gold, { p: [0, 0.03, 0.61] }, 0.05), MAT.keep));
  g.add(body, brass, lid); g.userData = { lid, open: false };
  return g;
}
// 장승. kind 0=천하대장군, 1=지하여장군
export function jangseung(kind) {
  seedGeo(79 + kind); const g = new THREE.Group(), wood = kind ? 0x8a6444 : 0x7a5a3e;
  const body = new THREE.Mesh(merge([
    cyl(0.36, 0.42, 3.3, 7, wood, { p: [0, 1.65, 0] }, 0.1), box(1.0, 0.16, 0.5, 0x4a3828, { p: [0, 3.35, 0] }), kind ? cone(0.34, 0.5, 6, 0x4a3828, { p: [0, 3.68, 0] }) : box(0.5, 0.42, 0.36, 0x4a3828, { p: [0, 3.62, 0] }),
    box(0.16, 0.5, 0.22, 0x94704c, { p: [0, 2.62, 0.38] }), box(0.34, 0.09, 0.12, 0x3a2a1e, { p: [-0.17, 3.08, 0.33], r: [0, 0, kind ? 0.25 : -0.3] }), box(0.34, 0.09, 0.12, 0x3a2a1e, { p: [0.17, 3.08, 0.33], r: [0, 0, kind ? -0.25 : 0.3] }),
    box(0.46, 0.2, 0.1, 0x2a1c14, { p: [0, 2.2, 0.36] }),
  ]), MAT.world);
  const face = new THREE.Mesh(merge([
    ico(0.11, 0, 0xf8f3e6, { p: [-0.17, 2.9, 0.33], s: [1, 1.2, 0.6] }, 0), ico(0.11, 0, 0xf8f3e6, { p: [0.17, 2.9, 0.33], s: [1, 1.2, 0.6] }, 0),
    box(0.05, 0.08, 0.04, 0x15151b, { p: [-0.17, 2.89, 0.4] }, 0), box(0.05, 0.08, 0.04, 0x15151b, { p: [0.17, 2.89, 0.4] }, 0),
    ...[-0.15, -0.05, 0.05, 0.15].map((x) => box(0.075, 0.1, 0.04, 0xf8f3e6, { p: [x, 2.22, 0.41] }, 0)),
    box(0.3, 0.06, 0.04, kind ? HEX.indigo : HEX.red, { p: [0, 2.02, 0.4] }, 0),
  ]), MAT.keep);
  g.add(body, face); g.userData = { body };
  return g;
}
// 화공이 떨어뜨린 붓(여백에 꽂혀 있다) — 주인공 붓과 같은 모양
export function bigBrush() {
  seedGeo(83);
  return new THREE.Mesh(merge([cyl(0.026, 0.03, 1.5, 6, 0xb89a6a, { p: [0, 0.2, 0] }, 0.05), cyl(0.05, 0.036, 0.1, 7, 0x2a2a30, { p: [0, 0.99, 0] }), cyl(0.085, 0.055, 0.16, 7, 0x8a8a88, { p: [0, 1.11, 0] }, 0.1), cone(0.086, 0.22, 7, 0x1a1a20, { p: [0, 1.3, 0] }, 0.12)]), MAT.world);
}
// 먹문: 검은 돌기둥과 두 짝 문. open(t: 0~1)
export function inkGate() {
  seedGeo(89); const g = new THREE.Group(), stone = 0x1c1c22;
  const frame = new THREE.Mesh(merge([box(1.6, 5.4, 1.6, stone, { p: [-3.9, 2.7, 0] }, 0.1), box(1.6, 5.4, 1.6, stone, { p: [3.9, 2.7, 0] }, 0.1), box(10.4, 1.3, 1.9, 0x141419, { p: [0, 6.0, 0] }, 0.1), box(11.4, 0.3, 2.5, HEX.tile, { p: [0, 6.8, 0] }, 0.08)]), MAT.world);
  const doors = [];
  for (const s of [-1, 1]) { const d = new THREE.Group(); d.position.set(s * 3.1, 0, 0); d.add(new THREE.Mesh(merge([box(3.05, 5.2, 0.32, 0x101014, { p: [-s * 1.55, 2.7, 0] }, 0.12), box(0.5, 0.5, 0.1, HEX.gold, { p: [-s * 2.7, 2.6, 0.2] }, 0.05)]), MAT.world)); g.add(d); doors.push(d); }
  g.add(frame); g.userData = { doors, seals: [], open(t) { doors[0].rotation.y = -1.75 * t; doors[1].rotation.y = 1.75 * t; } };
  return g;
}
export { rock };
