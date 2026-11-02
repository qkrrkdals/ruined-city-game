// Region 3 — City center (deep night -> dawn). z: -190..-40. Plaza, gazebo (shelter 4), institute + clock tower.
import * as THREE from 'three';
import { bld, shade, rubblePile } from '../buildings.js';
import { groundTiles, groundBoxes, road, sidewalk, tree, lamp, car, CAR_COLORS } from '../streets.js';
import { buildInstitute } from './r3_institute.js';
import { stationExitR3 } from './under.js';

export function buildR3(k) {
  const P = k.pal, R = k.rand, g = k.geo;
  const roads = [[-80, -56, 80, -48], [-66, -190, -56, -60], [56, -190, 66, -60]];
  const walks = [[-80, -48, 80, -40], [-80, -60, 80, -56], [-56, -190, -52, -60], [52, -190, 56, -60], [-70, -190, -66, -60], [66, -190, 70, -60]];
  const plaza = [-52, -136, 52, -60], holes = [[-44, -74, -28, -70]];
  k.noVeg([-45, -75, -27, -69]);
  groundTiles(k, -80, -190, 80, -40, P.ground, [...roads, ...walks, plaza, ...holes, [-23, -139, 23, -136]], { dry: P.dry });
  groundBoxes(k, -80, -190, 80, -40, holes);
  roads.forEach((r) => road(k, r, P));
  walks.forEach((w) => sidewalk(k, w, P));
  for (let x = plaza[0]; x < plaza[2]; x += 2) for (let z = plaza[1]; z < plaza[3]; z += 2) {
    if (holes.some((h) => x >= h[0] && x < h[2] && z >= h[1] && z < h[3])) continue;
    const ring = Math.hypot(x + 1, z + 99) < 9;
    g.flat(x, z, x + 2, z + 2, 0.02, ring ? '#dcd4e6' : ((x + z) / 2) % 2 ? P.stone[0] : P.stone[1], 0.05);
    if (R() < 0.06) k.green(x, z, x + 2, z + 2, { d: 3, flowers: 0.15, tall: 0.15, y: 0.02 });
  }
  k.surface(plaza, 'stone');
  k.col.addBox(0, 0.8, -40.6, 160, 1.6, 0.3);
  for (let x = -80; x <= 80; x += 2) g.box(x, 0.55, -40.6, 0.1, 1.1, 0.1, '#7d7790');
  g.box(0, 1.1, -40.6, 160, 0.08, 0.12, '#8f88a3');

  // fountain (dry) with a lantern-holding figure
  g.prism(0, 0, -98, 6.2, 6.2, 0.75, 12, '#cfc6d9', { top: '#ddd6e6' });
  g.prism(0, 0.02, -98, 5.6, 5.6, 0.74, 12, '#a6b8b2', { jit: 0.06 });
  k.col.addBox(0, 0.4, -98, 11, 0.8, 11); k.col.addBox(0, 0.4, -98, 8, 0.8, 12.4, Math.PI / 4);
  g.prism(0, 0.7, -98, 1.0, 0.8, 1.6, 8, '#bdb4cc'); g.box(0, 3.0, -98, 0.6, 1.6, 0.4, '#c9c0d4'); g.ico(0, 4.1, -98, 0.36, '#c9c0d4');
  g.beam(0.25, 3.5, -98, 0.9, 4.4, -98.2, 0.12, '#c9c0d4');
  k.glow.ico(1.0, 4.55, -98.2, 0.18, '#ffd585');
  k.green(-5, -103, 5, -93, { d: 1.4, tall: 0.25, flowers: 0.15, y: 0.1 });
  k.anchor('obs_fountain', 0, 1.6, -92.5);
  // rows of empty chairs facing the tower
  for (let r = 0; r < 14; r++) for (let c = 0; c < 30; c++) {
    if (R() < 0.08) continue;
    const x = -14.5 + c * 1.0 + (R() - 0.5) * 0.12, z = -112 - r * 1.25, fallen = R() < 0.05;
    k.add('chair', { x, y: 0.02, z, ry: Math.PI + (R() - 0.5) * 0.3, rz: fallen ? 1.45 : 0, c: R() < 0.5 ? '#f4efe8' : '#e8e0f0' });
  }
  k.col.addBox(0, 0.45, -120.5, 30, 0.9, 17.5, 0, 0, 0, 'low');
  k.anchor('obs_chairs', 0, 1.2, -110.5);
  // ceremony stage in front of the institute steps
  k.solid(0, 0.6, -132.5, 26, 1.2, 6, '#a99fbf', { top: '#c7bfd8' });
  g.box(0, 1.75, -131.5, 0.9, 1.1, 0.6, '#8f7a72');
  for (const x of [-11, 11]) { k.solid(x, 2.0, -131, 1.0, 1.6, 0.8, '#3a3640'); g.box(x, 4.5, -134.8, 0.25, 6.5, 0.25, '#5c5664'); }
  g.box(0, 7.6, -134.8, 22.3, 0.3, 0.3, '#5c5664');
  k.sign({ kind: 'banner', key: 'signs.ceremony', x: 0, y: 6.4, z: -134.6, w: 20, h: 1.9, bg: '#f6c9b8', bg2: '#bfe3df' });
  // banner poles + planters + lamps around the plaza
  for (const [x, z] of [[-30, -70], [30, -78], [-40, -100], [40, -100], [-36, -126], [36, -126]]) {
    g.prism(x, 0, z, 0.1, 0.08, 6.5, 6, '#7d7790'); k.col.addBox(x, 3, z, 0.25, 6, 0.25);
    k.sign({ kind: 'banner', key: 'signs.archiveSlogan', x: x + 0.12, y: 4.6, z, ry: Math.PI / 2, w: 1.0, h: 3.0, pw: 128, ph: 384, bg: '#cdb8e6', bg2: '#bfe3df', double: true });
  }
  for (const [x, z, t] of [[-24, -66, 'treeA'], [24, -66, 'treeC'], [-46, -84, 'treeA'], [46, -86, 'treeB'], [-46, -118, 'treeC'], [46, -116, 'treeA'], [-22, -92, 'treeB'], [22, -94, 'treeA']]) {
    g.box(x, 0.35, z, 3, 0.7, 3, '#bdb4cc', { top: '#8f7d6e' }); k.col.addBox(x, 0.35, z, 3, 0.7, 3);
    tree(k, x, z, t, 1.25, 0.7);
  }
  for (let x = -48; x <= 48; x += 16) { lamp(k, x, -61.5, Math.PI / 2); if (Math.abs(x) > 20) lamp(k, x, -134.8, -Math.PI / 2); }
  for (let i = 0; i < 60; i++) g.box(-40 + R() * 80, 0.04, -130 + R() * 66, 0.24, 0.01, 0.32, R() < 0.5 ? '#fbf7ef' : '#f3e4d4', { ry: R() * 3, skip: [0, 1, 2, 3] });
  // gazebo (shelter 4)
  gazebo(k, 34, -70);
  // surrounding blocks
  const H = (x0, z0, x1, z1, fl, face, o) => bld(k, x0, z0, x1, z1, fl, face, o);
  H(-80, -100, -71, -62, 4, 'e', { style: 'block' }); H(-80, -140, -71, -104, 3, 'e', { ruin: 0.7 }); H(-80, -188, -71, -144, 5, 'e');
  H(71, -100, 80, -62, 4, 'w'); H(71, -140, 80, -104, 3, 'w', { style: 'shop', sign: 'signs.cafe2' }); H(71, -188, 80, -144, 4, 'w', { ruin: 0.6 });
  H(-51, -182, -44, -146, 3, 'e', { wall: '#c2b9cf' }); H(44, -182, 51, -146, 3, 'w', { wall: '#c2b9cf' });
  H(-40, -190, 40, -186, 6, 's', { wall: '#b3abc6', vines: 0.9 });
  [[-61, -150, 0.05], [-60, -95, 3.1], [61, -120, 0.1], [20, -52, 1.6], [-45, -51, 4.6]].forEach(([x, z, ry]) => car(k, x, z, ry, CAR_COLORS[Math.floor(R() * CAR_COLORS.length)]));
  for (let z = -180; z < -62; z += 16) { if (R() < 0.75) tree(k, -54, z, 'treeA'); if (R() < 0.75) tree(k, 54, z + 8, 'treeB'); }
  k.green(-80, -190, 80, -40, { d: 0.18, flowers: 0.1, tall: 0.06 });
  buildInstitute(k);
  stationExitR3(k);
  k.anchor('rem_plaza_w', -20, 0, -96, { zone: [-40, -128, -4, -64], nav: 'surface' });
  k.anchor('rem_plaza_e', 20, 0, -110, { zone: [4, -128, 40, -84], nav: 'surface' });
  k.anchor('s4', 34, 0, -70, { yaw: Math.PI, lamp: [34, 2.3, -70], r: 4.6 });
  k.anchor('bat_s4', 32.6, 0.5, -71.2);
}

