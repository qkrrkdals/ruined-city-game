// Procedural ruined buildings (merged into the region's static geometry) + room shells.
import * as THREE from 'three';
import { Geo, V } from './geo.js';

const _C = new THREE.Color(), _C2 = new THREE.Color();
export const shade = (hex, f) => '#' + _C.set(hex).multiplyScalar(f).getHexString();
export const mix = (a, b, f) => '#' + _C.set(a).lerp(_C2.set(b), f).getHexString();
export const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const AWN = [['#f3c7c0', '#fff3ea'], ['#b9dcd5', '#f4fbf8'], ['#e9d29a', '#fff8e6'], ['#c9bde6', '#f7f3ff'], ['#e6a99c', '#fbefe8']];
const FACE = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };

// Building from a world rectangle; `face` = side of the front door (toward the street)
export function bld(k, x0, z0, x1, z1, fl, face, o = {}) {
  const sideways = face === 'e' || face === 'w', wx = x1 - x0, wz = z1 - z0;
  return building(k, { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: sideways ? wz : wx, d: sideways ? wx : wz, fl, ry: FACE[face] ?? 0, ...o });
}

export function building(k, b) {
  const R = k.rand, g = new Geo(R), pal = k.pal, W = b.w, D = b.d, F = b.fl;
  const style = b.style ?? (F <= 2 && R() < 0.6 ? 'house' : 'block');
  const FH = b.fh ?? (style === 'house' ? 2.8 : 3.1), H = F * FH;
  const wall = b.wall ?? pick(R, pal.walls), trim = b.trim ?? pick(R, pal.trim), roofC = b.roof ?? pick(R, pal.roof);
  const ruin = b.ruin ?? R() * 0.65, broken = style !== 'house' && ruin > 0.4;
  g.box(0, 0.3, 0, W + 0.16, 0.6, D + 0.16, shade(wall, 0.72), { jit: 0.02 });
  for (let f = 0; f < F; f++) {
    const y0 = f * FH, last = f === F - 1, col = shade(wall, 0.95 + R() * 0.09);
    if (last && broken) brokenTop(g, R, W, D, y0, FH, col, ruin);
    else g.box(0, y0 + FH / 2, 0, W, FH, D, col);
    if (f > 0 && style !== 'house') g.box(0, y0, 0, W + 0.22, 0.18, D + 0.22, trim, { bottom: true });
    if (!(last && broken)) windows(g, R, pal, style, W, D, f, y0, FH, trim, b);
  }
  if (style === 'house') gableRoof(g, R, W, D, H, roofC, wall, ruin);
  else if (!broken) flatRoof(g, R, W, D, H, trim);
  if (style === 'shop') shopFront(g, R, pal, W, D, trim, b);
  if (style === 'apt') balconies(g, R, W, D, F, FH, trim);
  if (ruin > 0.45) rubblePile(g, R, (R() - 0.5) * W * 0.8, (R() > 0.5 ? 1 : -1) * (D / 2 + 0.9), 1 + ruin * 1.6, shade(wall, 0.85));
  g.grime(0, 1.5, b.grime ?? '#728560', 0.38);
  const m = new THREE.Matrix4().makeRotationY(b.ry || 0);
  if (b.tilt) m.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(b.tilt[0], 0, b.tilt[1])));
  m.setPosition(b.x, b.y || 0, b.z);
  (b.target || k.geo).merge(g, m);
  if (b.collide !== false) k.col.addBox(b.x, (b.y || 0) + H / 2, b.z, W + 0.2, H, D + 0.2, b.ry || 0, 0, 0, 'bld');
  const c = Math.cos(b.ry || 0), s = Math.sin(b.ry || 0), toW = (lx, lz) => [b.x + lx * c + lz * s, b.z - lx * s + lz * c];
  if (b.sign) {
    const [sx, sz] = toW(0, D / 2 + 0.2);
    k.sign({ kind: 'sign', key: b.sign, x: sx, y: (b.y || 0) + 3.55, z: sz, ry: b.ry || 0, w: W * 0.62, h: 0.66, bg: b.signBg ?? '#f6efe6', fg: b.signFg ?? '#6a5a7a' });
  }
  const vines = b.vines ?? 0.5;
  const sides = [[-W / 2, D / 2, 1, 0, 0, 1, W], [W / 2, -D / 2, -1, 0, 0, -1, W], [W / 2, D / 2, 0, -1, 1, 0, D], [-W / 2, -D / 2, 0, 1, -1, 0, D]];
  for (const [ox, oz, dx, dz, nx, nz, L] of sides) {
    if (R() > vines) continue;
    const [wx, wz] = toW(ox, oz);
    k.vineWalls.push({ ox: wx, oz: wz, dx: dx * c + dz * s, dz: -dx * s + dz * c, nx: nx * c + nz * s, nz: -nx * s + nz * c, w: L, h: (broken ? H - FH * 0.6 : H) * (0.35 + R() * 0.55), base: b.y || 0, amt: 0.4 + R() * 0.6 });
  }
  return { H, FH };
}

