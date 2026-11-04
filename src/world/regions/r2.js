// Region 2 — Commercial district (sunset -> night). z: -10..120. Underground lives in under.js.
import { bld, room, shade, rubblePile } from '../buildings.js';
import { groundTiles, groundBoxes, road, sidewalk, tree, lamp, car, wire, tape, CAR_COLORS } from '../streets.js';
import { stationEntranceR2 } from './under.js';
import { buildMall } from './r2_mall.js';

const LANT = ['#ffd6a0', '#ffc0cf', '#c9f0e6', '#e6d6ff', '#fff2b0'];

export function buildR2(k) {
  const P = k.pal, R = k.rand, g = k.geo;
  const roads = [[-6, -2, 6, 120], [-80, 70, -6, 80], [6, 20, 80, 28]];
  const walks = [[-10, -2, -6, 70], [-10, 80, -6, 120], [6, -2, 10, 20], [6, 28, 10, 120], [-80, 68, -10, 70], [-80, 80, -10, 82], [10, 18, 80, 20], [10, 28, 80, 30]];
  const holes = [[-28, 38, -12, 42]];
  k.noVeg([-29, 37, -11, 43]);
  groundTiles(k, -80, -2, 80, 120, P.ground, [...roads, ...walks, ...holes, [10, 100, 22, 112]], { dry: P.dry });
  groundBoxes(k, -80, -10, 80, 120, holes);
  roads.forEach((r) => road(k, r, P));
  walks.forEach((w) => sidewalk(k, w, P));
  [[-80, -2, -10, 68], [-80, 82, -10, 120], [10, -2, 80, 18], [10, 30, 80, 120]].forEach((r) => k.green(r[0], r[1], r[2], r[3], { d: 0.32, flowers: 0.08, tall: 0.04 }));

  // promenade + railing along the canal
  for (let x = -80; x < 80; x += 2) for (let z = -10; z < -2; z += 2) g.flat(x, z, x + 2, z + 2, 0.02, (x / 2 + z / 2) % 2 ? '#c9bfca' : '#bdb2c0', 0.05);
  k.col.addBox(0, 0.8, -9.6, 160, 1.6, 0.3);
  for (let x = -80; x <= 80; x += 2) g.box(x, 0.55, -9.6, 0.1, 1.1, 0.1, '#7d7790');
  g.box(0, 1.1, -9.6, 160, 0.08, 0.12, '#8f88a3'); g.box(0, 0.6, -9.6, 160, 0.05, 0.05, '#8f88a3');
  for (let x = -70; x <= 70; x += 20) if (Math.abs(x) > 8) { lamp(k, x, -8.6, -Math.PI / 2); if (R() < 0.7) { k.add('bench', { x: x + 6, y: 0, z: -7.4, ry: Math.PI }); k.col.addBox(x + 6, 0.45, -7.4, 1.9, 0.9, 0.6); } }
  // canal (visual): walls, bed, reeds, puddles
  g.box(0, -1.2, -10.3, 160, 2.4, 0.6, '#9e97ad'); g.box(0, -1.2, -40.3, 160, 2.4, 0.6, '#9e97ad'); g.box(0, 0.06, -40.3, 160, 0.12, 0.8, '#bdb4cc');
  for (let x = -80; x < 80; x += 4) for (let z = -40; z < -10; z += 4) g.flat(x, z, x + 4, z + 4, -2.4, R() < 0.3 ? '#6f9a8e' : '#80897a', 0.08);
  for (let i = 0; i < 14; i++) g.box(-70 + R() * 140, -2.36, -36 + R() * 22, 3 + R() * 6, 0.02, 1 + R() * 3, '#8fc1c4', { ry: R() * 3, skip: [0, 1, 2, 3] });
  k.green(-80, -39, 80, -11, { d: 0.25, tall: 0.5, y: -2.4 });
  // collapsed bridge
  g.box(0, -0.9, -14, 12, 0.6, 9, '#b6aec4', { rx: 0.32 }); g.box(0, -1.0, -36, 12, 0.6, 8, '#b6aec4', { rx: -0.36 });
  for (const x of [-6, 6]) { g.box(x, -0.2, -14, 0.25, 1, 9, '#8f88a3', { rx: 0.32 }); g.box(x, -0.3, -36, 0.25, 1, 8, '#8f88a3', { rx: -0.36 }); }
  rubblePile(g, R, 0, -25, 4, '#a9a1b8', -2.4);
  for (const x of [-4, 0, 4]) g.box(x, 0.45, -6.5, 1.8, 0.9, 0.5, '#e8e1d6', { ry: (R() - 0.5) * 0.4 });
  k.col.addBox(0, 0.8, -6.6, 12, 1.6, 0.6);
  k.sign({ kind: 'banner', key: 'signs.noEntry', x: 0, y: 1.9, z: -6.25, w: 4.2, h: 0.75, bg: '#c9625a', bg2: '#d98a6a' });
  k.anchor('obs_bridge', 0, 1.2, -6.4);

  // buildings
  const H = (x0, z0, x1, z1, fl, face, o) => bld(k, x0, z0, x1, z1, fl, face, o);
  H(-26, 84, -11, 98, 4, 'e', { style: 'shop', sign: 'signs.pharmacy' }); H(-26, 100, -11, 118, 3, 'e', { style: 'shop', sign: 'signs.cafe' });
  H(-40, 84, -30, 98, 3, 'n'); H(-56, 84, -44, 100, 4, 'n'); H(-79, 84, -60, 104, 5, 'n', { ruin: 0.6 });
  H(-40, 104, -28, 118, 2, 'n'); H(-58, 106, -44, 118, 3, 'n'); H(-79, 108, -62, 118, 3, 'n');
  H(-26, 50, -11, 66, 3, 'e', { style: 'shop', sign: 'signs.bookstore' }); H(-42, 52, -30, 66, 4, 's'); H(-58, 50, -46, 66, 3, 's', { style: 'shop', sign: 'signs.bakery' }); H(-79, 48, -62, 66, 5, 's', { ruin: 0.7 });
  H(-44, 6, -30, 30, 4, 'e'); H(-62, 8, -48, 32, 3, 'e'); H(-79, 4, -66, 36, 4, 'e', { ruin: 0.6 });
  H(10, 84, 22, 96, 3, 'w', { style: 'shop', sign: 'signs.florist' });
  H(26, 86, 44, 100, 3, 's'); H(48, 84, 62, 100, 4, 's', { ruin: 0.55 }); H(66, 84, 79, 104, 3, 'w');
  H(26, 104, 40, 118, 3, 'n'); H(44, 104, 60, 118, 2, 'n', { style: 'shop', sign: 'signs.music' }); H(64, 106, 79, 118, 3, 'n');
  H(10, -1, 24, 16, 4, 'w'); H(28, -1, 44, 16, 5, 'n', { ruin: 0.5 }); H(48, -1, 62, 16, 3, 'n'); H(66, -1, 79, 16, 4, 'n');
  buildMall(k);
  studio(k);
  ceremonyStreet(k);
  billboard(k);
  stationEntranceR2(k);
  k.anchor('rem_r2_cer', -40, 0, 75, { zone: [-64, 70.6, -14, 79.4], nav: 'surface' });
  k.anchor('rem_r2_ave', 0, 0, 30, { zone: [-9, 2, 9, 64], nav: 'surface' });

  for (let z = 4; z < 118; z += 13) { if (Math.abs(z - 75) < 9 || Math.abs(z - 24) < 7) continue; if (R() < 0.7) tree(k, -8, z, R() < 0.25 ? 'treeC' : 'treeA'); if (R() < 0.7) tree(k, 8, z + 6, 'treeA'); }
  for (let z = 6; z < 118; z += 22) { lamp(k, -9.2, z, 0); lamp(k, 9.2, z + 11, Math.PI); }
  [[-2.8, 108, 0.2], [2.5, 88, 3.4], [-3, 52, -0.4], [3.4, 30, 2.9], [-1.5, 8, 1.1], [30, 24, 1.5], [52, 25.5, 4.7], [70, 23, 1.7], [-62, 76, 1.6]].forEach(([x, z, ry]) => car(k, x, z, ry, CAR_COLORS[Math.floor(R() * CAR_COLORS.length)]));
  for (let i = 0; i < 30; i++) k.add('rock', { x: -70 + R() * 140, y: 0.05, z: R() * 118, ry: R() * 6, s: 0.12 + R() * 0.3, c: '#b9b0bc' });
  for (const [x, z] of [[-30, 20], [-22, 8], [-36, 40]]) tree(k, x, z, 'treeA', 1.1);
  k.green(-44, -2, -10, 48, { d: 0.5, flowers: 0.12, tall: 0.1 });
}

