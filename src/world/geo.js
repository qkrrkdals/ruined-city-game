// Low-poly geometry builder: flat-shaded, vertex-coloured, non-indexed triangles.
import * as THREE from 'three';

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CORNERS = [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, .5, -.5], [-.5, .5, -.5], [-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]];
// faces: -z, +z, -x, +x, -y(bottom), +y(top) — CCW from outside
const FACES = [[1, 0, 3, 2], [4, 5, 6, 7], [0, 4, 7, 3], [5, 1, 2, 6], [0, 1, 5, 4], [3, 7, 6, 2]];
const _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const VS = Array.from({ length: 8 }, () => new THREE.Vector3());
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
let ICO = null;

export class Geo {
  constructor(rand = Math.random) { this.p = []; this.c = []; this.rand = rand; }
  get empty() { return this.p.length === 0; }
  col(hex, jit = 0) {
    _c.set(hex);
    if (jit) { const k = 1 + (this.rand() * 2 - 1) * jit; _c.r *= k; _c.g *= k; _c.b *= k; }
    return _c;
  }
  t3(ax, ay, az, bx, by, bz, cx, cy, cz, r, g, b) {
    this.p.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    this.c.push(r, g, b, r, g, b, r, g, b);
  }
  tri(a, b, c, k) { this.t3(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, k.r, k.g, k.b); }
  triC(a, b, c, ka, kb, kc) {
    this.p.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    this.c.push(ka.r, ka.g, ka.b, kb.r, kb.g, kb.b, kc.r, kc.g, kc.b);
  }
  quad(a, b, c, d, k) { this.tri(a, b, c, k); this.tri(a, c, d, k); }
  mat(x, y, z, sx, sy, sz, o) {
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'); _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
    if (o.m) _m.premultiply(o.m);
    return _m;
  }
  // o: {rx, ry, rz, top, jit, bottom, skip:[faces], m}
  box(x, y, z, sx, sy, sz, color, o = {}) {
    const m = this.mat(x, y, z, sx, sy, sz, o);
    for (let i = 0; i < 8; i++) VS[i].fromArray(CORNERS[i]).applyMatrix4(m);
    const jit = o.jit ?? 0.04;
    for (let f = 0; f < 6; f++) {
      if ((f === 4 && !o.bottom) || (o.skip && o.skip.includes(f))) continue;
      const k = this.col(f === 5 && o.top ? o.top : color, jit);
      const q = FACES[f], A = VS[q[0]], B = VS[q[1]], C = VS[q[2]], D = VS[q[3]];
      this.t3(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z, k.r, k.g, k.b);
      this.t3(A.x, A.y, A.z, C.x, C.y, C.z, D.x, D.y, D.z, k.r, k.g, k.b);
    }
  }
  // beam between two points (square section t)
  beam(ax, ay, az, bx, by, bz, t, color, jit = 0.03) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, hl = Math.hypot(dx, dz), L = Math.hypot(hl, dy);
    this.box((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, t, t, L, color, { ry: Math.atan2(dx, dz), rx: -Math.atan2(dy, hl), jit, bottom: true });
  }
  // vertical prism/cone from y to y+h (axis rotated by o.rx/ry/rz)
  prism(x, y, z, r0, r1, h, n, color, o = {}) {
    const m = this.mat(x, y, z, 1, 1, 1, o), a0 = o.a0 ?? 0, jit = o.jit ?? 0.05, b = [], t = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      b.push(V(ca * r0, 0, sa * r0).applyMatrix4(m));
      t.push(V(ca * r1, h, sa * r1).applyMatrix4(m));
    }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; this.quad(b[j], b[i], t[i], t[j], this.col(color, jit)); }
    if (o.cap !== false && r1 > 0.001) {
      const ctr = V(0, h, 0).applyMatrix4(m), k = this.col(o.top ?? color, jit);
      for (let i = 0; i < n; i++) this.tri(ctr, t[(i + 1) % n], t[i], k);
    }
    if (o.bottom) {
      const ctr = V(0, 0, 0).applyMatrix4(m), k = this.col(color, jit);
      for (let i = 0; i < n; i++) this.tri(ctr, b[i], b[(i + 1) % n], k);
    }
  }
  // jittered icosahedron (rocks, canopies)
  ico(x, y, z, r, color, o = {}) {
    if (!ICO) ICO = new THREE.IcosahedronGeometry(1, 0).getAttribute('position').array;
    const m = this.mat(x, y, z, r * (o.sx ?? 1), r * (o.sy ?? 1), r * (o.sz ?? 1), o);
    const j = o.j ?? 0.2, seed = o.seed ?? this.rand() * 1000, pts = [];
    for (let i = 0; i < ICO.length; i += 3) {
      const a = ICO[i], b = ICO[i + 1], c = ICO[i + 2];
      const h = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719 + seed) * 43758.5453, n = (h - Math.floor(h)) * 2 - 1;
      pts.push(V(a, b, c).multiplyScalar(1 + n * j).applyMatrix4(m));
    }
    const sy = o.shadeY ?? 0.14;
    for (let i = 0; i < pts.length; i += 3) {
      const cy = (ICO[i * 3 + 1] + ICO[i * 3 + 4] + ICO[i * 3 + 7]) / 3;
      const k = this.col(color, o.jit ?? 0.08), f = 1 + cy * sy;
      k.r *= f; k.g *= f; k.b *= f;
      this.tri(pts[i], pts[i + 1], pts[i + 2], k);
    }
  }
  // vertical quad facing direction ry (normal = (sin ry, 0, cos ry))
  panel(x, y, z, w, h, ry, color, jit = 0.03) {
    const c = Math.cos(ry), s = Math.sin(ry), rx = (c * w) / 2, rz = (-s * w) / 2, k = this.col(color, jit);
    this.quad(V(x - rx, y - h / 2, z - rz), V(x + rx, y - h / 2, z + rz), V(x + rx, y + h / 2, z + rz), V(x - rx, y + h / 2, z - rz), k);
  }
  // horizontal quad facing up
  flat(x0, z0, x1, z1, y, color, jit = 0.03) {
    const k = this.col(color, jit);
    this.quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), k);
  }
  merge(g, m) {
    const p = g.p;
    if (m) {
      const v = new THREE.Vector3();
      for (let i = 0; i < p.length; i += 3) { v.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(m); this.p.push(v.x, v.y, v.z); }
    } else for (let i = 0; i < p.length; i++) this.p.push(p[i]);
    for (let i = 0; i < g.c.length; i++) this.c.push(g.c[i]);
  }
  // blend vertex colours toward `hex` near the ground (moss / dirt)
  grime(y0, range, hex, amt) {
    const k = new THREE.Color(hex), p = this.p, c = this.c;
    for (let i = 0; i < p.length; i += 3) {
      const y = p[i + 1];
      if (y > y0 + range || y < y0 - 0.6) continue;
      const f = Math.min(1, Math.max(0, 1 - (y - y0) / range)) * amt;
      c[i] += (k.r - c[i]) * f; c[i + 1] += (k.g - c[i + 1]) * f; c[i + 2] += (k.b - c[i + 2]) * f;
    }
  }
  build() { return Geo.make(this.p, this.c); }
  static make(p, c) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
  // split into square xz cells (by triangle centroid) so off-screen parts are frustum-culled,
  // in the main pass and in the shadow passes
  buildChunks(size) {
    const cells = new Map(), p = this.p, c = this.c;
    for (let i = 0; i < p.length; i += 9) {
      const key = Math.floor((p[i] + p[i + 3] + p[i + 6]) / 3 / size) + ',' + Math.floor((p[i + 2] + p[i + 5] + p[i + 8]) / 3 / size);
      let e = cells.get(key); if (!e) cells.set(key, (e = { p: [], c: [] }));
      for (let j = 0; j < 9; j++) { e.p.push(p[i + j]); e.c.push(c[i + j]); }
    }
    return [...cells.values()].map((e) => Geo.make(e.p, e.c));
  }
}