function windows(g, R, pal, style, W, D, f, y0, FH, trim, b) {
  const sides = [[0, 0, D / 2, W], [Math.PI, 0, -D / 2, W], [Math.PI / 2, W / 2, 0, D], [-Math.PI / 2, -W / 2, 0, D]];
  const sp = style === 'apt' ? 2.4 : style === 'house' ? 2.5 : 2.8;
  for (let si = 0; si < 4; si++) {
    if (b.blind && b.blind.includes(si)) continue;
    const [ry, fx, fz, L] = sides[si], n = Math.floor((L - 0.8) / sp);
    if (n < 1 || (style === 'shop' && f === 0 && si === 0)) continue;
    const nx = Math.sin(ry), nz = Math.cos(ry), tx = Math.cos(ry), tz = -Math.sin(ry);
    for (let i = 0; i < n; i++) {
      const u = (i - (n - 1) / 2) * sp, door = f === 0 && si === 0 && i === Math.floor(n / 2) && b.door !== false;
      const ww = door ? 1.15 : 1.05, wh = door ? 2.05 : 1.3, wy = door ? y0 + 1.07 : y0 + FH * 0.56;
      const cx = fx + tx * u, cz = fz + tz * u, r = R();
      g.panel(cx + nx * 0.02, wy, cz + nz * 0.02, ww + 0.22, wh + 0.2, ry, trim);
      let col = pal.glass;
      if (door) col = pick(R, ['#8a6b5a', '#6f7f8c', '#9b7a6a', '#7b6e8a', '#6d8a7c']);
      else if (r < 0.13) col = '#2a2d36';
      else if (r < 0.2) col = pal.wood;
      else if (r < 0.3) col = pick(R, pal.curtain);
      g.panel(cx + nx * 0.04, wy, cz + nz * 0.04, ww, wh, ry, col, 0.07);
      if (!door && r < 0.13) g.tri(V(cx + nx * 0.05 - tx * ww * 0.5, wy + wh * 0.5, cz + nz * 0.05 - tz * ww * 0.5), V(cx + nx * 0.05 - tx * ww * 0.1, wy + wh * 0.5, cz + nz * 0.05 - tz * ww * 0.1), V(cx + nx * 0.05 - tx * ww * 0.5, wy, cz + nz * 0.05 - tz * ww * 0.5), g.col(pal.glass, 0.05));
      if (!door && style === 'house' && R() < 0.3) {
        g.box(cx + nx * 0.18, wy - wh / 2 - 0.1, cz + nz * 0.18, ww + 0.1, 0.18, 0.3, shade(trim, 0.8), { ry });
        g.ico(cx + nx * 0.2, wy - wh / 2 + 0.05, cz + nz * 0.2, 0.32, pick(R, ['#86b06e', '#f2a9c4', '#9cc483', '#f6d46b']), { sy: 0.6, sx: 1.5 });
      }
    }
  }
}

function brokenTop(g, R, W, D, y0, FH, col, ruin) {
  const along = W >= D, L = along ? W : D, n = Math.max(2, Math.round(L / 2.2)), seg = L / n;
  for (let i = 0; i < n; i++) {
    if (R() < ruin * 0.3) continue;
    const h = FH * (0.2 + R() * 0.8), c = -L / 2 + seg * (i + 0.5);
    if (along) g.box(c, y0 + h / 2, 0, seg + 0.02, h, D, col); else g.box(0, y0 + h / 2, c, W, h, seg + 0.02, col);
    if (R() < 0.55) {
      const rx = along ? c : (R() - 0.5) * W, rz = along ? (R() - 0.5) * D : c;
      for (let j = 0; j < 3; j++) g.box(rx + (R() - 0.5) * 0.8, y0 + h + 0.35, rz + (R() - 0.5) * 0.8, 0.05, 0.8 + R() * 0.6, 0.05, '#5a4a48', { rx: (R() - 0.5) * 0.7, rz: (R() - 0.5) * 0.7 });
    }
  }
}

