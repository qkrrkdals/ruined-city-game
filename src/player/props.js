// Movable props: crates (axis-aligned boxes in the dynamic octree, stackable) and small items (fuses, bottles)
// with simple sphere physics. Anything that ends up out of its bounds returns home.
import * as THREE from 'three';
import { instGeo } from '../world/kit.js';
import { Geo } from '../world/geo.js';
import { t } from '../i18n/i18n.js';

const H = 0.45;
const OFFS = [[0, 0], [0.38, 0.38], [-0.38, 0.38], [0.38, -0.38], [-0.38, -0.38]];
const PUSH = [[0, 0, 0.46], [0.3, 0.3, 0.16], [-0.3, 0.3, 0.16], [0.3, -0.3, 0.16], [-0.3, -0.3, 0.16]];
const _v = new THREE.Vector3(), _o = new THREE.Vector3(), _down = new THREE.Vector3(0, -1, 0), _s = new THREE.Sphere(new THREE.Vector3(), 0.1), _t = new THREE.Vector3();

function itemGeo(kind, o = {}) {
  const g = new Geo(Math.random);
  if (kind === 'fuse') {
    g.prism(0, -0.09, 0, 0.045, 0.045, 0.18, 8, '#cfe8ef', { jit: 0.02, bottom: true });
    g.prism(0, -0.11, 0, 0.052, 0.052, 0.04, 8, '#b9b4c2', { bottom: true }); g.prism(0, 0.07, 0, 0.052, 0.052, 0.04, 8, '#b9b4c2');
    if (o.band) g.prism(0, -0.02, 0, 0.048, 0.048, 0.035, 8, o.band, { jit: 0 });
  } else if (kind === 'alarm') {
    g.prism(0, -0.02, 0, 0.09, 0.09, 0.05, 12, '#e9a8a8', { rx: Math.PI / 2, jit: 0, bottom: true });
    g.prism(0, -0.02, 0.026, 0.075, 0.075, 0.004, 12, '#fbf6e6', { rx: Math.PI / 2, jit: 0 });
    for (const x of [-0.055, 0.055]) g.ico(x, 0.075, 0, 0.035, '#d9d4cc', { sy: 0.6, j: 0 });
    g.box(-0.05, -0.1, 0, 0.02, 0.04, 0.02, '#6a5a5a'); g.box(0.05, -0.1, 0, 0.02, 0.04, 0.02, '#6a5a5a');
  } else if (kind === 'bottle') {
    g.prism(0, -0.12, 0, 0.05, 0.05, 0.17, 7, '#8fc7a7', { bottom: true, jit: 0.03 }); g.prism(0, 0.05, 0, 0.05, 0.018, 0.06, 7, '#8fc7a7'); g.prism(0, 0.11, 0, 0.018, 0.018, 0.06, 6, '#8fc7a7');
  }
  return g.build();
}

export class Props {
  constructor(G) {
    this.G = G; this.list = []; this.byId = new Map(); this.carrying = null;
    this.glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9ff0e0').multiplyScalar(1.6) });
  }
  get col() { return this.G.world.col; }
  inBounds(p) { const b = p.bounds; if (p.pos.y < -30) return false; if (!b) return true; return p.pos.x >= b[0] && p.pos.y >= b[1] && p.pos.z >= b[2] && p.pos.x <= b[3] && p.pos.y <= b[4] && p.pos.z <= b[5]; }
  setCollider(p) { this.col.setDyn('crate_' + p.id, p.state === 'rest' && !p.gone ? { x: p.pos.x, y: p.pos.y, z: p.pos.z, sx: 0.9, sy: 0.9, sz: 0.9 } : null); }