function studio(k) {
  const g = k.geo, R = k.rand;
  room(k, { x0: 10, z0: 100, x1: 22, z1: 112, h: 3.3, wall: '#d8b8b8', ceil: '#efe2dc', doors: [{ side: 'w', a: 104.6, b: 106.6, h: 2.3 }, { side: 'w', a: 101, b: 103.8, h: 2.6, sill: 0.7 }, { side: 'w', a: 107.4, b: 110.8, h: 2.6, sill: 0.7 }] });
  g.box(16, 0.02, 106, 11.6, 0.04, 11.6, '#c9a98a');
  k.solid(16, 5.1, 106, 12.2, 3.4, 12.2, '#d49fa7'); g.box(16, 7.0, 106, 12.6, 0.4, 12.6, '#efe6f0');
  for (const z of [102, 106, 110]) g.panel(9.88, 5.1, z, 1.1, 1.3, -Math.PI / 2, '#454a66');
  k.sign({ kind: 'sign', key: 'signs.studio', x: 9.86, y: 3.75, z: 106, ry: -Math.PI / 2, w: 5, h: 0.8, bg: '#fff3ea', fg: '#a3606a' });
  // backdrop, camera, counter, frames, stool
  g.box(20.5, 1.6, 106, 0.1, 3.0, 5, '#cdb8e6'); g.box(19.6, 0.02, 106, 1.8, 0.02, 5, '#d9cbef', { skip: [0, 1, 2, 3] });
  g.prism(16.8, 0, 106, 0.04, 0.02, 1.4, 4, '#4b4650', { rz: 0.15 }); g.prism(16.8, 0, 106, 0.04, 0.02, 1.4, 4, '#4b4650', { rz: -0.15 }); g.box(16.8, 1.45, 106, 0.4, 0.28, 0.3, '#3a3640');
  g.box(19.4, 0.25, 105.6, 0.5, 0.5, 0.5, '#a3606a');
  k.solid(13.2, 0.5, 110.6, 2.6, 1.0, 0.8, '#b98f86', { top: '#e9d6cc' });
  const DECOR = ['ceremony', 'p_grad', 'ceremony', 'p_raincoat', 'ceremony', 'p_solo'];
  for (let i = 0; i < 6; i++) k.sign({ kind: 'photo', key: 'signs.photoNone', variant: DECOR[i], x: 10.5 + i * 1.6, y: 2.25 + (i % 2) * 0.2, z: 111.82, ry: Math.PI, w: 0.6, h: 0.72, pw: 160 });
  for (let i = 0; i < 4; i++) k.sign({ kind: 'photo', key: 'signs.photoNone', variant: i % 2 ? 'p_grad' : 'ceremony', x: 21.82, y: 2.1, z: 101.4 + i * 1.3 + (i > 1 ? 3.8 : 0), ry: -Math.PI / 2, w: 0.6, h: 0.75, pw: 160 });
  // P3: board of prints nobody collected (only dates on the back) — one shows the same two people as the photo at home
  k.solid(18.9, 1.2, 111.86, 2.7, 0.8, 0.08, '#b98f6a');
  tape(k, 20.35, 1.62, 111.8, 0, { w: 0.2 });
  k.sign({ kind: 'decal', key: 'clues.uncollected', x: 18.9, y: 1.72, z: 111.8, ry: Math.PI, w: 2.4, h: 0.26, fg: '#5b4a3a', font: 'print', pw: 512 });
  ['p_raincoat', 'p_us', 'p_grad', 'p_solo'].forEach((v, i) => { const x = 20.0 - i * 0.72; k.sign({ kind: 'photo', key: 'signs.photoNone', variant: v, x, y: 1.2, z: 111.8, ry: Math.PI, w: 0.44, h: 0.52, pw: 160 }); k.anchor('obs_studio_' + 'abcd'[i], x, 1.2, 111.7); });
  g.prism(12.2, 0, 101.2, 0.18, 0.18, 0.05, 8, '#6a5a5a'); g.prism(12.2, 0.05, 101.2, 0.025, 0.025, 1.45, 5, '#6a5a5a');
  k.glow.prism(12.2, 1.45, 101.2, 0.3, 0.18, 0.35, 8, '#ffcf8a', { jit: 0 });
  k.anchor('s2', 15.4, 0, 105.8, { yaw: Math.PI / 2, lamp: [12.2, 1.6, 101.2], r: 5.5 });
  k.anchor('bat_s2', 13.4, 1.05, 110.6);
  k.anchor('note_r2_photo', 12.6, 1.03, 110.5);
  k.anchor('obs_reservation', 13.9, 1.04, 110.6);
  k.zone({ id: 'studio', kind: 'indoor', box: [10, -0.5, 100, 22, 3.4, 112], surf: 'wood', reverb: 'room' });
}

