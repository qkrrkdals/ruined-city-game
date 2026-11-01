// Region 1 hand-authored places: my house (start/shelter 1), store, garage (fuse), gate, playground, park, bus stop.
import { room, shade, rubblePile } from '../buildings.js';
import { tree, wire } from '../streets.js';

const WALL = '#f2c29b', INNER = '#f6e6d2', WOOD = '#c9a27c', DARK = '#7a6658';

export function buildHouse(k) {
  const g = k.geo, R = k.rand;
  // 1F shell (x -26..-14, z 236..246)
  room(k, { x0: -26, z0: 236, x1: -14, z1: 246, y: 0, h: 2.7, wall: WALL, inner: '#f7ead9', doors: [
    { side: 'e', a: 240.4, b: 241.8, h: 2.2 }, { side: 'e', a: 237.2, b: 238.6, h: 2.0, sill: 0.9 }, { side: 'e', a: 243.4, b: 244.8, h: 2.0, sill: 0.9 },
    { side: 'w', a: 240.3, b: 241.5, h: 2.2 }, { side: 'w', a: 237.4, b: 238.6, h: 1.9, sill: 1.1 },
    { side: 'n', a: -20.5, b: -19.3, h: 2.0, sill: 0.9 }, { side: 'n', a: -16.5, b: -15.3, h: 2.0, sill: 0.9 }, { side: 's', a: -19, b: -17.6, h: 2.0, sill: 0.9 }] });
  g.box(-20, 0.02, 241, 11.6, 0.04, 9.6, WOOD, { jit: 0.05 });
  // 2F shell
  room(k, { x0: -26, z0: 236, x1: -14, z1: 246, y: 2.7, h: 2.5, wall: shade(WALL, 1.03), inner: '#e9eef0', doors: [
    { side: 'w', a: 240, b: 242, h: 2.1 }, { side: 'e', a: 237.5, b: 238.7, h: 1.9, sill: 0.9 }, { side: 'e', a: 243.5, b: 244.7, h: 1.9, sill: 0.9 },
    { side: 's', a: -19.5, b: -18.3, h: 1.9, sill: 0.9 }, { side: 'n', a: -17, b: -15.8, h: 1.9, sill: 0.9 }] });
  // floor slab with the collapsed-stair hole (x -26..-23, z 243.3..246)
  k.solid(-20, 2.6, 239.65, 12, 0.2, 7.3, '#f1e6d6', { top: '#c69f78', bottom: true });
  k.solid(-18.5, 2.6, 244.65, 9, 0.2, 2.7, '#f1e6d6', { top: '#c69f78', bottom: true });
  // roof: east half only (west half collapsed -> open to the sky)
  k.solid(-17.1, 5.35, 241, 6.5, 0.25, 10.6, '#c9735f', { top: '#d6806a', bottom: true });
  for (let i = 0; i < 4; i++) g.beam(-20.3, 5.3, 236.6 + i * 2.9, -22.6 - R(), 4.6 - R() * 0.8, 236.8 + i * 2.9, 0.14, '#7a5f50');
  k.solid(-22.4, 2.95, 238.8, 1.6, 0.5, 1.8, '#b97a66', { ry: 0.4 });
  // interior partitions: storage room NW (x -26..-22.5, z 236..239.2)
  k.solid(-22.5, 1.35, 236.6, 0.2, 2.7, 1.2, INNER); k.solid(-22.5, 1.35, 238.75, 0.2, 2.7, 0.9, INNER);
  g.box(-22.5, 2.45, 237.75, 0.2, 0.5, 1.1, INNER); k.col.addBox(-22.5, 2.45, 237.75, 0.2, 0.5, 1.1);
  k.solid(-24.25, 1.35, 239.2, 3.5, 2.7, 0.2, INNER);
  // collapsed stairs rubble (SW corner) — too low to reach the 2F hole
  k.solid(-24.5, 0.45, 244.6, 2.6, 0.9, 2.2, '#a8927c', { rz: 0.06 });
  rubblePile(g, R, -24.4, 244.4, 1.2, '#b69c84');
  for (let i = 0; i < 5; i++) g.box(-25.4 + i * 0.5, 0.95 + i * 0.12, 244.6, 0.45, 0.12, 1.1, WOOD, { rx: 0.2 * (R() - 0.5), rz: -0.3 });
  // kitchen counter, table, chairs, sofa, shelf
  k.solid(-18, 0.45, 236.5, 7, 0.9, 0.7, '#e8d9c6', { top: '#f3ece2' });
  g.box(-16.5, 0.92, 236.5, 0.8, 0.05, 0.5, '#9fb2bd');
  k.solid(-17.5, 0.73, 240.1, 1.6, 0.06, 0.9, WOOD);
  for (const [x, z] of [[-18.2, 239.7], [-16.8, 239.7], [-18.2, 240.5], [-16.8, 240.5]]) g.box(x, 0.36, z, 0.06, 0.72, 0.06, DARK);
  for (const [x, z, r] of [[-17.5, 241, 0], [-16.4, 239.4, 0.6]]) { g.box(x, 0.45, z, 0.45, 0.05, 0.45, WOOD, { ry: r }); g.box(x, 0.7, z + 0.2, 0.45, 0.5, 0.05, WOOD, { ry: r }); }
  k.solid(-19.9, 0.25, 245.25, 2.6, 0.5, 0.9, '#a9c4c9'); g.box(-19.9, 0.7, 245.65, 2.6, 0.5, 0.2, '#98b6bc'); g.box(-19.9, 0.52, 245.15, 2.4, 0.08, 0.7, '#bcd3d6');
  k.solid(-25.6, 1.0, 241.0, 0.5, 2.0, 1.6, '#c4a080');
  for (let i = 0; i < 3; i++) g.box(-25.55, 0.5 + i * 0.6, 241, 0.42, 0.05, 1.5, '#a9845f');
  // storage room: the strange chair + device (foreshadowing)
  g.box(-24.3, 0.45, 237.6, 0.6, 0.08, 0.6, '#d6d0d8'); g.box(-24.3, 0.8, 237.3, 0.6, 0.7, 0.08, '#d6d0d8');
  g.box(-24.3, 1.35, 237.35, 0.5, 0.06, 0.5, '#8d8aa0'); g.prism(-24.3, 0.0, 237.6, 0.05, 0.05, 0.45, 5, '#8d8aa0');
  k.solid(-25.3, 0.6, 236.7, 0.9, 1.2, 0.6, '#9a97a8'); k.glow.box(-25.3, 1.0, 237.02, 0.12, 0.06, 0.02, '#7fd6cf');
  for (let i = 0; i < 3; i++) g.beam(-25.2, 0.9, 237.0, -24.3 + (i - 1) * 0.15, 1.33, 237.35, 0.02, '#4b4650');
  // floor lamp (shelter light) + clock
  g.prism(-15.0, 0, 245.2, 0.18, 0.18, 0.05, 8, DARK); g.prism(-15.0, 0.05, 245.2, 0.025, 0.025, 1.45, 5, DARK);
  k.glow.prism(-15.0, 1.45, 245.2, 0.3, 0.18, 0.35, 8, '#ffcf8a', { jit: 0 });
  k.sign({ kind: 'clock', x: -14.17, y: 2.0, z: 238.9, ry: -Math.PI / 2, w: 0.5, h: 0.5, pw: 128 });
  // 2F: desk, bed, wardrobe
  k.solid(-18.1, 3.42, 245.4, 1.8, 0.06, 0.7, WOOD);
  for (const [x, z] of [[-18.9, 245.1], [-17.3, 245.1], [-18.9, 245.7], [-17.3, 245.7]]) g.box(x, 3.06, z, 0.06, 0.72, 0.06, DARK);
  k.solid(-16.7, 2.95, 237.2, 2.2, 0.5, 1.8, '#f3e4d4'); g.box(-16.7, 3.25, 236.5, 2.2, 0.1, 0.5, '#e9a8a8');
  k.solid(-14.6, 3.8, 242, 0.6, 2.2, 1.4, '#d8b896');
  // balcony (west, 2F) with a broken railing — the way up from the yard
  k.solid(-26.8, 2.6, 241, 1.6, 0.2, 5, '#d9c4ad', { bottom: true });
  for (const [z0, z1] of [[238.5, 239.3], [242.7, 243.5]]) k.solid(-27.55, 3.2, (z0 + z1) / 2, 0.08, 1.0, z1 - z0, '#9b8a80');
  k.solid(-26.8, 3.2, 238.52, 1.6, 1.0, 0.08, '#9b8a80'); k.solid(-26.8, 3.2, 243.48, 1.6, 1.0, 0.08, '#9b8a80');
  g.beam(-27.5, 3.7, 239.3, -27.9, 2.9, 240.2, 0.06, '#9b8a80');
  // yard (x -36..-26, z 232..252): low fence with a gap on the street side
  const fence = (x0, z0, x1, z1) => { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = Math.hypot(x1 - x0, z1 - z0), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    k.col.addBox(cx, 0.5, cz, alongX ? L : 0.1, 1.0, alongX ? 0.1 : L);
    for (let s = 0; s <= L; s += 0.35) { const t = s / L; g.box(x0 + (x1 - x0) * t, 0.45, z0 + (z1 - z0) * t, 0.09, 0.9 + (R() - 0.5) * 0.12, 0.09, '#f4eee6', { rz: R() < 0.1 ? 0.3 : 0 }); }
    g.box(cx, 0.75, cz, alongX ? L : 0.06, 0.07, alongX ? 0.06 : L, '#e9e0d4'); };
  fence(-36, 232, -36, 252); fence(-36, 252, -26, 252); fence(-36, 232, -34, 232); fence(-30, 232, -26, 232);
  k.green(-36, 232, -26, 252, { d: 1.2, flowers: 0.18, tall: 0.1 });
  k.solid(-28.4, 0.35, 233.4, 3, 0.7, 0.9, '#c9a98a'); k.green(-29.8, 233, -27, 233.8, { d: 6, flowers: 0.5, y: 0.7 });
  // laundry line
  for (const z of [246.5, 251]) { g.prism(-34.6, 0, z, 0.05, 0.04, 2.1, 5, '#8a8a90'); k.col.addBox(-34.6, 1, z, 0.15, 2, 0.15); }
  wire(k.geo, [-34.6, 2.0, 246.5], [-34.6, 2.0, 251], 0.15, '#d9d4cc', 4);
  [['#f3c7c0', 247.2], ['#fff6e8', 248.1], ['#b9dcd5', 249.0], ['#e8b73f', 249.9]].forEach(([c, z]) => k.soft.box(-34.6, 1.55, z, 0.02, 0.8, 0.7, c, { rz: 0.05 }));
  // anchors (used by story/puzzles)
  k.anchor('spawn', -19.9, 0, 243.6, { yaw: -0.6 });
  k.anchor('s1', -18.6, 0, 243.2, { yaw: -0.6, lamp: [-15.0, 1.6, 245.2], r: 5 });
  k.anchor('note_r1_table', -17.5, 0.78, 240.1);
  k.anchor('bat_s1', -16.2, 0.95, 236.5);
  k.anchor('obs_device', -24.3, 1.0, 237.6);
  k.anchor('obs_clock_house', -14.3, 2.0, 238.9);
  k.anchor('flashlight', -18.6, 3.48, 245.35);
  k.anchor('obs_photo_home', -17.6, 3.6, 245.55);
  k.anchor('note_r1_haram', -18.1, 3.46, 245.2);
  k.anchor('obs_laundry', -34.4, 1.5, 249.5);
  k.anchor('obs_sticker', -13.82, 1.55, 241.95);
  k.anchor('crate_r1_a', -31.5, 0.45, 237.5); k.anchor('crate_r1_b', -33.2, 0.45, 245); k.anchor('crate_r1_c', -30.2, 0.45, 249.5);
  k.anchor('yard_bounds', -36, -1, 232, { max: [-26, 4, 252] });
  k.sign({ kind: 'sticker', key: 'signs.sticker', x: -13.82, y: 1.55, z: 241.95, ry: Math.PI / 2, w: 0.42, h: 0.2, pw: 256 });
  k.zone({ id: 'house', kind: 'indoor', box: [-26.2, -0.5, 235.8, -13.8, 5.5, 246.2], surf: 'wood', reverb: 'room' });
  k.noVeg([-27.8, 235.8, -13.8, 246.2]);
}

