// Builds the whole city: regions -> merged static meshes, instanced props, colliders, zones, anchors.
import * as THREE from 'three';
import { Geo, mulberry32 } from './geo.js';
import { createMaterials, U } from './materials.js';
import { CollisionWorld } from './collision.js';
import { Sky } from './sky.js';
import { INST, instGeo, makeInst } from './kit.js';
import { scatter, Occupancy } from './vegetation.js';
import { makeSign } from './textures.js';
import './clues.js';
import { PAL } from './palette.js';
import { buildR1 } from './regions/r1.js';
import { buildR2 } from './regions/r2.js';
import { buildR3 } from './regions/r3.js';
import { buildUnder } from './regions/under.js';
import { farCity } from './regions/far.js';
import { onLang } from '../i18n/i18n.js';

function makeKit(G, W, name, seed, pal) {
  const rand = mulberry32(seed);
  const k = {
    G, W, name, rand, pal, col: W.col,
    geo: new Geo(rand), soft: new Geo(rand), glow: new Geo(rand), stone: new Geo(rand),
    inst: {}, greens: [], vineWalls: [], signs: [], noVegRects: [], extra: [], extraLights: [],
    add(type, item) { (this.inst[type] ||= []).push(item); },
    green(x0, z0, x1, z1, o = {}) { this.greens.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), ...o }); },
    noVeg(r) { this.noVegRects.push(r); },
    sign(s) { this.signs.push(s); },
    solid(x, y, z, sx, sy, sz, color, o = {}) { this.geo.box(x, y, z, sx, sy, sz, color, o); this.col.addBox(x, y, z, sx, sy, sz, o.ry || 0, 0, 0, o.tag || 'solid'); },
    anchor(id, x, y, z, data = {}) { W.anchors.set(id, { pos: new THREE.Vector3(x, y, z), region: name, ...data }); },
    zone(z) { W.zones.push({ region: name, ...z }); },
    surface(r, type) { W.surfaces.push({ r, type }); },
    mesh(m) { this.extra.push(m); },
  };
  return k;
}

const CHUNK = 80; // metres per culling cell (bigger = fewer draw calls)
const SPLIT = new Set(['grass', 'tall', 'flower', 'leaf']); // dense ground cover: split per cell and dropped beyond DETAIL_FAR
const DETAIL_FAR = 110;
function finishKit(k) {
  const M = k.W.M, grp = new THREE.Group(), detail = new THREE.Group();
  grp.name = k.name; detail.name = k.name + '_detail';
  const add = (geo, mat, o = {}) => {
    if (geo.empty) return;
    let first = null;
    for (const gg of o.whole ? [geo.build()] : geo.buildChunks(CHUNK)) { const m = new THREE.Mesh(gg, mat); m.castShadow = !!o.cast; m.receiveShadow = true; (o.into || grp).add(m); first ||= m; }
    return first;
  };
  add(k.geo, M.world, { cast: true });
  add(k.soft, M.cloth, { whole: true });
  add(k.glow, M.glow, { whole: true });
  const tower = add(k.stone, M.tower, { cast: true, into: k.W.landmark, whole: true });
  if (tower) tower.frustumCulled = false;
  for (const [type, items] of Object.entries(k.inst)) {
    if (!items.length) continue;
    const def = INST[type], cells = new Map();
    for (const it of items) { const key = SPLIT.has(type) ? Math.floor(it.x / CHUNK) + ',' + Math.floor(it.z / CHUNK) : 'all'; let l = cells.get(key); if (!l) cells.set(key, (l = [])); l.push(it); }
    for (const list of cells.values()) {
      const mesh = makeInst(instGeo(type), M[def.mat], list, def);
      if (def.density) { k.W.density.push({ mesh, total: list.length }); detail.add(mesh); k.W.near.push(mesh); } else grp.add(mesh);
    }
  }
  for (const s of k.signs) grp.add(makeSign(s, k.W));
  for (const m of k.extra) grp.add(m);
  k.W.groups[k.name] = grp; k.W.details[k.name] = detail;
  k.G.scene.add(grp, detail);
}

const REGION_Z = { r1: [120, 266], r2: [-10, 120], under: [-100, 70], r3: [-190, -40] };

// a hedge row along the map edge so the (invisible) boundary wall reads as a natural limit
const EDGES = { r1: { z: [120, 266], cap: 265.2 }, r2: { z: [-10, 120] }, r3: { z: [-190, -40], cap: -189.2 } };
function edgeHedges(k, W) {
  const e = EDGES[k.name]; if (!e) return;
  const R = k.rand;
  const blocked = (x, z) => W.col.boxes.some((b) => b.tag !== 'ground' && b.tag !== 'ramp' && b.tag !== 'bound' && Math.abs(b.x - x) < b.sx / 2 + 0.5 && Math.abs(b.z - z) < b.sz / 2 + 0.5 && b.y - b.sy / 2 < 1.2 && b.y + b.sy / 2 > 0.4);
  const put = (x, z) => { if (!blocked(x, z)) k.add('hedge', { x, y: 0, z, ry: R() * 6.28, s: [1.5 + R() * 0.6, 1.4 + R() * 0.8, 1.5 + R() * 0.6] }); };
  for (let z = e.z[0] + 0.8; z < e.z[1]; z += 2.0) { put(-79.2, z); put(79.2, z); }
  if (e.cap) for (let x = -78.2; x < 79; x += 2.0) put(x, e.cap);
}

