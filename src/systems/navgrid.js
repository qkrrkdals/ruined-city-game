// 2D navigation grid per floor level (built from collision boxes) + A* with path smoothing.
// Remnants float, so only obstacles overlapping [floor+1.0, floor+1.8] block them.
export class NavGrid {
  constructor(x0, z0, x1, z1, y, cell = 1) {
    this.x0 = x0; this.z0 = z0; this.cell = cell; this.y = y;
    this.nx = Math.ceil((x1 - x0) / cell); this.nz = Math.ceil((z1 - z0) / cell);
    const n = this.nx * this.nz;
    this.blocked = new Uint8Array(n);
    this.g = new Float32Array(n); this.par = new Int32Array(n); this.stamp = new Uint32Array(n); this.closed = new Uint32Array(n); this.run = 0;
    // binary heap in typed arrays (no per-node allocations -> no GC spikes)
    this.hk = new Int32Array(1 << 15); this.hf = new Float32Array(1 << 15); this.hn = 0;
  }
  hpush(k, f) {
    if (this.hn >= this.hk.length) { const k2 = new Int32Array(this.hk.length * 2), f2 = new Float32Array(this.hk.length * 2); k2.set(this.hk); f2.set(this.hf); this.hk = k2; this.hf = f2; }
    const K = this.hk, F = this.hf; let i = this.hn++;
    while (i > 0) { const p = (i - 1) >> 1; if (F[p] <= f) break; K[i] = K[p]; F[i] = F[p]; i = p; }
    K[i] = k; F[i] = f;
  }
  hpop() {
    const K = this.hk, F = this.hf, top = K[0], n = --this.hn;
    if (n > 0) {
      const k = K[n], f = F[n]; let i = 0;
      for (;;) { const l = 2 * i + 1; if (l >= n) break; const r = l + 1, m = r < n && F[r] < F[l] ? r : l; if (F[m] >= f) break; K[i] = K[m]; F[i] = F[m]; i = m; }
      K[i] = k; F[i] = f;
    }
    return top;
  }
  build(boxes, inflate = 0.4) {
    const lo = this.y + 1.0, hi = this.y + 1.8;
    for (const b of boxes) {
      if (b.tag === 'ground' || b.tag === 'ramp' || b.tag === 'low') continue;
      if (b.y + b.sy / 2 < lo || b.y - b.sy / 2 > hi) continue;
      const c = Math.cos(b.ry || 0), s = Math.sin(b.ry || 0), hx = b.sx / 2 + inflate, hz = b.sz / 2 + inflate;
      const ex = Math.abs(c) * hx + Math.abs(s) * hz, ez = Math.abs(s) * hx + Math.abs(c) * hz;
      const i0 = Math.max(0, Math.floor((b.x - ex - this.x0) / this.cell)), i1 = Math.min(this.nx - 1, Math.floor((b.x + ex - this.x0) / this.cell));
      const j0 = Math.max(0, Math.floor((b.z - ez - this.z0) / this.cell)), j1 = Math.min(this.nz - 1, Math.floor((b.z + ez - this.z0) / this.cell));
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const px = this.x0 + (i + 0.5) * this.cell - b.x, pz = this.z0 + (j + 0.5) * this.cell - b.z;
        if (Math.abs(px * c - pz * s) <= hx && Math.abs(px * s + pz * c) <= hz) this.blocked[i + j * this.nx] = 1;
      }
    }
    return this;
  }
  blockRect(x0, z0, x1, z1) {
    for (let x = x0; x < x1; x += this.cell) for (let z = z0; z < z1; z += this.cell) { const k = this.idx(x, z); if (k >= 0) this.blocked[k] = 1; }
  }
  idx(x, z) { const i = Math.floor((x - this.x0) / this.cell), j = Math.floor((z - this.z0) / this.cell); return i < 0 || j < 0 || i >= this.nx || j >= this.nz ? -1 : i + j * this.nx; }
  free(x, z) { const k = this.idx(x, z); return k >= 0 && !this.blocked[k]; }
  center(k) { return [this.x0 + ((k % this.nx) + 0.5) * this.cell, this.z0 + (Math.floor(k / this.nx) + 0.5) * this.cell]; }
  nearestFree(x, z, maxR = 6) {
    if (this.free(x, z)) return [x, z];
    for (let r = 1; r <= maxR; r++) for (let a = 0; a < 8 * r; a++) {
      const t = (a / (8 * r)) * Math.PI * 2, px = x + Math.cos(t) * r * this.cell, pz = z + Math.sin(t) * r * this.cell;
      if (this.free(px, pz)) return [px, pz];
    }
    return null;
  }
  los(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / (this.cell * 0.4));
    for (let i = 1; i <= n; i++) { const t = i / n; if (!this.free(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
    return true;
  }
  randomFree(zone, R = Math.random, tries = 40) {
    for (let i = 0; i < tries; i++) { const x = zone[0] + R() * (zone[2] - zone[0]), z = zone[1] + R() * (zone[3] - zone[1]); if (this.free(x, z)) return [x, z]; }
    return null;
  }
  path(ax, az, bx, bz, budget = 2500) {
    const s = this.nearestFree(ax, az, 3), e = this.nearestFree(bx, bz, 4);
    if (!s || !e) return null;
    const S = this.idx(s[0], s[1]), E = this.idx(e[0], e[1]);
    if (S === E) return [[bx, bz]];
    const run = ++this.run, nx = this.nx, ex = E % nx, ez = Math.floor(E / nx);
    const h = (k) => { const dx = Math.abs((k % nx) - ex), dz = Math.abs(Math.floor(k / nx) - ez); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    this.hn = 0;
    this.stamp[S] = run; this.g[S] = 0; this.par[S] = -1; this.hpush(S, h(S));
    let found = false, n = 0;
    while (this.hn && n++ < budget) {
      const k = this.hpop();
      if (this.closed[k] === run) continue;
      this.closed[k] = run;
      if (k === E) { found = true; break; }
      const ci = k % nx, cj = Math.floor(k / nx);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nx || j >= this.nz) continue;
        const q = i + j * nx; if (this.blocked[q] || this.closed[q] === run) continue;
        if (di && dj && (this.blocked[ci + di + cj * nx] || this.blocked[ci + (cj + dj) * nx])) continue;
        const ng = this.g[k] + (di && dj ? 1.414 : 1);
        if (this.stamp[q] !== run || ng < this.g[q]) { this.stamp[q] = run; this.g[q] = ng; this.par[q] = k; this.hpush(q, ng + h(q)); }
      }
    }
    if (!found) return null;
    const pts = []; for (let k = E; k !== -1; k = this.par[k]) pts.push(this.center(k));
    pts.reverse(); pts[pts.length - 1] = [bx, bz];
    // greedy smoothing with a bounded look-ahead (the old all-pairs version could cost millions of samples)
    const out = [pts[0]]; let a = 0;
    while (a < pts.length - 1) {
      let b = a + 1;
      for (let c = Math.min(pts.length - 1, a + 16); c > a + 1; c--) if (this.los(pts[a][0], pts[a][1], pts[c][0], pts[c][1])) { b = c; break; }
      out.push(pts[b]); a = b;
    }
    return out;
  }
}