export function buildStore(k) {
  const g = k.geo, R = k.rand;
  room(k, { x0: 12, z0: 198, x1: 26, z1: 212, h: 3.2, wall: '#e9e1f0', ceil: '#d9d2e0', doors: [{ side: 'w', a: 200.5, b: 209.5, h: 2.6 }] });
  g.box(19, 0.02, 205, 13.6, 0.04, 13.6, '#d8d4dc');
  g.box(12, 4.0, 205, 0.3, 1.6, 14, '#b9dcd5'); g.box(19, 3.45, 205, 14.4, 0.3, 14.4, '#cfc8d8');
  k.sign({ kind: 'sign', key: 'signs.store', x: 11.82, y: 4.0, z: 205, ry: -Math.PI / 2, w: 7, h: 1.1, bg: '#b9dcd5', fg: '#3f6f7a' });
  for (const z of [202.5, 205.5, 208.5]) {
    k.solid(20, 0.8, z, 6, 1.6, 0.7, '#c9c2d4');
    for (let i = 0; i < 18; i++) g.box(17.3 + R() * 5.4, 0.35 + Math.floor(R() * 3) * 0.5, z + (R() - 0.5) * 0.5, 0.2, 0.22, 0.15, ['#f3c7c0', '#b9dcd5', '#e9d29a', '#c9bde6', '#fff3ea'][i % 5], { ry: R() });
  }
  k.solid(24.6, 0.55, 200, 1.6, 1.1, 2.4, '#d6c7b8', { ry: 0 });
  g.box(17, 0.4, 210.5, 2.2, 0.8, 0.6, '#c9c2d4', { rz: 1.2 }); k.col.addBox(17, 0.4, 210.5, 2.2, 0.8, 0.8);
  for (let i = 0; i < 25; i++) g.box(13 + R() * 12, 0.06, 199 + R() * 12, 0.25, 0.08, 0.15, ['#f3c7c0', '#b9dcd5', '#e9d29a'][i % 3], { ry: R() * 3 });
  k.sign({ kind: 'clock', x: 25.83, y: 2.5, z: 205, ry: -Math.PI / 2, w: 0.45, h: 0.45, pw: 128 });
  k.anchor('bat_r1_a', 21.5, 0.95, 208.5);
  k.zone({ id: 'store', kind: 'indoor', box: [12, -0.5, 198, 26, 3.3, 212], surf: 'tile', reverb: 'room' });
}

