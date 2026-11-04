// Underground (floor y = -7): station concourse, office (shelter 3), arcade, storeroom, platform, tunnel, center station.
import { room, shade } from '../buildings.js';
import { tape } from '../streets.js';

const Y = -7, TOP = -3, TILE = '#6db5ae', TILE2 = '#5aa39c', WHITE = '#cde7e0', FLOOR = '#8fb1aa', RUST = '#af6f4c';
const SHOPS = ['#f3c7c0', '#b9dcd5', '#e9d29a', '#c9bde6', '#e6a99c', '#a9cfd8'];

// stairs from the surface (x = xTop, y = 0) down to (x = xBottom, y = Y), centred on z, 4 m wide
function stairs(k, xTop, xBottom, z, flip = false) {
  const g = k.geo, n = 28, dir = Math.sign(xBottom - xTop), len = Math.abs(xBottom - xTop);
  k.col.addRamp(xTop + dir * 0.2, 0, z, xBottom - dir * 0.2, Y, z, 3.8);
  for (let i = 0; i < n; i++) { const x = xTop + dir * (i + 0.5) * (len / n), y = -(i + 0.5) * (-Y / n); g.box(x, y - 0.12, z, len / n + 0.02, 0.26 + 0.01, 3.8, i % 2 ? '#c9c4cf' : '#bdb8c4', { jit: 0.03 }); }
  for (const dz of [-2.15, 2.15]) k.solid((xTop + xBottom) / 2, (Y + 1.2) / 2, z + dz, len, 1.2 - Y, 0.3, '#b9b2c6');
  k.solid(xBottom - dir * 0.15, 0.6, z, 0.3, 1.2, 4.6, '#b9b2c6');
  for (let i = 0; i < 4; i++) k.glow.box(xTop + dir * (4 + i * 3.6), -i * 1.75 - 1.0, z - 1.98, 0.5, 0.08, 0.05, '#ffb36b');
  void flip;
}
function canopy(k, x, z, key) {
  const g = k.geo;
  for (const [dx, dz] of [[-1.5, -2.1], [1.5, -2.1], [-1.5, 2.1], [1.5, 2.1]]) { g.box(x + dx, 1.4, z + dz, 0.12, 2.8, 0.12, '#5f7a8a'); k.col.addBox(x + dx, 1.4, z + dz, 0.2, 2.8, 0.2); }
  g.box(x, 2.85, z, 3.6, 0.14, 4.8, '#7fb0a8', { bottom: true });
  k.sign({ kind: 'sign', key, x, y: 3.3, z: z + 2.45, w: 3.2, h: 0.6, bg: '#4f8f8a', fg: '#f4fbf8', double: true });
  g.box(x, 3.3, z + 2.42, 3.3, 0.7, 0.05, '#3f6f6a');
}

export function stationEntranceR2(k) {
  stairs(k, -12, -28, 40);
  canopy(k, -13.6, 40, 'signs.station'); tape(k, -12.1, 1.5, 42.1, 0, { w: 0.2, d: 0.2 });
  k.anchor('under_entrance', -11, 0, 40);
  k.W.portals.push([-20, 40, 24]);
}
export function stationExitR3(k) {
  stairs(k, -28, -44, -72);
  canopy(k, -29.6, -72, 'signs.station3'); tape(k, -28.1, 1.5, -69.9, 0, { w: 0.2, d: 0.2 });
  k.W.portals.push([-36, -72, 24]);
}

