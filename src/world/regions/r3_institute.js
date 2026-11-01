// Memory Preservation Institute (shell) and the clock tower — the landmark visible from everywhere.
import * as THREE from 'three';
import { room, shade } from '../buildings.js';
import { towerBeacon } from './r3.js';
import { dotTexture } from '../textures.js';

const STONE = '#cfc6d9', STONE2 = '#bfb6cf', TRIM = '#ece6f2';
export const TOWER = { x: 0, z: -166, half: 6.5, levels: [0, 8, 16, 24], top: 58 };

export function buildInstitute(k) {
  const g = k.geo, R = k.rand, x0 = -42, x1 = 42, z0 = -184, z1 = -140, H = 12;
  room(k, { x0, z0, x1, z1, h: H, t: 0.6, wall: STONE, doors: [{ side: 's', a: -3, b: 3, h: 4.6 }] });
  // roof slabs around the tower hole
  const roof = (ax, az, bx, bz) => { k.solid((ax + bx) / 2, H + 0.2, (az + bz) / 2, bx - ax, 0.4, bz - az, STONE2, { top: '#a9a1bb', bottom: true }); };
  roof(x0, z0, x1, -172); roof(x0, -160, x1, z1); roof(x0, -172, -6, -160); roof(6, -172, x1, -160);
  for (const [a, b, z, w] of [[x0, x1, z0 - 0.15, 0], [x0, x1, z1 + 0.15, 0]]) g.box((a + b) / 2, H + 0.7, z, b - a, 0.9, 0.3, TRIM);
  g.box(x0 - 0.15, H + 0.7, (z0 + z1) / 2, 0.3, 0.9, z1 - z0, TRIM); g.box(x1 + 0.15, H + 0.7, (z0 + z1) / 2, 0.3, 0.9, z1 - z0, TRIM);
  for (const y of [4, 8]) { g.box(0, y, z1 + 0.32, x1 - x0 + 0.4, 0.22, 0.12, TRIM); g.box(0, y, z0 - 0.32, x1 - x0 + 0.4, 0.22, 0.12, TRIM); }
  // windows on all facades (3 floors)
  for (let f = 0; f < 3; f++) {
    const y = f * 4 + 2.3;
    for (let x = x0 + 3; x < x1 - 2; x += 3.4) {
      if (f === 0 && Math.abs(x) < 6) continue;
      for (const [z, ry] of [[z1 + 0.33, 0], [z0 - 0.33, Math.PI]]) { g.panel(x, y, z, 1.5, 2.3, ry, TRIM); g.panel(x, y, z + (ry ? -0.02 : 0.02), 1.2, 2.0, ry, R() < 0.15 ? '#22243a' : '#363a5a', 0.06); }
    }
    for (let z = z0 + 3; z < z1 - 2; z += 3.4) for (const [x, ry] of [[x1 + 0.33, Math.PI / 2], [x0 - 0.33, -Math.PI / 2]]) { g.panel(x, y, z, 1.5, 2.3, ry, TRIM); g.panel(x + (ry > 0 ? 0.02 : -0.02), y, z, 1.2, 2.0, ry, '#363a5a', 0.06); }
  }
  // portico: columns, roof, pediment, steps
  for (let i = 0; i < 10; i++) { const x = -19.8 + i * 4.4; g.prism(x, 0, -138.2, 0.55, 0.48, 9.6, 10, '#e2dbea'); g.box(x, 9.7, -138.2, 1.3, 0.3, 1.3, TRIM); k.col.addBox(x, 4.8, -138.2, 1.0, 9.6, 1.0); }
  g.box(0, 10.2, -139.1, 46, 0.8, 3.4, TRIM, { bottom: true });
  const pd = new THREE.Shape(); void pd;
  g.tri({ x: -22, y: 10.6, z: -137.4 }, { x: 22, y: 10.6, z: -137.4 }, { x: 0, y: 14.2, z: -137.4 }, g.col('#e2dbea', 0.03).clone());
  g.box(-11, 12.4, -139.1, 23.6, 0.25, 3.5, STONE2, { rz: 0.162, bottom: true }); g.box(11, 12.4, -139.1, 23.6, 0.25, 3.5, STONE2, { rz: -0.162, bottom: true });
  for (let i = 0; i < 3; i++) k.solid(0, 0.12 + i * 0.25, -136.2 + i * -0.8 - 0.4, 46 - i * 1.2, 0.25 + i * 0.25 * 0, 1.6 + (2 - i) * 0.0, i % 2 ? '#d8d0e0' : '#cec6d9', { top: '#e2dbea' });
  k.sign({ kind: 'sign', key: 'signs.institute', x: 0, y: 5.6, z: -139.75, w: 9, h: 1.0, bg: '#ece6f2', fg: '#5b5677' });
  k.sign({ kind: 'clock', x: 0, y: 7.8, z: -139.75, w: 1.4, h: 1.4, pw: 128 });
  k.anchor('institute_door', 0, 0, -140, { size: [6, 4.6] });
  k.col.setDyn('institute_door', { x: 0, y: 2.3, z: -140, sx: 6, sy: 4.6, sz: 0.4 });
  g.box(0, 2.3, -140.05, 5.9, 4.5, 0.12, '#6d6a86');
  buildTower(k);
}