export function buildGarage(k) {
  const g = k.geo, R = k.rand, Y = -3.8, C = '#a6a8aa';
  k.solid(32, Y - 0.25, 136, 32, 0.5, 24, C, { top: '#9ea3a3' });
  room(k, { x0: 16, z0: 124, x1: 48, z1: 148, y: Y, h: 2.8, wall: '#b8bcbc', doors: [{ side: 's', a: 16, b: 20, h: 2.6 }] });
  g.box(32, -1.02, 136, 32, 0.04, 24, '#8e9294', { bottom: true });
  // ramp (z 160 top -> 148 bottom) + trench walls + safety rail on the surface
  k.col.addRamp(18, 0, 160, 18, Y, 148, 4.2);
  g.box(18, Y / 2 - 0.15, 154, 4, 0.3, 12.6, '#9ea3a3', { rx: -Math.atan2(-Y, 12) });
  for (const x of [15.85, 20.15]) k.solid(x, (Y + 1) / 2, 154, 0.3, 1 - Y, 12, '#b8bcbc');
  k.solid(18, 0.6, 147.85, 4.6, 1.2, 0.3, '#b8bcbc');
  for (let i = 0; i < 6; i++) g.box(18, 0.03 - (0.5 + 2 * i) * (-Y / 12), 159.5 - i * 2, 3.6, 0.02, 0.25, '#e9d29a', { rx: -Math.atan2(-Y, 12), skip: [0, 1, 2, 3] });
  // pillars + parking lines + parked cars
  for (const x of [22, 28, 34, 40]) for (const z of [130, 136, 142]) k.solid(x, Y + 1.4, z, 0.6, 2.8, 0.6, '#c2c5c5');
  for (let x = 23; x < 47; x += 3) { g.box(x, Y + 0.01, 128.5, 0.1, 0.02, 4, '#e8e4d8', { skip: [0, 1, 2, 3] }); g.box(x, Y + 0.01, 143.5, 0.1, 0.02, 4, '#e8e4d8', { skip: [0, 1, 2, 3] }); }
  [[24.5, 128.4, 0.05], [30.5, 128.6, -0.08], [39.5, 143.6, 3.1], [33.5, 143.4, 3.2], [42.5, 128.5, 0.1]].forEach(([x, z, ry]) => {
    k.add('car', { x, y: Y, z, ry, c: ['#e9c6c0', '#bfd8e0', '#c9c2dc', '#e6e2dc', '#a7b6c9'][Math.floor(R() * 5)] });
    k.col.addBox(x, Y + 0.75, z, 1.9, 1.5, 4.3, ry);
  });
  for (let i = 0; i < 12; i++) k.add('rock', { x: 18 + R() * 28, y: Y + 0.05, z: 126 + R() * 20, ry: R() * 6, s: 0.1 + R() * 0.25, c: '#9a9a9a' });
  for (let i = 0; i < 6; i++) g.ico(17 + R() * 30, Y, 125 + R() * 22, 0.5 + R() * 0.6, '#6fa38f', { sy: 0.15, j: 0.3 });
  // fuse cabinet (east wall) + dim emergency lights
  k.solid(47.55, Y + 1.0, 128, 0.5, 2.0, 1.2, '#8b8f9c');
  g.box(47.0, Y + 1.0, 128.9, 0.05, 1.9, 0.6, '#9a9eab', { ry: -0.9 });
  k.glow.box(47.28, Y + 1.85, 128, 0.04, 0.08, 0.08, '#ff9a6a');
  for (const [x, z] of [[20, 147.8], [47.8, 136], [16.2, 130]]) k.glow.box(x, Y + 2.5, z, 0.4, 0.12, 0.08, '#ffb36b');
  k.sign({ kind: 'sign', key: 'signs.garage', x: 18, y: 2.2, z: 160.3, ry: 0, w: 4, h: 0.6, bg: '#4f5f7a', fg: '#f4f0e6', double: true });
  g.box(18, 2.2, 160.25, 4.2, 0.7, 0.1, '#3d4a60'); for (const x of [15.9, 20.1]) g.prism(x, 0, 160.3, 0.06, 0.06, 2.5, 5, '#6e6a76');
  k.anchor('note_r1_garage', 15.9, 1.35, 160.55);
  k.anchor('fuse_r1', 47.18, Y + 1.12, 128.0);
  k.anchor('bat_r1_b', 19.2, Y + 0.08, 146.2);
  k.anchor('garage_bounds', 15.8, -4.6, 123.8, { max: [48.2, 1.2, 162] });
  k.anchor('remnant_garage', 32, Y, 136, { zone: [17, 125, 47, 147], y: Y });
  k.zone({ id: 'garage', kind: 'garage', box: [15.7, -4.6, 123.7, 48.3, -0.95, 148.3], surf: 'concrete', reverb: 'hall' });
  k.zone({ id: 'ramp', kind: 'garage', box: [15.7, -4.6, 148, 20.3, -1.2, 160], surf: 'concrete', reverb: 'hall' });
  k.noVeg([15, 123, 49, 149]);
}