  addCrate(id, pos, bounds) {
    const mesh = new THREE.Mesh(instGeo('crate'), this.G.world.M.world); mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.copy(pos);
    const p = { id, kind: 'crate', crate: true, mesh, pos: mesh.position, home: pos.clone(), rest: pos.clone(), vel: new THREE.Vector3(), state: 'rest', bounds };
    this.G.scene.add(mesh); this.list.push(p); this.byId.set(id, p); this.setCollider(p);
    p.it = this.G.interact.add({ id: 'prop_' + id, getPos: (v) => v.copy(p.pos), r: 0.62, verb: 'carry', name: 'items.crate', enabled: () => p.state === 'rest' && !this.carrying, onUse: () => this.pick(p) });
    return p;
  }
  addItem(id, kind, pos, o = {}) {
    const mesh = new THREE.Mesh(itemGeo(kind, o), this.G.world.M.world); mesh.castShadow = true;
    if (kind === 'fuse') { const gl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), this.glowMat); gl.position.y = 0.0; mesh.add(gl); }
    mesh.position.copy(pos); mesh.rotation.set(0, 0, o.lying ? Math.PI / 2 : 0);
    const p = { id, kind, code: o.code, small: true, r: 0.1, mesh, pos: mesh.position, home: pos.clone(), rest: pos.clone(), vel: new THREE.Vector3(), spin: new THREE.Vector3(), state: 'rest', bounds: o.bounds, throwable: true, breakable: kind === 'bottle' };
    this.G.scene.add(mesh); this.list.push(p); this.byId.set(id, p);
    p.it = this.G.interact.add({ id: 'prop_' + id, getPos: (v) => v.copy(p.pos), r: 0.28, verb: 'pickup', name: 'items.' + kind, ignoreDyn: true, reachOver: !!o.reachOver, enabled: () => p.state === 'rest' && !p.inserted && !p.gone && !this.carrying, onUse: () => this.pick(p) });
    return p;
  }

  pick(p) {
    if (this.carrying || p.state !== 'rest') return;
    if (p.crate) {
      const f = this.G.player.feet;
      if (Math.abs(f.x - p.pos.x) < H + 0.3 && Math.abs(f.z - p.pos.z) < H + 0.3 && Math.abs(f.y - (p.pos.y + H)) < 0.3) { this.G.ui.toast(t('hud.standingOnIt')); return; }
      p.state = 'carried'; this.setCollider(p); this.unsupport(p);
    } else {
      p.state = 'carried';
      this.G.camera.add(p.mesh); p.mesh.position.set(0.24, -0.25, -0.55); p.mesh.rotation.set(0.3, 0.2, 0.25);
    }
    this.carrying = p;
    this.G.events.emit('pickup', p);
  }
  // crates resting on top of `p` start falling
  unsupport(p) {
    for (const q of this.list) if (q !== p && q.crate && q.state === 'rest' && q.pos.y > p.pos.y + 0.5 && Math.abs(q.pos.x - p.pos.x) < 0.9 && Math.abs(q.pos.z - p.pos.z) < 0.9) { q.state = 'falling'; q.vel.set(0, 0, 0); this.setCollider(q); }
  }
  releaseSmall(p) {
    const cam = this.G.camera; cam.updateMatrixWorld();
    p.mesh.getWorldPosition(_v); cam.remove(p.mesh); this.G.scene.add(p.mesh); p.mesh.position.copy(_v); p.pos = p.mesh.position;
  }
  drop() {
    const p = this.carrying; if (!p) return;
    this.carrying = null;
    if (p.crate) { p.state = 'falling'; p.vel.set(0, 0, 0); }
    else { this.releaseSmall(p); p.state = 'flying'; p.vel.set(this.G.player.vel.x * 0.5, 0.5, this.G.player.vel.z * 0.5); p.spin.set(2, 1, 0); }
    this.G.events.emit('drop', p);
  }
  throwHeld() {
    const p = this.carrying; if (!p || !p.small) return;
    this.carrying = null; this.releaseSmall(p);
    _v.set(0, 0, -1).applyQuaternion(this.G.camera.quaternion);
    p.vel.copy(_v).multiplyScalar(11).add(this.G.player.vel.clone().multiplyScalar(0.4)); p.vel.y += 2.4;
    p.spin.set(9, 5, 3); p.state = 'flying';
    this.G.events.emit('throw', p);
  }
  // return a carried item to where it was picked up (used when the player is caught)
  returnCarried() {
    const p = this.carrying; if (!p) return;
    this.carrying = null;
    if (p.small) this.releaseSmall(p);
    this.placeAt(p, p.rest);
  }
  placeAt(p, at) {
    p.pos.copy(at); p.vel.set(0, 0, 0);
    if (p.crate) {
      for (const q of this.list) if (q !== p && q.crate && q.state === 'rest' && Math.abs(q.pos.x - at.x) < 0.88 && Math.abs(q.pos.z - at.z) < 0.88 && Math.abs(q.pos.y - at.y) < 0.88) { p.pos.y = q.pos.y + 1.6; p.state = 'falling'; this.setCollider(p); return; }
    }
    p.state = 'rest'; p.rest.copy(p.pos); if (p.crate) this.setCollider(p); else p.mesh.rotation.set(0, 0, p.kind === 'fuse' ? Math.PI / 2 : 0);
  }
  // put a carried small item into a socket (kept, hidden, so it can be pulled out again)
  insert(p) {
    if (this.carrying === p) { this.carrying = null; this.releaseSmall(p); }
    p.inserted = true; p.state = 'rest'; p.mesh.visible = false; p.vel.set(0, 0, 0);
  }
  // take an inserted item back out at `at` and hold it
  extract(p, at) {
    if (this.carrying) return false;
    p.inserted = false; p.mesh.visible = true; p.pos.copy(at); p.rest.copy(at); p.state = 'rest';
    this.pick(p); return true;
  }
  respawn(p) { this.placeAt(p, p.home); this.G.events.emit('itemReturned', p); }
  remove(p) { p.gone = true; p.state = 'gone'; p.mesh.parent?.remove(p.mesh); if (p.crate) this.setCollider(p); this.G.interact.remove(p.it); if (this.carrying === p) this.carrying = null; }

  support(p) {
    let best = -Infinity;
    for (const [ox, oz] of OFFS) {
      _o.set(p.pos.x + ox, p.pos.y + 0.25, p.pos.z + oz);
      const hit = this.col.ray(_o, _down, 80, true);
      if (hit) best = Math.max(best, _o.y - hit.distance);
    }
    return best;
  }
  pushOut(p) {
    for (let it = 0; it < 3; it++) {
      let moved = false;
      for (const [ox, oz, r] of PUSH) {
        _s.center.set(p.pos.x + ox, p.pos.y, p.pos.z + oz); _s.radius = r;
        const hit = this.col.sphere(_s);
        if (hit && hit.depth > 0.001) { p.pos.addScaledVector(hit.normal, hit.depth); moved = true; }
      }
      if (!moved) break;
    }
  }
  update(dt) {
    const G = this.G, pl = G.player;
    for (const p of this.list) {
      if (p.gone) continue;
      if (p.state === 'carried' && p.crate) {
        const sy = Math.sin(pl.yaw), cy = Math.cos(pl.yaw), eye = G.camera.position;
        _t.set(eye.x - sy * 1.45, eye.y - 0.3 + THREE.MathUtils.clamp(pl.pitch, -0.7, 0.8) * 1.3, eye.z - cy * 1.45);
        p.pos.lerp(_t, Math.min(1, dt * 14));
        this.pushOut(p);
      } else if (p.state === 'falling') {
        if (p.sup === undefined) p.sup = this.support(p);
        p.vel.y -= 24 * dt; p.pos.y += p.vel.y * dt;
        if (p.sup === -Infinity || p.pos.y < -30) { p.sup = undefined; this.respawn(p); continue; }
        if (p.pos.y - H <= p.sup) {
          const impact = -p.vel.y; p.pos.y = p.sup + H; p.sup = undefined; p.state = 'rest'; p.vel.set(0, 0, 0);
          for (const q of this.list) if (q !== p && q.crate && q.state === 'rest' && Math.abs(q.pos.y + H - (p.pos.y - H)) < 0.06 && Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z) < 0.6) { p.pos.x = q.pos.x; p.pos.z = q.pos.z; }
          p.rest.copy(p.pos); this.setCollider(p);
          if (!this.inBounds(p)) { this.respawn(p); continue; }
          G.events.emit('impact', p, Math.max(1.5, impact));
        }
      } else if (p.state === 'flying') this.fly(p, dt);
    }
  }
  fly(p, dt) {
    const steps = 3, h = dt / steps;
    for (let i = 0; i < steps && p.state === 'flying'; i++) {
      p.vel.y -= 24 * h; p.pos.addScaledVector(p.vel, h);
      p.mesh.rotation.x += p.spin.x * h; p.mesh.rotation.y += p.spin.y * h; p.mesh.rotation.z += p.spin.z * h;
      _s.center.copy(p.pos); _s.radius = p.r;
      const hit = this.col.sphere(_s);
      if (hit) {
        p.pos.addScaledVector(hit.normal, hit.depth);
        const vn = p.vel.dot(hit.normal);
        if (vn < 0) {
          const speed = p.vel.length();
          p.vel.addScaledVector(hit.normal, -vn * 1.3).multiplyScalar(0.62); p.spin.multiplyScalar(0.6);
          if (speed > 2.5) this.G.events.emit('impact', p, speed);
          if (p.breakable && speed > 4.5) { this.G.events.emit('break', p); this.remove(p); return; }
        }
        if (hit.normal.y > 0.5 && p.vel.length() < 0.6) {
          p.state = 'rest'; p.vel.set(0, 0, 0); p.mesh.rotation.set(0, p.mesh.rotation.y, p.kind === 'fuse' ? Math.PI / 2 : 0);
          p.rest.copy(p.pos);
          if (!this.inBounds(p)) this.respawn(p);
        }
      }
      if (p.pos.y < -30) { this.respawn(p); return; }
    }
  }
  serialize() { const o = {}; for (const p of this.list) o[p.id] = { p: p.pos.toArray().map((v) => +v.toFixed(3)), s: p.gone ? 'gone' : p.inserted ? 'ins' : 'rest' }; return o; }
  restore(o) {
    if (!o) return;
    for (const p of this.list) {
      const s = o[p.id]; if (!s) continue;
      if (s.s === 'gone') this.remove(p);
      else if (s.s !== 'ins') { p.inserted = false; p.mesh.visible = true; p.pos.fromArray(s.p); p.state = 'rest'; p.rest.copy(p.pos); if (p.crate) this.setCollider(p); }
    }
  }
}