function flatRoof(g, R, W, D, H, trim) {
  const t = 0.25, h = 0.55;
  g.box(0, H + h / 2, D / 2 - t / 2, W, h, t, trim); g.box(0, H + h / 2, -D / 2 + t / 2, W, h, t, trim);
  g.box(W / 2 - t / 2, H + h / 2, 0, t, h, D - 2 * t, trim); g.box(-W / 2 + t / 2, H + h / 2, 0, t, h, D - 2 * t, trim);
  if (R() < 0.5 && W > 5 && D > 5) {
    const x = (R() - 0.5) * (W - 3), z = (R() - 0.5) * (D - 3);
    g.box(x, H + 0.5, z, 1.3, 1, 1.3, '#7c7684'); g.prism(x, H + 1, z, 0.75, 0.75, 1.3, 8, '#b3adb9');
  }
  if (R() < 0.6) g.box((R() - 0.5) * (W - 2), H + 0.4, (R() - 0.5) * (D - 2), 1.0, 0.8, 0.7, '#c9c4cc');
  if (R() < 0.6) g.ico((R() - 0.5) * (W - 2), H + 0.05, (R() - 0.5) * (D - 2), 1 + R(), '#7fa46a', { sy: 0.22, j: 0.3 });
}

function gableRoof(g, R, W, D, H, col, wall, ruin) {
  const alongX = W >= D, LX = alongX ? W : D, LZ = alongX ? D : W, hw = LX / 2 + 0.35, hd = LZ / 2 + 0.45, rise = Math.min(2.3, hd * 0.72);
  const t = new Geo(R), under = shade(col, 0.55), segs = 3, holeSeg = ruin > 0.45 ? 1 + Math.floor(R() * 2) : -1;
  for (let s = 0; s < segs; s++) {
    const xa = -hw + (2 * hw * s) / segs, xb = -hw + (2 * hw * (s + 1)) / segs;
    if (s !== holeSeg || R() < 0.5) {
      t.quad(V(xa, H, hd), V(xb, H, hd), V(xb, H + rise, 0), V(xa, H + rise, 0), t.col(col, 0.07));
      t.quad(V(xa, H + rise, 0), V(xb, H + rise, 0), V(xb, H, hd), V(xa, H, hd), t.col(under, 0.03));
    }
    if (s !== holeSeg) {
      t.quad(V(xb, H, -hd), V(xa, H, -hd), V(xa, H + rise, 0), V(xb, H + rise, 0), t.col(col, 0.07));
      t.quad(V(xb, H + rise, 0), V(xa, H + rise, 0), V(xa, H, -hd), V(xb, H, -hd), t.col(under, 0.03));
    } else for (let j = 0; j < 3; j++) t.beam(xa + 0.4 + j * 0.6, H, -hd + 0.3, xa + 0.4 + j * 0.6, H + rise - 0.1, -0.1, 0.1, '#7a5f50');
  }
  const ex = LX / 2, ez = LZ / 2, wc = t.col(wall, 0.03).clone();
  t.tri(V(-ex, H, -ez), V(-ex, H, ez), V(-ex, H + rise * 0.97, 0), wc);
  t.tri(V(ex, H, ez), V(ex, H, -ez), V(ex, H + rise * 0.97, 0), wc);
  t.box(0, H + rise + 0.04, 0, 2 * hw, 0.14, 0.22, shade(col, 0.7));
  if (R() < 0.4) t.box(hw * 0.4, H + rise * 0.6, -hd * 0.3, 0.5, 1.4, 0.5, shade(wall, 0.8));
  g.merge(t, alongX ? null : new THREE.Matrix4().makeRotationY(Math.PI / 2));
}

function shopFront(g, R, pal, W, D, trim, b) {
  const z = D / 2;
  g.panel(0, 1.45, z + 0.04, W * 0.8, 2.3, 0, pal.glass, 0.04);
  g.box(0, 2.72, z + 0.09, W * 0.86, 0.18, 0.18, trim);
  const n = 6, aw = (W * 0.82) / n, cols = b.awning ?? pick(R, AWN);
  if (R() < 0.85) for (let i = 0; i < n; i++) g.box(-W * 0.41 + aw * (i + 0.5), 2.92, z + 0.7, aw + 0.01, 0.06, 1.35, cols[i % 2], { rx: 0.32, bottom: true, rz: R() < 0.15 ? 0.2 : 0 });
  g.box(0, 3.55, z + 0.12, W * 0.66, 0.78, 0.16, shade(trim, 0.92));
}