export function buildGate(k) {
  const g = k.geo, R = k.rand, Z = 120.5;
  for (const [x0, x1] of [[-80, -6], [6, 80]]) {
    k.col.addBox((x0 + x1) / 2, 1.6, Z, x1 - x0, 3.2, 0.4);
    for (let x = x0; x < x1; x += 2.4) g.box(x + 1.2, 0.45, Z, 2.3, 0.9, 0.5, '#d9d2c8', { jit: 0.05 });
    for (let x = x0; x <= x1; x += 4) g.prism(x, 0.9, Z, 0.06, 0.06, 2.4, 5, '#7c7884');
    k.sign({ kind: 'chain', x: (x0 + x1) / 2, y: 2.05, z: Z, w: x1 - x0, h: 2.3, pw: 64, ph: 64 });
    for (let x = x0; x < x1; x += 0.7) g.beam(x, 3.35 + Math.sin(x) * 0.08, Z - 0.1, x + 0.7, 3.35 + Math.sin(x + 0.7) * 0.08, Z + 0.1, 0.03, '#5a5660', 0);
  }
  [[-30, '#a3504a'], [30, '#a3504a']].forEach(([x]) => k.sign({ kind: 'banner', key: 'signs.restricted', x, y: 2.2, z: Z + 0.28, w: 3.4, h: 0.8, bg: '#c9625a', bg2: '#d98a6a' }));
  // sliding gate panel (dynamic collider so it can open)
  const gate = { x: 0, y: 1.7, z: Z, sx: 12, sy: 3.4, sz: 0.3 };
  k.col.setDyn('gate_r1', gate);
  k.anchor('gate_r1', 0, 0, Z, { size: [12, 3.4] });
  // guard booth + power box + info sign
  k.solid(9, 1.3, 123.2, 4, 2.6, 4, '#e9e4dc');
  g.box(9, 2.7, 123.2, 4.6, 0.2, 4.6, '#7c8ea8');
  g.panel(8.6, 1.7, 125.24, 1.6, 0.8, 0, '#5a6880'); g.panel(6.97, 1.6, 123.2, 2.2, 0.9, -Math.PI / 2, '#5a6880');
  g.box(9.35, 1.25, 125.3, 0.5, 0.7, 0.18, '#8b8f9c');
  k.glow.box(9.5, 1.5, 125.4, 0.06, 0.06, 0.02, '#ff6b5a');
  k.sign({ kind: 'poster', key: 'signs.gateSign', x: 10.45, y: 1.55, z: 125.25, w: 0.8, h: 1.1, pw: 256, bg: '#f2ecdf', fg: '#4f5f7a' });
  k.anchor('gatebox_r1', 9.35, 1.25, 125.45);
  k.anchor('obs_gate_sign', 10.45, 1.55, 125.32);
  // barriers, cones, rescue truck
  for (const x of [-5, -1.5, 2]) g.box(x, 0.45, 124.5 + R(), 1.8, 0.9, 0.5, '#e8e1d6', { ry: (R() - 0.5) * 0.3 });
  for (let i = 0; i < 6; i++) k.add('cone', { x: -14 + R() * 28, y: 0, z: 122 + R() * 6, ry: R() * 3, rz: R() < 0.3 ? 1.5 : 0 });
  g.box(-20, 1.3, 125, 2.4, 2.2, 5.2, '#d9d6cc'); g.box(-20, 1.2, 128.2, 2.4, 1.6, 1.6, '#c9625a'); g.panel(-20, 1.6, 129.02, 2.0, 0.6, 0, '#5a6880');
  for (const [x, z] of [[-21.1, 124], [-18.9, 124], [-21.1, 128], [-18.9, 128]]) g.prism(x, 0.42, z, 0.42, 0.42, 0.3, 8, '#2a2a2e', { rz: Math.PI / 2 });
  k.col.addBox(-20, 1.2, 126, 2.5, 2.4, 7);
  k.zone({ id: 'r1_gate', kind: 'outdoor', box: [-80, -1, 118, 80, 20, 128] });
}

