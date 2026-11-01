// Ground tiles, roads, sidewalks and street furniture helpers.
import { shade, pick } from './buildings.js';

const inRect = (r, xa, za, xb, zb) => xa >= r[0] - 1e-6 && xb <= r[2] + 1e-6 && za >= r[1] - 1e-6 && zb <= r[3] + 1e-6;
function vnoise(x, z) {
  const h = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return (h(xi, zi) * (1 - u) + h(xi + 1, zi) * u) * (1 - v) + (h(xi, zi + 1) * (1 - u) + h(xi + 1, zi + 1) * u) * v;
}

// rects are [x0, z0, x1, z1]
export function groundTiles(k, x0, z0, x1, z1, cols, skip = [], o = {}) {
  const s = o.size ?? 2, y = o.y ?? 0;
  for (let x = x0; x < x1 - 1e-6; x += s) for (let z = z0; z < z1 - 1e-6; z += s) {
    const xb = Math.min(x + s, x1), zb = Math.min(z + s, z1);
    if (skip.some((r) => inRect(r, x, z, xb, zb))) continue;
    const n = vnoise(x * 0.045 + 3.1, z * 0.045);
    const c = o.dry && n > 0.66 ? o.dry : pick(k.rand, cols);
    k.geo.flat(x, z, xb, zb, y, c, 0.06);
  }
}

// collision slabs (top at `top`) covering a rect minus axis-aligned holes
export function groundBoxes(k, x0, z0, x1, z1, holes = [], top = 0) {
  const zs = new Set([z0, z1]);
  holes.forEach((h) => { zs.add(Math.max(z0, h[1])); zs.add(Math.min(z1, h[3])); });
  const zl = [...zs].sort((a, b) => a - b);
  for (let i = 0; i < zl.length - 1; i++) {
    const za = zl[i], zb = zl[i + 1];
    if (zb - za < 0.01) continue;
    const cuts = holes.filter((h) => h[1] < zb && h[3] > za).sort((a, b) => a[0] - b[0]);
    let xa = x0;
    for (const h of cuts) { if (h[0] > xa) k.col.addBox((xa + h[0]) / 2, top - 0.5, (za + zb) / 2, h[0] - xa, 1, zb - za, 0, 0, 0, 'ground'); xa = Math.max(xa, h[2]); }
    if (x1 > xa) k.col.addBox((xa + x1) / 2, top - 0.5, (za + zb) / 2, x1 - xa, 1, zb - za, 0, 0, 0, 'ground');
  }
}

export function road(k, r, P, o = {}) {
  const [x0, z0, x1, z1] = r, s = 4, R = k.rand;
  for (let x = x0; x < x1 - 1e-6; x += s) for (let z = z0; z < z1 - 1e-6; z += s) k.geo.flat(x, z, Math.min(x + s, x1), Math.min(z + s, z1), 0.03, P.road, 0.07);
  const n = Math.floor(((x1 - x0) * (z1 - z0)) / 45);
  for (let i = 0; i < n; i++) {
    const x = x0 + 1 + R() * (x1 - x0 - 2), z = z0 + 1 + R() * (z1 - z0 - 2), len = 1 + R() * 3.5, a = R() * Math.PI;
    k.geo.box(x, 0.035, z, 0.09, 0.012, len, shade(P.road, 0.72), { ry: a, skip: [0, 1, 2, 3], jit: 0.1 });
    if (R() < 0.45) k.green(x - 0.5, z - len / 3, x + 0.5, z + len / 3, { d: 2.5, flowers: 0.12 });
  }
  if (R() < 0.6) for (let i = 0; i < 2; i++) { const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0); k.geo.box(x, 0.036, z, 1.5 + R() * 2, 0.012, 1 + R() * 2, shade(P.road, 0.86), { ry: R() * 3, skip: [0, 1, 2, 3] }); }
  const alongZ = z1 - z0 > x1 - x0;
  if (o.marks !== false) {
    if (alongZ) { const cx = (x0 + x1) / 2; for (let z = z0 + 2; z < z1 - 2; z += 6) if (R() > 0.22) k.geo.box(cx, 0.042, z, 0.16, 0.01, 2.6, '#efe6cf', { skip: [0, 1, 2, 3], jit: 0.12 }); }
    else { const cz = (z0 + z1) / 2; for (let x = x0 + 2; x < x1 - 2; x += 6) if (R() > 0.22) k.geo.box(x, 0.042, cz, 2.6, 0.01, 0.16, '#efe6cf', { skip: [0, 1, 2, 3], jit: 0.12 }); }
  }
  k.surface(r, 'asphalt');
}

export function sidewalk(k, r, P) {
  const [x0, z0, x1, z1] = r, R = k.rand, s = 2;
  for (let x = x0; x < x1 - 1e-6; x += s) for (let z = z0; z < z1 - 1e-6; z += s) {
    const xb = Math.min(x + s, x1), zb = Math.min(z + s, z1), tilt = R() < 0.05;
    k.geo.box((x + xb) / 2, 0.06 + (tilt ? 0.03 : 0), (z + zb) / 2, xb - x - 0.04, 0.12, zb - z - 0.04, P.walk, { jit: 0.06, rx: tilt ? (R() - 0.5) * 0.12 : 0, rz: tilt ? (R() - 0.5) * 0.12 : 0 });
  }
  k.green(x0, z0, x1, z1, { d: 0.14, flowers: 0.12, y: 0.1 });
  k.surface(r, 'concrete');
}

// catenary wire as thin beams
export function wire(geo, a, b, sag, color = '#4b4650', segs = 6) {
  let px = a[0], py = a[1], pz = a[2];
  for (let i = 1; i <= segs; i++) {
    const t = i / segs, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t, y = a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * sag;
    geo.beam(px, py, pz, x, y, z, 0.035, color, 0);
    px = x; py = y; pz = z;
  }
}

// lamps + trees along a line; items get colliders
export function lineProps(k, x0, z0, x1, z1, step, fn) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / step);
  for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; fn(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, i); }
}

export function tree(k, x, z, type = 'treeA', s = 1, y = 0) {
  k.add(type, { x, y, z, ry: k.rand() * 6.28, s: s * (0.85 + k.rand() * 0.3) });
  k.col.addBox(x, y + 1.5, z, 0.45 * s, 3, 0.45 * s, 0, 0, 0, 'prop');
  k.green(x - 1.6, z - 1.6, x + 1.6, z + 1.6, { d: 1.6, flowers: 0.2, y });
}
export function lamp(k, x, z, ry, y = 0) {
  const R = k.rand, bent = R() < 0.25;
  k.add('lamp', { x, y, z, ry, rx: bent ? (R() - 0.5) * 0.25 : 0, rz: bent ? (R() - 0.5) * 0.25 : 0 });
  k.col.addBox(x, y + 2.5, z, 0.3, 5, 0.3, 0, 0, 0, 'prop');
}
export function car(k, x, z, ry, color, o = {}) {
  const R = k.rand;
  k.add('car', { x, y: o.y ?? 0, z, ry, rz: o.tip ?? (R() < 0.2 ? (R() - 0.5) * 0.12 : 0), c: color });
  k.col.addBox(x, (o.y ?? 0) + 0.75, z, 1.9, 1.5, 4.3, ry, 0, 0, 'prop');
  k.green(x - 2, z - 2, x + 2, z + 2, { d: 0.8, tall: 0.15 });
}
export const CAR_COLORS = ['#e9c6c0', '#bfd8e0', '#f0e2c0', '#c9c2dc', '#d6e3c8', '#e6e2dc', '#a7b6c9', '#e0b6a2', '#9fb7ad'];
