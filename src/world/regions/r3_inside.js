// Interiors of the Memory Preservation Institute (ground floor) and the clock tower (levels 0/8/16/24).
import { room, shade } from '../buildings.js';

const STONE = '#cfc6d9', INNER = '#ece6f2', FLOOR = '#b9b2c9', WOOD = '#b89a86';

// stair flight: collision ramp + visual steps between (x0,y0,z0) and (x1,y1,z1), width w (axis-aligned)
function flight(k, x0, y0, z0, x1, y1, z1, w, col = '#c9c0d4') {
  const g = k.geo, n = Math.max(8, Math.round(Math.abs(y1 - y0) / 0.25)), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  k.col.addRamp(x0, y0, z0, x1, y1, z1, w);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = y0 + (y1 - y0) * ((i + 1) / n), run = Math.hypot(x1 - x0, z1 - z0) / n;
    g.box(x, y - 0.12, z, alongX ? run + 0.02 : w, 0.24, alongX ? w : run + 0.02, i % 2 ? col : shade(col, 0.94), { jit: 0.03, bottom: true });
  }
}
function slab(k, x0, z0, x1, z1, y, col = FLOOR) { k.solid((x0 + x1) / 2, y - 0.1, (z0 + z1) / 2, x1 - x0, 0.2, z1 - z0, col, { top: col, bottom: true }); }
const elight = (k, x, y, z, ry) => { k.glow.box(x, y, z, ry ? 0.08 : 0.5, 0.12, ry ? 0.5 : 0.08, '#ffb36b'); k.extraLights.push({ pos: [x, y - 0.3, z], intensity: 3, distance: 8, color: '#ffb36b', flicker: k.rand() < 0.4 }); };