export function buildPlayground(k) {
  const g = k.geo, R = k.rand;
  for (let x = -46; x < -22; x += 2) for (let z = 186; z < 214; z += 2) if (x > -42 && x < -36 && z > 202 && z < 208) g.flat(x, z, x + 2, z + 2, 0.03, '#e6d3a8', 0.06);
  k.green(-46, 186, -22, 214, { d: 0.8, flowers: 0.2, tall: 0.08 });
  // swing set
  for (const x of [-40.5, -35.5]) { g.beam(x, 0, 190.8, x, 2.4, 192, 0.1, '#e9a8a8'); g.beam(x, 0, 193.2, x, 2.4, 192, 0.1, '#e9a8a8'); k.col.addBox(x, 1.2, 192, 0.2, 2.4, 2.4); }
  g.beam(-40.5, 2.4, 192, -35.5, 2.4, 192, 0.1, '#e9a8a8');
  for (const x of [-39.3, -36.8]) { g.beam(x - 0.25, 2.35, 192, x - 0.25, 0.6, 192.3, 0.02, '#9a9aa0'); g.beam(x + 0.25, 2.35, 192, x + 0.25, 0.6, 192.3, 0.02, '#9a9aa0'); g.box(x, 0.58, 192.3, 0.6, 0.05, 0.25, '#b9dcd5', { rx: 0.2 }); }
  // slide
  g.box(-28, 1.0, 196, 1.2, 0.08, 1.2, '#f3d58e'); for (const [x, z] of [[-28.5, 195.5], [-27.5, 195.5], [-28.5, 196.5], [-27.5, 196.5]]) g.box(x, 0.5, z, 0.08, 1.0, 0.08, '#c9bde6');
  g.box(-28, 0.55, 198.2, 0.8, 0.06, 3.4, '#a9cfd8', { rx: 0.33 }); k.col.addBox(-28, 0.6, 197, 1.2, 1.2, 4);
  // sandbox frame + seesaw + bench
  for (const [x, z, w, d] of [[-39, 202, 6, 0.3], [-39, 208, 6, 0.3], [-42, 205, 0.3, 6], [-36, 205, 0.3, 6]]) g.box(x, 0.12, z, w, 0.24, d, '#c9a98a');
  g.box(-30, 0.35, 209, 0.3, 0.1, 3.6, '#e9d29a', { rx: 0.15 }); g.box(-30, 0.18, 209, 0.3, 0.36, 0.3, '#8a8a90');
  k.add('bench', { x: -33, y: 0, z: 213.2, ry: Math.PI }); k.col.addBox(-33, 0.45, 213.2, 1.9, 0.9, 0.6);
  k.anchor('note_r1_neighbor', -33.1, 0.52, 213.05);
  k.add('bag', { x: -32.2, y: 0.5, z: 213.2, ry: 0.3, c: '#f3c7c0' });
  // graffiti on the house wall facing the playground
  k.sign({ kind: 'decal', key: 'signs.graffiti', x: -21.17, y: 1.8, z: 185.5, ry: -Math.PI / 2, w: 4.2, h: 1.1, fg: '#5a6a9a', pw: 512 });
  k.anchor('obs_graffiti', -21.3, 1.8, 185.5);
}