function balconies(g, R, W, D, F, FH, trim) {
  const n = Math.floor((W - 0.8) / 2.4);
  for (let f = 1; f < F; f++) for (let i = 0; i < n; i += 2) {
    if (R() < 0.25) continue;
    const u = (i - (n - 1) / 2) * 2.4, y = f * FH;
    g.box(u, y + 0.05, D / 2 + 0.45, 2.0, 0.12, 0.9, trim, { bottom: true });
    g.box(u, y + 0.55, D / 2 + 0.88, 2.0, 0.9, 0.05, shade(trim, 0.9));
    if (R() < 0.4) g.ico(u + 0.5, y + 0.35, D / 2 + 0.5, 0.35, pick(R, ['#86b06e', '#9cc483', '#f2a9c4']), {});
    if (R() < 0.25) g.box(u - 0.4, y + 1.0, D / 2 + 0.6, 0.7, 0.6, 0.02, pick(R, ['#f3c7c0', '#b9dcd5', '#fff3ea', '#e9d29a']));
  }
}

export function rubblePile(g, R, x, z, r, col, y = 0) {
  const n = 5 + Math.floor(R() * 6);
  for (let i = 0; i < n; i++) {
    const a = R() * 6.28, d = R() * r, s = 0.3 + R() * 0.7, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (R() < 0.5) g.ico(px, y + s * 0.25, pz, s, shade(col, 0.8 + R() * 0.3), { sy: 0.6 });
    else g.box(px, y + s * 0.2, pz, s * 1.6, s * 0.3, s, shade(col, 0.85 + R() * 0.2), { ry: R() * 3, rx: (R() - 0.5) * 0.5, rz: (R() - 0.5) * 0.5 });
  }
}

// Axis-aligned room shell with door/window openings. Adds visuals to `geo` and collision walls.
// doors: [{side:'n'|'s'|'e'|'w', a, b, h}] (a,b = world coords along that wall)
export function room(k, r) {
  const { x0, z0, x1, z1 } = r, y = r.y ?? 0, h = r.h ?? 3, t = r.t ?? 0.3, col = r.wall, geo = r.geo ?? k.geo;
  const sides = { n: [z0, x0, x1, 'x'], s: [z1, x0, x1, 'x'], w: [x0, z0, z1, 'z'], e: [x1, z0, z1, 'z'] };
  for (const [side, [fix, a0, a1, axis]] of Object.entries(sides)) {
    if (r.open && r.open.includes(side)) continue;
    const ops = (r.doors || []).filter((d) => d.side === side).sort((p, q) => p.a - q.a);
    let cur = a0;
    const out = side === 'n' || side === 'w' ? -1 : 1;
    const seg = (a, b, yb, yt) => {
      if (b - a < 0.01 || yt - yb < 0.01) return;
      const c = (a + b) / 2, L = b - a, cy = (yb + yt) / 2, hh = yt - yb;
      const vis = (off, th, cc) => { if (axis === 'x') geo.box(c, cy, fix + off, L, hh, th, cc, { jit: 0.03 }); else geo.box(fix + off, cy, c, th, hh, L, cc, { jit: 0.03 }); };
      if (r.inner) { vis(out * t / 4, t / 2, col); vis(-out * t / 4, t / 2 - 0.01, r.inner); } else vis(0, t, col);
      if (axis === 'x') k.col.addBox(c, cy, fix, L, hh, t); else k.col.addBox(fix, cy, c, t, hh, L);
    };
    for (const d of ops) { seg(cur, d.a, y, y + h); seg(d.a, d.b, y + (d.h ?? 2.2), y + h); if (d.sill) seg(d.a, d.b, y, y + d.sill); cur = d.b; }
    seg(cur, a1, y, y + h);
  }
  if (r.floor) { geo.box((x0 + x1) / 2, y - 0.1, (z0 + z1) / 2, x1 - x0, 0.2, z1 - z0, r.floor, { jit: 0.02 }); }
  if (r.ceil) { geo.box((x0 + x1) / 2, y + h + 0.1, (z0 + z1) / 2, x1 - x0 + t, 0.2, z1 - z0 + t, r.ceil, { bottom: true, jit: 0.02 }); k.col.addBox((x0 + x1) / 2, y + h + 0.1, (z0 + z1) / 2, x1 - x0, 0.2, z1 - z0); }
  k.noVeg([x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2]);
}