export function buildWorld(G) {
  const W = { G, groups: {}, details: {}, anchors: new Map(), zones: [], surfaces: [], textDraws: [], density: [], portals: [], lightSpecs: [], tallCells: new Map(), near: [], nearT: 0, col: new CollisionWorld() };
  W.M = createMaterials();
  W.sky = new Sky(G.scene);
  W.landmark = new THREE.Group(); G.scene.add(W.landmark);
  const defs = [['r1', buildR1, 1101, PAL.r1], ['r2', buildR2, 2202, PAL.r2], ['under', buildUnder, 3303, PAL.under], ['r3', buildR3, 4404, PAL.r3]];
  const kits = defs.map(([name, fn, seed, pal]) => { const k = makeKit(G, W, name, seed, pal); fn(k); return k; });
  for (const k of kits) edgeHedges(k, W);
  const occ = new Occupancy(-95, -200, 95, 280, 1);
  occ.fromBoxes(W.col.boxes);
  kits.forEach((k) => k.noVegRects.forEach((r) => occ.block(r)));
  for (const k of kits) { scatter(k, occ); finishKit(k); W.lightSpecs.push(...k.extraLights); }
  farCity(W, G.scene);
  // map boundary: inner faces sit exactly on the ground edges (no gap) and reach deep below ground
  for (const [x, z, sx, sz] of [[0, 266.5, 162, 1], [0, -190.5, 162, 1], [80.5, 38, 1, 460], [-80.5, 38, 1, 460]]) W.col.addBox(x, -10, z, sx, 60, sz, 0, 0, 0, 'bound');
  // canal bed (safety floor; walking into the canal counts as falling, see W.pit)
  W.col.addBox(0, -2.9, -25, 160, 1, 30, 0, 0, 0, 'ground');
  W.col.build();
  const redraw = () => W.textDraws.forEach((f) => f());
  onLang(redraw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);

  W.zoneAt = (p) => {
    for (const z of W.zones) { const b = z.box; if (p.x >= b[0] && p.x <= b[3] && p.y >= b[1] && p.y <= b[4] && p.z >= b[2] && p.z <= b[5]) return z; }
    return null;
  };
  W.regionAt = (p) => (p.y < -2.2 && p.z < 70 ? 'under' : p.z > 120 ? 'r1' : p.z > -40 ? 'r2' : 'r3');
  W.surfaceAt = (p) => {
    const z = W.zoneAt(p); if (z && z.surf) return z.surf;
    for (let i = W.surfaces.length - 1; i >= 0; i--) { const s = W.surfaces[i], r = s.r; if (p.x >= r[0] && p.x <= r[2] && p.z >= r[1] && p.z <= r[3]) return s.type; }
    const reg = W.regionAt(p); return reg === 'r1' ? 'grass' : reg === 'under' ? 'tile' : 'stone';
  };
  W.tallAt = (p) => (W.tallCells.get(Math.floor(p.x / 2) + ',' + Math.floor(p.z / 2)) || 0) >= 2;
  W.setDensity = (d) => { for (const e of W.density) e.mesh.count = Math.floor(e.total * d); };
  // underground = below ground inside the station footprint (NOT the residential garage, which is part of r1)
  W.isUnder = (p) => p.y < -2.4 && p.z < 70 && p.z > -100 && p.x < 50;
  W.update = (dt, cam) => {
    U.uTime.value += dt;
    W.sky.update(cam, dt);
    const p = cam.position, under = W.isUnder(p), near = W.nearPortal(p, under ? 12 : 0);
    for (const [name, grp] of Object.entries(W.groups)) {
      const [z0, z1] = REGION_Z[name], dz = Math.max(0, z0 - p.z, p.z - z1);
      grp.visible = name === 'under' ? under || near : !under || near;
      const det = W.details[name]; if (det) det.visible = grp.visible && dz < 140;
    }
    // ground cover farther than DETAIL_FAR is sub-pixel: skip it (checked a few times a second)
    W.nearT -= dt;
    if (W.nearT <= 0) { W.nearT = 0.3; for (const m of W.near) { const s = m.boundingSphere; m.visible = !s || s.center.distanceTo(p) - s.radius < DETAIL_FAR; } }
  };
  W.nearPortal = (p, extra = 0) => W.portals.some((q) => Math.hypot(p.x - q[0], p.z - q[1]) < q[2] + extra);
  // places where the player counts as fallen (canal bed)
  W.pit = (p) => p.y < -1.7 && p.y > -3.5 && p.z < -10.3 && p.z > -39.7;
  return W;
}