export function buildPark(k) {
  const g = k.geo, R = k.rand;
  k.green(-78, 180, -50, 218, { d: 1.0, flowers: 0.16, tall: 0.18 });
  k.add('treeA', { x: -64, y: 0, z: 199, ry: 1.2, s: 1.9 }); k.col.addBox(-64, 2, 199, 0.9, 4, 0.9);
  [[-73, 186, 'treeB'], [-56, 184, 'treeA'], [-74, 212, 'treeC'], [-55, 214, 'treeB'], [-70, 205, 'treeA'], [-52, 196, 'treeC']].forEach(([x, z, t]) => tree(k, x, z, t, 1.1));
  for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.28; g.box(-60 + Math.cos(a) * 4.2, 0.12, 208 + Math.sin(a) * 3.2, 1.7, 0.24, 0.5, '#c8c0b8', { ry: -a + Math.PI / 2 }); }
  g.box(-60, 0.02, 208, 7.6, 0.02, 5.6, '#7fb9b0', { skip: [0, 1, 2, 3] });
  for (let i = 0; i < 6; i++) g.ico(-60 + (R() - 0.5) * 6, 0.03, 208 + (R() - 0.5) * 4, 0.35, '#9fd1c4', { sy: 0.1 });
  k.noVeg([-64, 205, -56, 211]);
  [[-66, 190, 0.6], [-58, 202, -1.2], [-70, 214, 2.4]].forEach(([x, z, ry]) => { k.add('bench', { x, y: 0, z, ry }); k.col.addBox(x, 0.45, z, 1.9, 0.9, 0.6, ry); });
  for (let x = -78; x < -50; x += 2) g.flat(x, 199, x + 2, 201, 0.02, '#cdb89a', 0.08);
  k.anchor('park_hide', -60, 0, 192);
}

