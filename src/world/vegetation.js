// Vegetation scattering: grass, tall grass (hiding spots), flowers, vines on walls.
export class Occupancy {
  constructor(x0, z0, x1, z1, cell = 1) {
    this.x0 = x0; this.z0 = z0; this.cell = cell;
    this.nx = Math.ceil((x1 - x0) / cell); this.nz = Math.ceil((z1 - z0) / cell);
    this.g = new Uint8Array(this.nx * this.nz);
  }
  fromBoxes(boxes, yMin = 0.15, yMax = 2.2) {
    for (const b of boxes) {
      if (b.tag === 'ground' || b.tag === 'ramp') continue;
      const h = b.sy / 2; if (b.y - h > yMax || b.y + h < yMin) continue;
      this.rot(b);
    }
  }
  rot(b) {
    const c = Math.cos(b.ry || 0), s = Math.sin(b.ry || 0), hx = b.sx / 2, hz = b.sz / 2;
    const ex = Math.abs(c) * hx + Math.abs(s) * hz, ez = Math.abs(s) * hx + Math.abs(c) * hz;
    const i0 = Math.max(0, Math.floor((b.x - ex - this.x0) / this.cell)), i1 = Math.min(this.nx - 1, Math.floor((b.x + ex - this.x0) / this.cell));
    const j0 = Math.max(0, Math.floor((b.z - ez - this.z0) / this.cell)), j1 = Math.min(this.nz - 1, Math.floor((b.z + ez - this.z0) / this.cell));
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const px = this.x0 + (i + 0.5) * this.cell - b.x, pz = this.z0 + (j + 0.5) * this.cell - b.z;
      const lx = px * c - pz * s, lz = px * s + pz * c;
      if (Math.abs(lx) <= hx + 0.25 && Math.abs(lz) <= hz + 0.25) this.g[i + j * this.nx] = 1;
    }
  }
  block(r) { this.rot({ x: (r[0] + r[2]) / 2, z: (r[1] + r[3]) / 2, sx: r[2] - r[0], sz: r[3] - r[1], ry: 0 }); }
  free(x, z) {
    const i = Math.floor((x - this.x0) / this.cell), j = Math.floor((z - this.z0) / this.cell);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return false;
    return !this.g[i + j * this.nx];
  }
}

const FLOWERS = ['#f7b8c8', '#fff1a8', '#ffffff', '#d8c4f0', '#ffd3b0', '#bfe3f2'];
const LEAVES = ['#ffffff', '#e8f5d8', '#d2e6b8', '#f2f7d8'];

export function scatter(k, occ) {
  const R = k.rand;
  for (const a of k.greens) {
    const area = (a.x1 - a.x0) * (a.z1 - a.z0), n = Math.floor(area * (a.d ?? 0.6));
    for (let i = 0; i < n; i++) {
      const x = a.x0 + R() * (a.x1 - a.x0), z = a.z0 + R() * (a.z1 - a.z0), y = a.y ?? 0;
      if (y < 0.5 && !occ.free(x, z)) continue;
      const r = R();
      if (a.tall && r < a.tall) { k.add('tall', { x, y, z, ry: R() * 6.28, s: 0.8 + R() * 0.5 }); const key = Math.floor(x / 2) + ',' + Math.floor(z / 2); k.W.tallCells.set(key, (k.W.tallCells.get(key) || 0) + 1); }
      else if (r < (a.tall || 0) + (a.flowers ?? 0.08)) k.add('flower', { x, y, z, ry: R() * 6.28, s: 0.8 + R() * 0.7, c: FLOWERS[Math.floor(R() * FLOWERS.length)] });
      else k.add('grass', { x, y, z, ry: R() * 6.28, s: 0.65 + R() * 0.8 });
    }
  }
  for (const v of k.vineWalls) {
    if (v.base < 0.5) for (let b = 0; b < 3; b++) {
      if (R() > 0.55) continue;
      const u = R() * v.w, x = v.ox + v.dx * u + v.nx * 0.7, z = v.oz + v.dz * u + v.nz * 0.7;
      if (occ.free(x, z)) k.add('bush', { x, y: 0, z, ry: R() * 6.28, s: 0.7 + R() * 0.7 });
    }
    const strips = Math.max(1, Math.round((v.w / 1.5) * v.amt));
    for (let s = 0; s < strips; s++) {
      const u = R() * v.w, top = v.base + (0.5 + R() * 0.5) * v.h;
      for (let y = v.base + 0.1; y < top; y += 0.13 + R() * 0.07) {
        const spread = 0.2 + (1 - (y - v.base) / (top - v.base + 0.01)) * 0.45, uu = u + (R() - 0.5) * spread * 2;
        if (uu < 0.1 || uu > v.w - 0.1) continue;
        k.add('leaf', {
          x: v.ox + v.dx * uu + v.nx * 0.05, y, z: v.oz + v.dz * uu + v.nz * 0.05,
          ry: Math.atan2(v.nx, v.nz) + (R() - 0.5) * 0.9, rx: (R() - 0.5) * 0.8, rz: (R() - 0.5) * 1.6,
          s: 0.7 + R() * 0.8, c: LEAVES[Math.floor(R() * LEAVES.length)],
        });
      }
    }
  }
}