function gazebo(k, cx, cz) {
  const g = k.geo, r = 3.3;
  g.prism(cx, 0, cz, r + 0.3, r + 0.3, 0.3, 8, '#d8d0e0', { a0: Math.PI / 8 });
  k.col.addBox(cx, 0.15, cz, 2 * r, 0.3, 2 * r, 0, 0, 0, 'low');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    g.prism(x, 0.3, z, 0.12, 0.12, 2.5, 6, '#f4efe8'); k.col.addBox(x, 1.5, z, 0.3, 3, 0.3);
    if (i !== 1 && i !== 2) g.box(cx + Math.cos(a + 0.39) * (r - 0.35), 0.75, cz + Math.sin(a + 0.39) * (r - 0.35), 2.2, 0.08, 0.45, '#c9a98a', { ry: -a - 0.39 + Math.PI / 2 });
  }
  g.prism(cx, 2.8, cz, r + 0.8, 0.3, 1.8, 8, '#9a8fc0', { a0: Math.PI / 8 });
  g.prism(cx, 2.75, cz, r + 0.85, r + 0.8, 0.08, 8, '#7d7790', { a0: Math.PI / 8, bottom: true });
  g.prism(cx, 2.4, cz, 0.02, 0.02, 0.4, 4, '#4b4650');
  k.glow.ico(cx, 2.25, cz, 0.24, '#ffcf8a');
  k.green(cx - 6, cz - 6, cx + 6, cz + 6, { d: 1.2, flowers: 0.3 });
  k.noVeg([cx - r, cz - r, cx + r, cz + r]);
  k.zone({ id: 'gazebo', kind: 'outdoor', box: [cx - r, -0.5, cz - r, cx + r, 3, cz + r], surf: 'wood' });
}

export function towerBeacon(k) {
  const W = k.W, mat = W.M.glowSoft;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd585').multiplyScalar(2.2), fog: false }));
  core.position.set(0, 27.6, -166);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: k.W.dot, color: '#ffd28a', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  halo.scale.set(22, 22, 1); halo.position.copy(core.position);
  W.landmark.add(core, halo);
  W.beacon = { core, halo };
  void mat;
}
