// Cheongan Mall — dark ground-floor interior (colleague's note, batteries, one Remnant).
import { room, shade, building } from '../buildings.js';

const SHOP = ['#f3c7c0', '#b9dcd5', '#e9d29a', '#c9bde6', '#e6a99c'];

export function buildMall(k) {
  const g = k.geo, R = k.rand, x0 = 18, z0 = 32, x1 = 70, z1 = 80, H = 4.4;
  room(k, { x0, z0, x1, z1, h: H, t: 0.5, wall: '#c8b4c9', inner: '#e6dbe4', ceil: '#d4cad8', doors: [{ side: 'w', a: 50, b: 58, h: 3.4 }, { side: 'n', a: 42, b: 46, h: 2.6 }] });
  building(k, { x: (x0 + x1) / 2, z: (z0 + z1) / 2, y: H + 0.2, w: z1 - z0, d: x1 - x0, ry: -Math.PI / 2, fl: 2, fh: 3.8, style: 'block', ruin: 0.3, wall: '#c8b4c9', trim: '#efe6f0', vines: 0.9 });
  g.panel(x0 - 0.27, 1.7, 54, 8.6, 3.0, -Math.PI / 2, '#3d4058');
  k.sign({ kind: 'sign', key: 'signs.mall', x: x0 - 0.3, y: H + 0.9, z: 54, ry: -Math.PI / 2, w: 9, h: 1.1, bg: '#efe6f0', fg: '#8a6a9a' });
  g.box(x0 - 0.8, 3.7, 54, 1.4, 0.15, 9.5, '#efe6f0', { rz: -0.15, bottom: true });
  g.box(44, 0.02, 56, 51, 0.04, 47, '#d9d2dc', { jit: 0.02 });
  for (let x = x0 + 2; x < x1; x += 4) for (let z = z0 + 2; z < z1; z += 4) if (R() < 0.25) g.flat(x - 2, z - 2, x + 2, z + 2, 0.045, shade('#d9d2dc', 0.88 + R() * 0.2), 0.04);
  for (let x = 27; x < 66; x += 9) for (let z = 41; z < 76; z += 9) k.solid(x, H / 2, z, 0.8, H, 0.8, '#efe6f0');
  // shopfronts along the walls
  for (let i = 0; i < 6; i++) {
    const x = 22 + i * 8.2, c = SHOP[i % 5];
    g.panel(x, 1.5, z0 + 0.27, 6.4, 2.6, 0, R() < 0.5 ? '#454a66' : shade(c, 0.8)); g.box(x, 3.1, z0 + 0.4, 7, 0.5, 0.3, c);
    g.panel(x, 1.5, z1 - 0.27, 6.4, 2.6, Math.PI, R() < 0.5 ? '#454a66' : shade(c, 0.8)); g.box(x, 3.1, z1 - 0.4, 7, 0.5, 0.3, SHOP[(i + 2) % 5]);
  }
  // escalator (dead, blocked at the top), fallen ceiling panels, mannequins, info desk
  g.box(46, 2.0, 66, 2.2, 0.3, 7.5, '#bdb4c9', { rx: -0.55 }); for (const dx of [-1.15, 1.15]) g.box(46 + dx, 2.5, 66, 0.15, 1.0, 7.5, '#9a93b6', { rx: -0.55 });
  k.col.addBox(46, 2, 66, 2.6, 4, 7.5);
  for (let i = 0; i < 7; i++) { const x = 24 + R() * 42, z = 36 + R() * 40; g.box(x, 0.12 + R() * 0.4, z, 1.8, 0.08, 1.2, '#e9e2ec', { ry: R() * 3, rx: (R() - 0.5) * 0.6, rz: (R() - 0.5) * 0.6 }); }
  for (const [x, z, ry] of [[24, 38, 0.6], [25.5, 39, -0.2], [62, 74, 2.8], [60.5, 75, 3.4]]) {
    g.box(x, 0.05, z, 0.5, 0.1, 0.5, '#9a93a8'); g.prism(x, 0.1, z, 0.03, 0.03, 0.6, 5, '#9a93a8');
    g.box(x, 1.05, z, 0.42, 0.7, 0.24, '#f3efe8', { ry }); g.ico(x, 1.62, z, 0.15, '#f3efe8'); g.box(x, 0.55, z, 0.36, 0.5, 0.2, SHOP[Math.floor(R() * 5)], { ry });
  }
  k.solid(30, 0.55, 44, 3, 1.1, 1.2, '#c9b8c4', { top: '#efe6f0' });
  k.anchor('bat_m_a', 29.2, 1.15, 44.1);
  // café corner with the colleague's note
  for (const [x, z] of [[60, 70], [63.5, 70], [60, 66.5], [63.5, 66.5]]) { k.solid(x, 0.38, z, 1.0, 0.76, 1.0, '#d9c4ad', { tag: 'low' }); for (let j = 0; j < 2; j++) k.add('chair', { x: x + (j ? 0.75 : -0.75), y: 0, z, ry: j ? -Math.PI / 2 : Math.PI / 2, c: '#e8d9c6' }); }
  k.anchor('note_r2_colleague', 63.4, 0.8, 70.1);
  k.anchor('bat_m_b', 66.8, 0.05, 40.5);
  for (let i = 0; i < 8; i++) k.glow.ico(22 + R() * 46, 0.02, 36 + R() * 42, 0.5 + R() * 0.6, '#5fcfae', { sy: 0.08, j: 0.3 });
  for (const [x, z] of [[18.6, 40], [44, 32.6], [69.4, 60], [44, 79.4]]) { k.glow.box(x, 3.9, z, Math.abs(x - 44) > 20 ? 0.08 : 0.5, 0.12, Math.abs(x - 44) > 20 ? 0.5 : 0.08, '#ffb36b'); k.extraLights.push({ pos: [x + (x < 30 ? 0.5 : x > 60 ? -0.5 : 0), 3.5, z + (z < 40 ? 0.5 : z > 70 ? -0.5 : 0)], intensity: 3, distance: 9, color: '#ffb36b', flicker: R() < 0.5 }); }
  k.green(x0 - 4, z0 - 2, x0, z1 + 2, { d: 0.6, tall: 0.15 });
  k.anchor('rem_mall', 44, 0, 56, { zone: [21, 35, 67, 77], nav: 'surface' });
  k.zone({ id: 'mall', kind: 'dim', box: [x0, -0.5, z0, x1, H, z1], surf: 'tile', reverb: 'hall' });
  k.noVeg([x0, z0, x1, z1]);
}
