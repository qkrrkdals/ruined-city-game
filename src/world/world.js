// Builds the whole city: regions -> merged static meshes, instanced props, colliders, zones, anchors.
import * as THREE from 'three';
import { Geo, mulberry32 } from './geo.js';
import { createMaterials, U } from './materials.js';
import { CollisionWorld } from './collision.js';
import { Sky } from './sky.js';
import { INST, instGeo, makeInst } from './kit.js';
import { scatter, Occupancy } from './vegetation.js';
import { makeSign } from './textures.js';
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

function finishKit(k) {
  const M = k.W.M, grp = new THREE.Group(), detail = new THREE.Group();
  grp.name = k.name; detail.name = k.name + '_detail';
  const add = (geo, mat, o = {}) => {
    if (geo.empty) return;
    const m = new THREE.Mesh(geo.build(), mat); m.castShadow = !!o.cast; m.receiveShadow = true; (o.into || grp).add(m); return m;
  };
  add(k.geo, M.world, { cast: true });
  add(k.soft, M.cloth);
  add(k.glow, M.glow);
  const tower = add(k.stone, M.tower, { cast: true, into: k.W.landmark });
  if (tower) tower.frustumCulled = false;
  for (const [type, items] of Object.entries(k.inst)) {
    if (!items.length) continue;
    const def = INST[type], mesh = makeInst(instGeo(type), M[def.mat], items, def);
    if (def.density) { k.W.density.push({ mesh, total: items.length }); detail.add(mesh); } else grp.add(mesh);
  }
  for (const s of k.signs) grp.add(makeSign(s, k.W));
  for (const m of k.extra) grp.add(m);
  k.W.groups[k.name] = grp; k.W.details[k.name] = detail;
  k.G.scene.add(grp, detail);
}

const REGION_Z = { r1: [120, 266], r2: [-10, 120], under: [-100, 70], r3: [-190, -40] };

export function buildWorld(G) {
  const W = { G, groups: {}, details: {}, anchors: new Map(), zones: [], surfaces: [], textDraws: [], density: [], portals: [], lightSpecs: [], tallCells: new Map(), col: new CollisionWorld() };
  W.M = createMaterials();
  W.sky = new Sky(G.scene);
  W.landmark = new THREE.Group(); G.scene.add(W.landmark);
  const defs = [['r1', buildR1, 1101, PAL.r1], ['r2', buildR2, 2202, PAL.r2], ['under', buildUnder, 3303, PAL.under], ['r3', buildR3, 4404, PAL.r3]];
  const kits = defs.map(([name, fn, seed, pal]) => { const k = makeKit(G, W, name, seed, pal); fn(k); return k; });
  const occ = new Occupancy(-95, -200, 95, 280, 1);
  occ.fromBoxes(W.col.boxes);
  kits.forEach((k) => k.noVegRects.forEach((r) => occ.block(r)));
  for (const k of kits) { scatter(k, occ); finishKit(k); W.lightSpecs.push(...k.extraLights); }
  farCity(W, G.scene);
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
  W.update = (dt, cam) => {
    U.uTime.value += dt;
    W.sky.update(cam, dt);
    const p = cam.position, under = p.y < -2.4;
    for (const [name, grp] of Object.entries(W.groups)) {
      const [z0, z1] = REGION_Z[name], dz = Math.max(0, z0 - p.z, p.z - z1);
      const near = W.nearPortal(p);
      grp.visible = name === 'under' ? under || near : !under || near;
      const det = W.details[name]; if (det) det.visible = grp.visible && dz < 140;
    }
  };
  W.nearPortal = (p) => W.portals.some((q) => Math.hypot(p.x - q[0], p.z - q[1]) < q[2]);
  return W;
}
