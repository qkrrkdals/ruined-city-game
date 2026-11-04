// Collision: simple boxes (separate from visuals) -> Octree. Dynamic boxes (crates, gates, doors) each get
// their own tiny octree, rebuilt only when that box moves.
import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
// three's Octree pads only the min corner of its bounds; faces lying exactly on the max side (e.g. the top of
// the highest crate) could fall outside every cell through float error and be lost (you fell through).
class SafeOctree extends Octree { calcBox() { super.calcBox(); this.box.max.addScalar(0.01); return this; } }
const _ray = new THREE.Ray();

export class CollisionWorld {
  constructor() {
    this.root = new THREE.Group();
    this.octree = new SafeOctree();
    this.boxes = [];
    this.dyn = new Map();
    this.dynList = null;
  }
  addBox(x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0, tag = 'solid') {
    const m = new THREE.Mesh(BOX);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz, 'YXZ');
    this.root.add(m);
    this.boxes.push({ x, y, z, sx, sy, sz, ry, rx, rz, tag });
    return m;
  }
  // inclined slab whose top surface runs from p0 to p1
  addRamp(x0, y0, z0, x1, y1, z1, width, thick = 0.4) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, hl = Math.hypot(dx, dz), L = Math.hypot(hl, dy);
    const ry = Math.atan2(dx, dz), rx = -Math.atan2(dy, hl);
    const up = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(rx, ry, 0, 'YXZ'));
    const cx = (x0 + x1) / 2 - up.x * thick / 2, cy = (y0 + y1) / 2 - up.y * thick / 2, cz = (z0 + z1) / 2 - up.z * thick / 2;
    return this.addBox(cx, cy, cz, width, thick, L + 0.2, ry, rx, 0, 'ramp');
  }
  build() { this.root.updateMatrixWorld(true); this.octree.fromGraphNode(this.root); }
  // dynamic boxes (crates, gates, doors): one tiny octree per box. A single octree spanning boxes spread over
  // the whole map lost faces (players fell through a stacked crate), and per-box trees rebuild cheaply.
  setDyn(id, b) {
    if (!b) { this.dyn.delete(id); this.dynList = null; return; }
    const m = new THREE.Mesh(BOX);
    m.position.set(b.x, b.y, b.z); m.scale.set(b.sx, b.sy, b.sz); m.rotation.y = b.ry || 0;
    m.updateMatrixWorld(true);
    this.dyn.set(id, { b, tree: new SafeOctree().fromGraphNode(m) }); this.dynList = null;
  }
  get dynTrees() { return (this.dynList ||= [...this.dyn.values()].map((d) => d.tree)); }
  trees() { return [this.octree, ...this.dynTrees]; }
  ray(origin, dir, maxDist, withDyn = true) {
    _ray.set(origin, dir);
    let best = null;
    const r = this.octree.rayIntersect(_ray);
    if (r && r.distance <= maxDist) best = r;
    if (withDyn) for (const d of this.dynTrees) { const r2 = d.rayIntersect(_ray); if (r2 && r2.distance <= maxDist && (!best || r2.distance < best.distance)) best = r2; }
    return best;
  }
  sphere(sphere) {
    let best = null;
    for (const t of this.trees()) { const r = t.sphereIntersect(sphere); if (r && (!best || r.depth > best.depth)) best = r; }
    return best;
  }
}