function buildTower(k) {
  const s = k.stone, R = k.rand, { x, z, half, top } = TOWER, t = 0.7;
  const wallSeg = (y0, y1, side, from, to) => {
    const L = to - from, c = (from + to) / 2, hy = y1 - y0, cy = (y0 + y1) / 2;
    if (side === 'n' || side === 's') { const zz = side === 'n' ? z - half + t / 2 : z + half - t / 2; s.box(x + c, cy, zz, L, hy, t, STONE, { jit: 0.03 }); k.col.addBox(x + c, cy, zz, L, hy, t); }
    else { const xx = side === 'w' ? x - half + t / 2 : x + half - t / 2; s.box(xx, cy, z + c, t, hy, L, STONE, { jit: 0.03 }); k.col.addBox(xx, cy, z + c, t, hy, L); }
  };
  for (const side of ['n', 's', 'e', 'w']) {
    wallSeg(0, 24, side, -half, half);
    wallSeg(24, 31, side, -half, -2.2); wallSeg(24, 31, side, 2.2, half); wallSeg(29.4, 31, side, -2.2, 2.2);
    wallSeg(31, 50, side, -half, half);
    wallSeg(50, top, side, -half, -2.6); wallSeg(50, top, side, 2.6, half); wallSeg(56.4, top, side, -2.6, 2.6);
  }
  for (const y of [12.2, 24, 31, 37.2, 50, top]) s.box(x, y, z, 2 * half + 0.7, 0.45, 2 * half + 0.7, TRIM, { bottom: true });
  s.box(x, 0.4, z, 2 * half + 1, 0.8, 2 * half + 1, STONE2);
  s.prism(x, top + 0.2, z, half * 1.3, 0, 15, 4, '#8f88ab', { a0: Math.PI / 4, jit: 0.04 });
  s.prism(x, top + 15, z, 0.08, 0.05, 2.4, 4, '#c9c0d4');
  s.prism(x, 51, z, 1.6, 0.6, 2.6, 10, '#b59a6a', { bottom: true });
  // slit windows down the shaft
  for (let y = 4; y < 23; y += 4.5) for (const [ry, ox, oz] of [[0, 0, half + 0.02], [Math.PI, 0, -half - 0.02], [Math.PI / 2, half + 0.02, 0], [-Math.PI / 2, -half - 0.02, 0]]) s.panel(x + ox, y, z + oz, 0.7, 2.2, ry, '#363a5a', 0.05);
  // clock faces (hands are separate meshes so the ending can move them)
  const faces = [];
  for (const [ry, ox, oz] of [[0, 0, half + 0.03], [Math.PI, 0, -half - 0.03], [Math.PI / 2, half + 0.03, 0], [-Math.PI / 2, -half - 0.03, 0]]) {
    k.sign({ kind: 'clock', x: x + ox, y: 43.5, z: z + oz, ry, w: 6, h: 6, pw: 512, hands: false, glow: true, soft: true, bg: '#f7f0e2', fg: '#4b4458' });
    faces.push({ ry, ox, oz });
  }
  const handMat = new THREE.MeshBasicMaterial({ color: '#3f3a4e', fog: false });
  k.W.towerHands = faces.map(({ ry, ox, oz }) => {
    const n = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
    const pivot = new THREE.Group(); pivot.position.set(x + ox + n.x * 0.08, 43.5, z + oz + n.z * 0.08); pivot.rotation.y = ry;
    const mk = (len, w) => { const hg = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.06), handMat); m.position.y = len / 2 - 0.2; hg.add(m); pivot.add(hg); return hg; };
    const hour = mk(1.7, 0.24), minute = mk(2.5, 0.15);
    k.W.landmark.add(pivot);
    return { hour, minute };
  });
  k.W.setTowerTime = (h, m) => { for (const hd of k.W.towerHands) { hd.hour.rotation.z = -((h % 12) + m / 60) / 12 * Math.PI * 2; hd.minute.rotation.z = -(m / 60) * Math.PI * 2; } };
  k.W.setTowerTime(9, 47);
  k.W.dot = dotTexture();
  towerBeacon(k);
  k.anchor('tower', x, 0, z);
  k.anchor('obs_tower_clock', 0, 1.6, -136);
  void R; void shade;
}