function ceremonyStreet(k) {
  const g = k.geo, R = k.rand;
  // lantern strings across the street
  for (let x = -76; x <= -14; x += 6) {
    const a = [x + (R() - 0.5), 6.2, 68.5], b = [x + (R() - 0.5), 6.2, 81.5];
    wire(g, a, b, 1.1, '#5c5664', 8);
    for (let t = 0.08; t < 0.95; t += 0.1) { const y = 6.2 - Math.sin(Math.PI * t) * 1.1 - 0.35; k.add('lantern', { x: a[0] + (b[0] - a[0]) * t, y, z: a[2] + (b[2] - a[2]) * t, ry: R() * 3, rz: (R() - 0.5) * 0.3, c: LANT[Math.floor(R() * LANT.length)] }); }
  }
  // bunting along the street
  for (const z of [69, 81]) for (let x = -78; x < -12; x += 0.8) { const y = 4.6 - Math.abs(Math.sin(x * 0.2)) * 0.5; k.soft.tri({ x, y, z }, { x: x + 0.6, y, z }, { x: x + 0.3, y: y - 0.5, z }, k.soft.col(LANT[Math.floor(R() * 5)], 0.05).clone()); }
  // stalls
  const stalls = [[-20, 69.2, 0], [-32, 69.2, 0], [-46, 69.2, 0], [-26, 80.8, Math.PI], [-40, 80.8, Math.PI], [-54, 80.8, Math.PI]];
  stalls.forEach(([x, z, ry], i) => {
    const s = Math.cos(ry) > 0 ? 1 : -1, cz = z + s * 0.4;
    k.solid(x, 0.45, cz, 2.6, 0.9, 1.0, '#e9d6c0', { ry });
    for (const dx of [-1.25, 1.25]) for (const dz of [-0.45, 0.45]) g.box(x + dx, 1.3, cz + dz, 0.07, 2.6, 0.07, '#8a7a70');
    for (let j = 0; j < 5; j++) g.box(x - 1.3 + j * 0.52 + 0.26, 2.65, cz, 0.52, 0.06, 1.4, j % 2 ? '#fff3ea' : ['#f3c7c0', '#b9dcd5', '#e9d29a', '#c9bde6'][i % 4], { rx: s * 0.18 });
    for (let j = 0; j < 7; j++) g.box(x - 1 + R() * 2, 0.98, cz + (R() - 0.5) * 0.6, 0.18, 0.16, 0.18, LANT[j % 5], { ry: R() });
    k.sign({ kind: 'sign', key: `signs.stall${(i % 4) + 1}`, x, y: 2.25, z: cz + s * 0.55, ry, w: 1.8, h: 0.42, bg: '#fff8ee', fg: '#a3606a', double: true });
  });
  k.anchor('note_r2_vendor', -32, 0.92, 69.75);
  // stage at the west end
  k.solid(-72, 0.6, 75, 12, 1.2, 9, '#a99fbf', { top: '#c7bfd8' });
  for (const x of [-77.6, -66.4]) g.box(x, 3.4, 71, 0.3, 5.6, 0.3, '#5c5664');
  g.box(-72, 6.1, 71, 11.5, 0.3, 0.3, '#5c5664');
  k.sign({ kind: 'banner', key: 'signs.ceremony', x: -72, y: 4.6, z: 71.2, w: 10.6, h: 1.6, bg: '#f6c9b8', bg2: '#bfe3df' });
  g.box(-74, 1.75, 76, 1.2, 0.08, 0.4, '#3a3640'); g.box(-74, 1.45, 76, 0.06, 0.5, 0.06, '#3a3640');
  g.prism(-69.5, 1.2, 76.5, 0.4, 0.4, 0.5, 10, '#e8e4ee'); g.prism(-70.3, 1.2, 77.3, 0.3, 0.3, 0.4, 10, '#c9625a');
  for (const x of [-77, -67]) k.solid(x, 1.9, 78.5, 0.9, 1.4, 0.7, '#3a3640');
  k.anchor('obs_stage', -72, 1.8, 77);
  for (let i = 0; i < 40; i++) k.add('chair', { x: -64 + (i % 8) * 1.1 + R() * 0.2, y: 0, z: 72 + Math.floor(i / 8) * 1.4, ry: -Math.PI / 2 + (R() - 0.5) * 0.5, rz: R() < 0.12 ? 1.4 : 0, c: R() < 0.5 ? '#f4efe8' : '#e8e0f0' });
  for (const z of [68.3, 81.7]) { lamp(k, -10.5, z, z < 75 ? Math.PI / 2 : -Math.PI / 2); }
  k.sign({ kind: 'banner', key: 'signs.ceremony', x: -11.0, y: 5.4, z: 75, ry: Math.PI / 2, w: 9, h: 1.0, bg: '#f6c9b8', bg2: '#cdb8e6' });
  g.box(-11.1, 5.4, 75, 0.1, 1.2, 9.4, '#7d7790');
  k.green(-80, 68, -10, 82, { d: 0.12, flowers: 0.2 });
}

function billboard(k) {
  const g = k.geo;
  // a huge billboard fallen against its own frame on the station plaza, facing the avenue
  g.box(-21, 2.2, 14, 0.4, 4.4, 0.4, '#6f6a78', { rz: 0.2 }); g.box(-21, 2.2, 26, 0.4, 4.4, 0.4, '#6f6a78', { rz: -0.1 });
  g.box(-20.2, 3.2, 20, 0.35, 6.6, 13.4, '#5f5a6b', { rz: 0.42 });
  k.col.addBox(-20.3, 2.5, 20, 2.6, 5, 13.4);
  k.sign({ kind: 'billboard', x: -19.7, y: 3.25, z: 20, ry: Math.PI / 2, rx: -0.42, w: 12.6, h: 6.0, pw: 1024, ph: 488 });
  k.anchor('obs_billboard', -18.0, 2.4, 20);
  for (let i = 0; i < 8; i++) g.box(-17 + k.rand() * 3, 0.05, 14 + k.rand() * 12, 0.5 + k.rand(), 0.06, 0.4, '#d9cdf0', { ry: k.rand() * 3 });
}