export function buildInstituteInside(k) {
  const g = k.geo, R = k.rand, H = 4.4;
  // ground-floor ceiling around the tower
  for (const [a, b, c, d] of [[-42, -184, 42, -172.5], [-42, -159.5, 42, -140], [-42, -172.5, -6.5, -159.5], [6.5, -172.5, 42, -159.5]]) { k.solid((a + c) / 2, H + 0.1, (b + d) / 2, c - a, 0.2, d - b, '#e3dcea', { bottom: true }); }
  g.box(0, 0.02, -162, 83, 0.04, 43, FLOOR, { jit: 0.02 });
  // lobby (x -15..15, z -159.5..-140)
  k.solid(-15, H / 2, -156.75, 0.4, H, 5.5, INNER); k.solid(-15, H / 2, -144, 0.4, H, 8, INNER); k.solid(-15, 3.3, -150, 0.4, 2.2, 4, INNER);
  k.solid(15, H / 2, -156.75, 0.4, H, 5.5, INNER); k.solid(15, H / 2, -144, 0.4, H, 8, INNER); k.solid(15, 3.3, -150, 0.4, 2.2, 4, INNER);
  k.solid(-10.75, H / 2, -159.5, 8.5, H, 0.4, INNER); k.solid(10.75, H / 2, -159.5, 8.5, H, 0.4, INNER);
  k.solid(-8, 0.55, -147, 4, 1.1, 1.2, WOOD, { top: '#e3d6c8' });
  k.anchor('note_r3_years', -8.6, 1.13, -146.9); k.anchor('bat_r3_a', -6.8, 1.13, -147.1);
  k.solid(0, 0.5, -151, 2.4, 1.0, 2.4, '#d8d0e0', { top: '#ece6f2' });
  g.box(0, 1.6, -151, 0.5, 1.2, 0.5, '#bfb6cf'); g.prism(0, 2.2, -151, 0.3, 0, 0.7, 4, '#8f88ab', { a0: Math.PI / 4 }); k.glow.ico(0, 2.0, -151, 0.14, '#ffd585');
  k.anchor('obs_archive_model', 0, 1.6, -149.7);
  for (let i = 0; i < 4; i++) { const x = -12 + i * 8; if (Math.abs(x) < 3) continue; k.solid(x, 0.25, -143, 2.2, 0.5, 0.6, '#c9b8a8'); }
  for (const z of [-157, -153]) for (const x of [-13.5, 13.5]) { k.solid(x, 1.2, z, 1.4, 2.4, 0.1, '#d9cfe6'); g.box(x, 1.0, z + 0.6, 0.6, 1.0, 0.6, '#efe6f0'); }
  for (let i = 0; i < 5; i++) g.box(-12 + R() * 24, 0.1, -157 + R() * 15, 1.6, 0.08, 1.1, '#e3dcea', { ry: R() * 3, rx: (R() - 0.5) * 0.4 });
  k.sign({ kind: 'banner', key: 'signs.archiveSlogan', x: 0, y: 3.4, z: -159.25, w: 6, h: 0.8, bg: '#cdb8e6', bg2: '#bfe3df' });
  elight(k, -14.7, 3.8, -150, 1); elight(k, 14.7, 3.8, -150, 1);
  // west corridor + archive room
  k.solid(-28.5, H / 2, -146, 27, H, 0.4, INNER);
  k.solid(-36, H / 2, -154, 12, H, 0.4, INNER); k.solid(-21, H / 2, -154, 12, H, 0.4, INNER); k.solid(-28.5, 3.3, -154, 3, 2.2, 0.4, INNER);
  room(k, { x0: -38, z0: -172, x1: -18, z1: -154, h: H, t: 0.3, wall: INNER, open: ['s'] });
  for (let x = -35; x < -20; x += 3.5) { k.solid(x, 1.2, -166, 0.6, 2.4, 9, '#9f97b8'); for (let j = 0; j < 8; j++) g.box(x + 0.32, 0.4 + (j % 4) * 0.55, -170 + j * 1.1, 0.04, 0.4, 0.8, ['#e9d29a', '#c9bde6', '#f3c7c0', '#b9dcd5'][j % 4]); }
  k.solid(-23, 0.4, -157, 2.2, 0.8, 1.0, WOOD, { top: '#e3d6c8' });
  k.anchor('note_r3_closure', -23.4, 0.82, -157); k.anchor('bat_r3_c', -36.8, 0.05, -156.5); k.anchor('bat_r3_b', -40.5, 0.05, -150);
  k.sign({ kind: 'sign', key: 'signs.archive', x: -28.5, y: 3.1, z: -153.78, w: 2.6, h: 0.5, bg: '#ece6f2', fg: '#5b5677' });
  elight(k, -41.7, 3.8, -150, 1); elight(k, -28, 4.1, -171.7);
  // east corridor + lab + generator room
  k.solid(28.5, H / 2, -146, 27, H, 0.4, INNER);
  k.solid(19, H / 2, -154, 8, H, 0.4, INNER); k.solid(31.25, H / 2, -154, 10.5, H, 0.4, INNER); k.solid(40.75, H / 2, -154, 2.5, H, 0.4, INNER);
  k.solid(24.5, 3.3, -154, 3, 2.2, 0.4, INNER); k.solid(38, 3.3, -154, 3, 2.2, 0.4, INNER);
  room(k, { x0: 17, z0: -170, x1: 33, z1: -154, h: H, t: 0.3, wall: INNER, open: ['s'] });
  room(k, { x0: 34, z0: -166, x1: 42, z1: -154, h: H, t: 0.3, wall: '#d6d0e0', open: ['s'] });
  for (const [x, z] of [[20.5, -166], [26, -166], [20.5, -160]]) { k.solid(x, 0.38, z, 2.6, 0.76, 1.2, '#e8e2ee', { top: '#f3eff6' }); g.box(x, 1.05, z - 0.3, 0.9, 0.55, 0.06, '#2f3352'); }
  k.solid(28.5, 0.38, -159, 3, 0.76, 1.4, WOOD, { top: '#e8d9c6' });
  g.prism(29.4, 0.76, -159.2, 0.07, 0.07, 0.13, 8, '#e8b73f'); g.box(27.9, 0.84, -159.55, 0.6, 0.1, 0.04, '#e8e2ee');
  k.sign({ kind: 'photo', key: 'signs.photoDate', variant: 'home', x: 28.6, y: 1.0, z: -159.62, w: 0.28, h: 0.34, pw: 128 });
  k.sign({ kind: 'sign', key: 'signs.nameplate', x: 27.9, y: 0.86, z: -158.3, rx: -0.4, w: 0.7, h: 0.12, bg: '#3f3a4e', fg: '#efe6f0', pw: 512 });
  k.anchor('obs_my_desk', 28.4, 1.0, -158.9);
  k.anchor('note_r3_record', 20.2, 0.8, -165.8); k.anchor('note_r3_research', 27.6, 0.8, -158.8); k.anchor('fuse_r3', 25.6, 0.86, -165.9);
  g.panel(32.83, 2.1, -162, 4, 1.6, -Math.PI / 2, '#f4f1ea');
  k.sign({ kind: 'decal', key: 'signs.formula', x: 32.8, y: 2.1, z: -162, ry: -Math.PI / 2, w: 3.6, h: 1.3, fg: '#3c4a7a', font: 'hand' });
  k.sign({ kind: 'sign', key: 'signs.lab', x: 24.5, y: 3.1, z: -153.78, w: 2.4, h: 0.5, bg: '#ece6f2', fg: '#5b5677' });
  k.sign({ kind: 'sign', key: 'signs.generator', x: 38, y: 3.1, z: -153.78, w: 2.6, h: 0.5, bg: '#e9d29a', fg: '#5b4a3a' });
  k.solid(39, 1.0, -162, 3.5, 2.0, 2.4, '#7c8794'); g.prism(37.5, 2.0, -162.5, 0.25, 0.25, 1.6, 8, '#9aa7b4'); g.box(39, 2.2, -160.6, 1.6, 0.4, 0.3, '#8b8f9c');
  k.anchor('socket_gen', 37.8, 1.25, -160.7);
  elight(k, 41.7, 3.8, -150, 1); elight(k, 25, 4.1, -169.7); elight(k, 38, 4.1, -165.7);
  k.anchor('rem_inst_lobby', 0, 0, -146, { zone: [-13, -157, 13, -142], nav: 'surface' });
  k.anchor('rem_inst_wing', 30, 0, -150, { zone: [16, -169, 41, -147], nav: 'surface' });
  k.zone({ id: 'institute', kind: 'dim', box: [-42, -0.5, -184, 42, 4.4, -140], surf: 'stone', reverb: 'hall' });
  k.noVeg([-42, -184, 42, -140]);
}