export function buildUnder(k) {
  const g = k.geo, R = k.rand;
  const floor = (x0, z0, x1, z1, c = FLOOR) => { k.solid((x0 + x1) / 2, Y - 0.25, (z0 + z1) / 2, x1 - x0, 0.5, z1 - z0, c, { top: c }); for (let x = x0; x < x1; x += 2) for (let z = z0; z < z1; z += 2) if (R() < 0.18) g.flat(x, z, Math.min(x + 2, x1), Math.min(z + 2, z1), Y + 0.01, shade(c, 0.9 + R() * 0.15), 0.04); };
  const moss = (x, z, r = 0.8) => { k.glow.ico(x, Y, z, r, '#5fcfae', { sy: 0.08, j: 0.3, jit: 0.15 }); };
  const elight = (x, y, z, ry = 0, group) => { k.glow.box(x, y, z, ry ? 0.08 : 0.5, 0.12, ry ? 0.5 : 0.08, '#ffb36b'); k.extraLights.push({ pos: [x, y - 0.3, z], intensity: 3.2, distance: 8, color: '#ffb36b', flicker: R() < 0.4, group }); };
  // ---- concourse (x -48..-28, z 26..56)
  floor(-48, 26, -28, 56);
  room(k, { x0: -48, z0: 26, x1: -28, z1: 56, y: Y, h: 4, t: 0.4, wall: TILE, inner: WHITE, ceil: '#9fc3bd', doors: [{ side: 'e', a: 38, b: 42, h: 3.4 }, { side: 'n', a: -40, b: -34, h: 3.2 }, { side: 'w', a: 28, b: 32, h: 3.2 }, { side: 'w', a: 38, b: 42, h: 3.2 }] });
  for (const x of [-42, -34]) for (const z of [32, 44]) k.solid(x, Y + 2, z, 0.7, 4, 0.7, WHITE);
  for (let x = -46; x < -30; x += 2.2) if (Math.abs(x + 38) > 1.2) { k.solid(x, Y + 0.5, 36, 0.3, 1.0, 1.1, '#9aa7b4', { tag: 'low' }); g.box(x + 0.6, Y + 0.85, 36, 1.0, 0.06, 0.08, '#d86f4f', { rz: R() < 0.5 ? 0.6 : 0 }); }
  for (let i = 0; i < 14; i++) k.add('bag', { x: -46 + R() * 16, y: Y, z: 33 + R() * 6, ry: R() * 6, rz: R() < 0.3 ? 1.5 : 0, c: SHOPS[i % 6] });
  k.anchor('obs_bags', -38, Y + 1.0, 37.5);
  k.solid(-31, Y + 0.55, 50, 2.4, 1.1, 1.2, '#c9c4cf', { top: '#e3dfe8' });
  k.anchor('note_r2_station_log', -31.4, Y + 1.13, 49.9); k.anchor('bat_u_a', -30.4, Y + 1.15, 50.1);
  k.sign({ kind: 'sign', key: 'signs.station', x: -38, y: Y + 3.3, z: 55.75, ry: Math.PI, w: 6, h: 0.8, bg: '#4f8f8a', fg: '#f4fbf8' });
  k.sign({ kind: 'poster', key: 'signs.notice', x: -28.22, y: Y + 1.6, z: 30, ry: -Math.PI / 2, w: 1, h: 1.4, pw: 256 });
  for (const [x, z] of [[-46, 29], [-31, 30], [-44, 44], [-30, 46]]) moss(x, z, 0.9);
  elight(-28.3, Y + 3.2, 34, 1, 'concourse'); elight(-47.7, Y + 3.2, 50, 1, 'concourse'); elight(-38, Y + 3.7, 26.3, 0, 'concourse');
  // office (shelter 3): x -48..-40, z 48..56 with a keypad door on its north wall
  k.solid(-46.5, Y + 2, 48, 3, 4, 0.3, WHITE); k.solid(-41.5, Y + 2, 48, 3, 4, 0.3, WHITE); k.solid(-44, Y + 3.1, 48, 2, 1.8, 0.3, WHITE);
  k.solid(-40, Y + 2, 52, 0.3, 4, 8, WHITE);
  g.panel(-41.2, Y + 1.6, 47.83, 1.3, 1.0, Math.PI, '#2f4a52');
  k.col.setDyn('door_office', { x: -44, y: Y + 1.1, z: 48, sx: 2, sy: 2.2, sz: 0.2 });
  k.anchor('door_office', -44, Y, 48);
  k.anchor('keypad_office', -42.55, Y + 1.45, 47.8); tape(k, -42.55, Y + 1.85, 47.82, 0, { w: 0.24, tail: false });
  k.anchor('note_r2_code', -45.4, Y + 1.5, 47.82);
  k.solid(-42, Y + 0.38, 54.6, 2.4, 0.76, 1.0, '#c9b8a8', { top: '#e3d6c8' });
  g.box(-42.5, Y + 0.95, 54.8, 0.6, 0.4, 0.06, '#2a3236'); g.box(-41.6, Y + 0.95, 54.8, 0.6, 0.4, 0.06, '#2a3236');
  for (let i = 0; i < 4; i++) k.solid(-47.6, Y + 0.9, 49 + i * 0.6, 0.6, 1.8, 0.55, '#9aa7b4');
  k.solid(-47.85, Y + 1.5, 52, 0.25, 1.6, 1.6, '#7c8794');
  g.box(-47.7, Y + 1.5, 52, 0.06, 1.4, 1.4, '#a9b3be');
  // P4: four slots A-D (lights / shutter motor / shutter lock / ventilation) + wiring diagram above the lockers
  ['bulb', 'motor', 'lock', 'fan'].forEach((icon, i) => { const z = 52.6 - i * 0.4; k.anchor('slot_' + 'abcd'[i], -47.6, Y + 1.4, z); k.sign({ kind: 'slot', icon, letter: 'ABCD'[i], x: -47.64, y: Y + 1.9, z, ry: Math.PI / 2, w: 0.34, h: 0.17, pw: 128 }); });
  k.sign({ kind: 'diagram', x: -47.82, y: Y + 2.6, z: 49.9, ry: Math.PI / 2, w: 1.3, h: 0.92, pw: 384 });
  k.anchor('obs_panel_diagram', -47.7, Y + 2.6, 49.9);
  tape(k, -47.62, Y + 2.38, 52, Math.PI / 2, { w: 0.5, tail: false });
  k.anchor('note_r2_code2', -42.9, Y + 0.02, 47.35);
  k.anchor('panel_lights', -47.6, Y + 2.1, 52);
  k.anchor('note_r2_fuses', -43, Y + 0.78, 54.4);
  g.prism(-46.6, Y, 54.9, 0.18, 0.18, 0.05, 8, '#6a5a5a'); g.prism(-46.6, Y + 0.05, 54.9, 0.025, 0.025, 1.45, 5, '#6a5a5a');
  k.glow.prism(-46.6, Y + 1.45, 54.9, 0.3, 0.18, 0.35, 8, '#ffcf8a', { jit: 0 });
  k.anchor('s3', -44, Y, 52.5, { yaw: Math.PI, lamp: [-46.6, Y + 1.6, 54.9], r: 3.6 });
  k.anchor('bat_s3', -41.3, Y + 0.8, 54.5);
  // ---- arcade corridor (x -40..32, z 18..26) with shops
  floor(-40, 18, 32, 26, '#9db8b2');
  const north = [[-34, -28, 0], [-26, -20, 1], [-18, -12, 0], [-10, -4, 0], [-2, 4, 1], [6, 12, 0], [14, 20, 1], [22, 28, 0]];
  const south = [[-20, -14, 1], [-8, -2, 0], [4, 10, 0], [16, 22, 1]];
  room(k, { x0: -40, z0: 18, x1: 32, z1: 26, y: Y, h: 4, t: 0.4, wall: TILE2, inner: WHITE, ceil: '#9fc3bd', open: ['e'], doors: [
    ...north.filter((s) => s[2]).map((s) => ({ side: 'n', a: s[0] + 0.6, b: s[1] - 0.6, h: 2.8 })),
    ...south.filter((s) => s[2]).map((s) => ({ side: 's', a: s[0] + 0.6, b: s[1] - 0.6, h: 2.8 })),
    { side: 's', a: -40, b: -34, h: 3.2 }] });
  north.forEach(([a, b, open], i) => {
    if (open) { floor(a, 11, b, 18, '#a7bdb7'); room(k, { x0: a, z0: 11, x1: b, z1: 18, y: Y, h: 3.4, t: 0.3, wall: SHOPS[i % 6], inner: shade(SHOPS[i % 6], 1.05), ceil: '#b7cfca', open: ['s'] }); }
    else { g.panel((a + b) / 2, Y + 1.4, 17.78, b - a - 1.2, 2.8, 0, '#8d99a6'); for (let y = 0.2; y < 2.8; y += 0.28) g.box((a + b) / 2, Y + y, 17.74, b - a - 1.2, 0.04, 0.03, '#76828f'); }
    k.sign({ kind: 'sign', key: `signs.shop${(i % 6) + 1}`, x: (a + b) / 2, y: Y + 3.35, z: 17.75, w: b - a - 1.4, h: 0.5, bg: SHOPS[i % 6], fg: '#4b4458' });
  });
  south.forEach(([a, b, open], i) => {
    if (a < -28) return;
    if (open) { floor(a, 26, b, 32, '#a7bdb7'); room(k, { x0: a, z0: 26, x1: b, z1: 32, y: Y, h: 3.4, t: 0.3, wall: SHOPS[(i + 3) % 6], inner: shade(SHOPS[(i + 3) % 6], 1.05), ceil: '#b7cfca', open: ['n'] }); }
    else g.panel((a + b) / 2, Y + 1.4, 26.22, b - a - 1.2, 2.8, Math.PI, '#8d99a6');
  });
  // shop contents: clothes racks, electronics counter (fuse A), café (rescuer's notebook)
  for (let i = 0; i < 3; i++) { g.box(-23, Y + 1.4, 12.5 + i * 1.8, 3.6, 0.05, 0.05, '#7c7884'); for (let j = 0; j < 7; j++) g.box(-24.6 + j * 0.5, Y + 0.9, 12.5 + i * 1.8, 0.05, 0.9, 0.45, SHOPS[(i + j) % 6]); }
  k.anchor('bat_u_b', -21, Y + 0.05, 16.2);
  k.solid(1, Y + 0.5, 12.6, 4, 1.0, 0.9, '#c9c2d4', { top: '#e3dfe8' });
  for (let i = 0; i < 9; i++) g.box(-0.6 + R() * 3.2, Y + 1.1, 12.5 + (R() - 0.5) * 0.5, 0.35, 0.22, 0.25, '#3d4452', { ry: R() });
  for (let i = 0; i < 3; i++) { k.solid(15.5 + i * 1.8, Y + 0.38, 13.5, 0.8, 0.76, 0.8, '#d9c4ad', { tag: 'low' }); }
  k.anchor('note_r2_rescuer', 17.3, Y + 0.8, 13.5);
  for (let i = 0; i < 10; i++) g.box(-38 + R() * 68, Y + 0.02, 19 + R() * 6, 1.2 + R() * 2, 0.02, 0.6 + R(), '#7fb3c4', { ry: R() * 3, skip: [0, 1, 2, 3] });
  for (let i = 0; i < 14; i++) moss(-38 + R() * 68, 18.5 + R() * 7, 0.4 + R() * 0.7);
  for (let x = -36; x < 30; x += 12) elight(x, Y + 3.7, 18.3);
  k.extraLights.push({ pos: [-23, Y + 2.6, 14.5], intensity: 2.2, distance: 6, color: '#7fd6cf', flicker: true });
  // ---- storeroom (x 32..42, z 12..30, tall)
  floor(32, 12, 42, 30, '#a3aaa9');
  room(k, { x0: 32, z0: 12, x1: 42, z1: 30, y: Y, h: 5.6, t: 0.4, wall: '#a9b3b8', ceil: '#9aa6aa', doors: [{ side: 'w', a: 18, b: 26, h: 4 }] });
  k.solid(41.25, Y + 2.15, 21, 1.1, 4.3, 16, '#8f8a7c', { top: '#a49e8e' });
  for (let y = 0.6; y < 4.3; y += 1.0) g.box(40.65, Y + y, 21, 0.06, 0.06, 16, '#6f6a5f');
  for (let i = 0; i < 16; i++) g.box(41.2, Y + 0.25 + Math.floor(R() * 4) * 1.0, 13.5 + R() * 15, 0.7, 0.45, 0.6, ['#c9a98a', '#b8956f', '#d9c4ad'][i % 3]);
  for (const z of [16, 22]) k.solid(35.5, Y + 1.0, z, 3, 2.0, 0.9, '#8f8a7c');
  k.anchor('fuse_u_b', 41.1, Y + 4.36, 26.4); tape(k, 40.62, Y + 4.4, 26.4, Math.PI / 2, { w: 0.3 });
  k.anchor('crate_u_a', 34.2, Y + 0.45, 13.5); k.anchor('crate_u_b', 38.5, Y + 0.45, 28.6);
  k.anchor('bat_u_c', 33.2, Y + 0.05, 28.9);
  elight(32.3, Y + 4.5, 14, 1); moss(39, 14, 1.0);
  // ---- platform (x -68..-48, z 0..60) and shutter at z = 0
  floor(-68, 0, -48, 60, '#9db2ad');
  room(k, { x0: -68, z0: 0, x1: -48, z1: 60, y: Y, h: 4.4, t: 0.4, wall: TILE, inner: WHITE, ceil: '#9fc3bd', open: ['e', 'n'] });
  g.box(-60, Y + 0.02, 30, 0.3, 0.02, 60, '#f3d58e', { skip: [0, 1, 2, 3] });
  for (const x of [-65.5, -62.5]) g.box(x, Y + 0.06, -33, 0.12, 0.12, 186, '#8a8790');
  for (let z = 6; z < 60; z += 9) k.solid(-54, Y + 2.2, z, 0.7, 4.4, 0.7, WHITE);
  k.sign({ kind: 'sign', key: 'signs.platform', x: -54, y: Y + 3.4, z: 9.65, w: 4, h: 0.6, bg: '#4f8f8a', fg: '#f4fbf8', double: true });
  k.col.setDyn('shutter_u', { x: -58, y: Y + 2.2, z: 0.1, sx: 20, sy: 4.4, sz: 0.3 });
  k.anchor('shutter_u', -58, Y, 0.1);
  for (const z of [10, 30, 50]) elight(-48.3, Y + 3.6, z, 1);
  for (let i = 0; i < 6; i++) moss(-66 + R() * 16, 2 + R() * 56, 0.6 + R() * 0.6);
  // ---- tunnel (x -68..-56, z -66..0) with a stopped train
  floor(-68, -66, -56, 0, '#8a9894');
  room(k, { x0: -68, z0: -66, x1: -56, z1: 0, y: Y, h: 4.4, t: 0.5, wall: '#7f9a96', ceil: '#6f8a86', open: ['n', 's'] });
  for (const [z0, z1] of [[-58, -37], [-35, -14]]) {
    const cz = (z0 + z1) / 2, L = z1 - z0;
    k.solid(-64.8, Y + 1.7, cz, 4.4, 3.2, L, '#e8f1ee', { top: '#cfdcd8' });
    g.box(-64.8, Y + 1.0, cz, 4.46, 0.35, L + 0.02, '#7fb9b0');
    for (let z = z0 + 1.5; z < z1 - 1; z += 2.4) { g.panel(-62.58, Y + 2.0, z, 1.6, 0.9, Math.PI / 2, '#3a4a52'); g.panel(-67.02, Y + 2.0, z, 1.6, 0.9, -Math.PI / 2, '#3a4a52'); }
    for (const dz of [-6, 0, 6]) g.panel(-62.56, Y + 1.25, cz + dz, 1.3, 2.3, Math.PI / 2, '#1f2a30');
    for (let i = 0; i < 4; i++) k.add('bag', { x: -62.3 + R() * 0.6, y: Y, z: cz + (R() - 0.5) * L * 0.8, ry: R() * 6, rz: R() < 0.4 ? 1.5 : 0, c: SHOPS[i % 6] });
  }
  for (let z = -60; z < 0; z += 10) elight(-56.3, Y + 3.0, z, 1);
  for (let i = 0; i < 10; i++) moss(-61 + R() * 4.5, -64 + R() * 62, 0.5 + R() * 0.6);
  k.anchor('bat_u_d', -57, Y + 0.05, -30);
  k.anchor('obs_train', -61.8, Y + 1.5, -25);
  // ---- city-center station hall (x -68..-44, z -90..-66)
  floor(-68, -90, -44, -66, '#9db2ad');
  room(k, { x0: -68, z0: -90, x1: -44, z1: -66, y: Y, h: 4.4, t: 0.4, wall: TILE, inner: WHITE, ceil: '#9fc3bd', doors: [{ side: 's', a: -68, b: -56, h: 4.2 }, { side: 'e', a: -74, b: -70, h: 3.4 }] });
  for (const [x, z] of [[-60, -78], [-52, -84], [-52, -72]]) k.solid(x, Y + 2.2, z, 0.7, 4.4, 0.7, WHITE);
  k.sign({ kind: 'sign', key: 'signs.station3', x: -56, y: Y + 3.5, z: -89.75, w: 6, h: 0.8, bg: '#4f8f8a', fg: '#f4fbf8' });
  elight(-44.3, Y + 3.4, -80, 1); elight(-67.7, Y + 3.4, -80, 1);
  k.anchor('bat_u_e', -46, Y + 0.05, -88);
  for (let i = 0; i < 5; i++) moss(-66 + R() * 20, -88 + R() * 20, 0.7);
  // remnant patrol zones (x0, z0, x1, z1)
  k.anchor('rem_arc_w', -24, Y, 22, { zone: [-38, 18.5, -6, 25.5], nav: 'under' });
  k.anchor('rem_arc_e', 12, Y, 21, { zone: [-6, 11, 30, 25.5], nav: 'under' });
  k.anchor('rem_store', 36, Y, 22, { zone: [26, 13, 40, 29], nav: 'under' });
  k.anchor('rem_tunnel', -59, Y, -40, { zone: [-61.6, -64, -56.5, -4], nav: 'under' });
  k.zone({ id: 'under', kind: 'underground', box: [-70, -8.5, -92, 45, -2.6, 62], surf: 'tile', reverb: 'hall' });
}