export function buildBusStop(k) {
  const g = k.geo;
  for (const z of [212.2, 215.8]) { g.box(9.55, 1.25, z, 0.1, 2.5, 0.1, '#7c8ea8'); k.col.addBox(9.55, 1.25, z, 0.15, 2.5, 0.15); }
  g.box(9.2, 2.55, 214, 1.4, 0.1, 4.2, '#9fb2c9'); g.box(9.62, 1.3, 214, 0.06, 1.8, 3.4, '#cfd8e2'); k.col.addBox(9.62, 1.3, 214, 0.1, 1.8, 3.4);
  k.add('bench', { x: 9.1, y: 0.1, z: 214, ry: -Math.PI / 2 });
  k.sign({ kind: 'poster', key: 'signs.notice', x: 9.57, y: 1.45, z: 214, ry: -Math.PI / 2, w: 1.0, h: 1.4, pw: 256 });
  k.anchor('note_r1_notice', 9.5, 1.45, 214);
  g.prism(6.6, 0, 216.5, 0.06, 0.06, 2.4, 5, '#7c8ea8'); g.box(6.6, 2.55, 216.5, 0.12, 0.62, 0.62, '#7c8ea8');
  k.sign({ kind: 'clock', x: 6.53, y: 2.55, z: 216.5, ry: -Math.PI / 2, w: 0.55, h: 0.55, pw: 128 });
  k.sign({ kind: 'clock', x: 6.67, y: 2.55, z: 216.5, ry: Math.PI / 2, w: 0.55, h: 0.55, pw: 128 });
  k.anchor('obs_busstop_clock', 6.6, 2.55, 216.5);
}