export function buildTowerInside(k) {
  const g = k.geo;
  // door in the south wall is cut by buildTower(); dynamic door collider here
  k.col.setDyn('tower_door', { x: 0, y: 1.5, z: -159.85, sx: 2.8, sy: 3, sz: 0.7 });
  k.anchor('tower_door', 0, 0, -159.6);
  slab(k, -5.8, -171.8, 5.8, -160.2, 0.04, '#c2bad4');
  // flights: A (east, 0->4), B (north, 4->8), C (west, 8->12, lower part collapsed), D (north, 12->16), E (east, 16->20), F (south, 20->24)
  flight(k, 4.85, 0, -160.6, 4.85, 4, -169.8, 1.9);
  slab(k, 3.9, -171.8, 5.8, -169.8, 4);
  flight(k, 3.9, 4, -170.85, -4.0, 8, -170.85, 1.9);
  slab(k, -5.8, -169.8, 5.8, -160.2, 8); slab(k, -5.8, -171.8, -4.0, -169.8, 8);
  flight(k, -4.85, 10.45, -166.4, -4.85, 12, -169.8, 1.9);
  g.box(-4.85, 10.15, -166.2, 1.9, 0.6, 0.4, '#a69dbb', { rx: 0.3 });
  for (let i = 0; i < 6; i++) g.ico(-4.6 + (k.rand() - 0.5) * 1.6, 8.1, -162 - k.rand() * 4, 0.3 + k.rand() * 0.25, '#b9b1c9', { sy: 0.6 });
  slab(k, -5.8, -171.8, -3.9, -169.8, 12);
  flight(k, -3.9, 12, -170.85, 3.9, 16, -170.85, 1.9);
  slab(k, -5.8, -169.8, 5.8, -160.2, 16); slab(k, 3.9, -171.8, 5.8, -169.8, 16);
  flight(k, 4.85, 16, -169.8, 4.85, 20, -162.1, 1.9);
  slab(k, 3.9, -162.1, 5.8, -160.2, 20);
  flight(k, 3.9, 20, -161.15, -4.0, 24, -161.15, 1.9);
  slab(k, -5.8, -171.8, 5.8, -162.1, 24); slab(k, -5.8, -162.1, -4.0, -160.2, 24);
  // arch railings at the top room
  for (const [x, z, sx, sz] of [[0, -159.85, 4.4, 0.7], [0, -172.15, 4.4, 0.7], [6.15, -166, 0.7, 4.4], [-6.15, -166, 0.7, 4.4]]) k.solid(x, 24.55, z, sx, 1.1, sz, '#e2dbea');
  // level 8: shelter 5 (lamp, battery, note, crates)
  g.prism(-5.2, 8, -160.8, 0.18, 0.18, 0.05, 8, '#6a5a5a'); g.prism(-5.2, 8.05, -160.8, 0.025, 0.025, 1.45, 5, '#6a5a5a');
  k.glow.prism(-5.2, 9.45, -160.8, 0.3, 0.18, 0.35, 8, '#ffcf8a', { jit: 0 });
  k.anchor('s5', -2.4, 8, -162.6, { yaw: Math.PI / 2, lamp: [-5.2, 9.6, -160.8], r: 2.9 });
  k.solid(-1, 8.35, -161, 1.2, 0.7, 0.6, WOOD); k.anchor('note_r3_tower', -1.2, 8.71, -161); k.anchor('bat_s5', -0.6, 8.72, -161.1);
  k.anchor('crate_t_a', 2.4, 8.45, -163.2); k.anchor('crate_t_b', 1.2, 8.45, -168.2); k.anchor('crate_t_c', 3.0, 8.45, -166.0);
  k.anchor('tower_bounds', -6.5, 7.2, -172.5, { max: [6.5, 31, -159.5] });
  // level 16: dark hall with one Remnant; battery in the far corner
  k.anchor('rem_tower16', -1, 16, -165, { zone: [-5.4, -169.4, 3.4, -160.6], nav: 'tower16' });
  k.anchor('bat_t_a', 5.0, 16.06, -170.9);
  // level 24: Control Core room
  k.solid(0, 24.55, -170.7, 2.6, 1.1, 0.9, '#8f88ab', { top: '#c9c0d4' });
  g.box(0, 25.35, -171.0, 2.4, 0.5, 0.08, '#2f3352', { rx: -0.3 });
  k.glow.box(0.75, 25.12, -170.4, 0.5, 0.02, 0.3, '#7fd6cf');
  k.anchor('note_r3_final', -0.6, 25.13, -170.55); k.anchor('core', 0.7, 25.2, -170.5);
  k.solid(0, 24.6, -166, 1.6, 1.2, 1.6, '#cfc6d9', { top: '#e2dbea' });
  for (const [x, y, z, r] of [[-5.75, 27, -168, 1.2], [5.75, 26.5, -164, 0.9], [-5.75, 28, -163, 0.8]]) g.prism(x, y, z, r, r, 0.15, 12, '#b59a6a', { rz: Math.PI / 2 });
  for (const lv of [0, 8, 16]) { elight(k, -5.7, lv + 3.4, -166, 1); elight(k, 5.7, lv + 3.4, -164, 1); }
  k.zone({ id: 'tower', kind: 'indoor', box: [-6.5, -0.5, -172.5, 6.5, 31, -159.5], surf: 'stone', reverb: 'hall' });
}
