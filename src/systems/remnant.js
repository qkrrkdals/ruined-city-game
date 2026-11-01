// A single Remnant: visuals (dark translucent silhouette, pale eyes, drifting memory fragments) + state machine.
import * as THREE from 'three';
import { Geo } from '../world/geo.js';
import { CFG } from '../core/config.js';
import { U } from '../world/materials.js';
import { dotTexture } from '../world/textures.js';

const C = CFG.remnant;
const _v = new THREE.Vector3(), _d = new THREE.Vector3(), _s = new THREE.Sphere(new THREE.Vector3(), 0.38), _f = new THREE.Vector3();
let BODY = null;
function bodyGeo() {
  if (BODY) return BODY;
  const g = new Geo(() => 0.5);
  g.prism(0, 0, 0, 0.1, 0.34, 0.75, 7, '#ffffff', { cap: false, jit: 0 });
  g.prism(0, 0.75, 0, 0.34, 0.4, 0.45, 7, '#ffffff', { cap: false, jit: 0, a0: 0.2 });
  g.prism(0, 1.2, 0, 0.4, 0.13, 0.36, 7, '#ffffff', { jit: 0, a0: 0.4 });
  g.ico(0, 1.74, 0.02, 0.21, '#ffffff', { j: 0.12, jit: 0, sy: 1.15 });
  g.beam(0.32, 1.42, 0, 0.42, 0.55, 0.12, 0.1, '#ffffff', 0); g.beam(-0.32, 1.42, 0, -0.44, 0.6, 0.1, 0.1, '#ffffff', 0);
  return (BODY = g.build());
}
const VS = `uniform float uTime; uniform float uAgit; varying vec3 vN; varying vec3 vV; varying float vY;
void main() { vec3 p = position; float a = 1.0 + uAgit * 2.0;
  p.x += sin(uTime * 3.1 + p.y * 4.0) * 0.025 * a; p.z += cos(uTime * 2.3 + p.y * 3.3) * 0.025 * a;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); vY = position.y; gl_Position = projectionMatrix * mv; }`;
const FS = `uniform vec3 uCol; uniform vec3 uRim; uniform float uOpacity; uniform vec3 uFogColor; uniform float uFogDensity; uniform float uLit;
varying vec3 vN; varying vec3 vV; varying float vY;
void main() { float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
  vec3 c = mix(uCol, uRim * (1.0 + uLit), f);
  float fd = length(vV) * uFogDensity; c = mix(c, uFogColor, (1.0 - exp(-fd * fd)) * 0.8);
  float a = uOpacity * smoothstep(0.0, 0.6, vY) * (0.7 + 0.3 * f);
  gl_FragColor = vec4(c, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Remnant {
  constructor(M, spec) {
    this.M = M; this.G = M.G; this.spec = spec; this.id = spec.id; this.nav = M.navs[spec.nav]; this.zone = spec.zone;
    this.floorY = spec.y; this.home = new THREE.Vector3(spec.x, spec.y, spec.z); this.pos = this.home.clone();
    this.speedMul = spec.speed ?? 1; this.percept = spec.percept ?? 1; this.chaseSpeed = spec.chase ?? C.chase;
    this.state = 'wander'; this.aw = 0; this.path = null; this.pi = 0; this.wait = 0; this.tick = Math.random() * 0.1;
    this.last = new THREE.Vector3(); this.noLos = 0; this.noticeT = 0; this.repath = 0; this.yaw = 0; this.los = false; this.dist = 99; this.lit = 0; this.agit = 0;
    this.enabled = false;
    const G = this.G, fog = G.scene.fog;
    this.u = { uTime: U.uTime, uAgit: { value: 0 }, uCol: { value: new THREE.Color('#1c1530') }, uRim: { value: new THREE.Color('#b9a6e8') }, uOpacity: { value: 0.88 }, uFogColor: { value: fog.color }, uFogDensity: U.uFogDensity, uLit: { value: 0 } };
    const mat = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false });
    this.group = new THREE.Group(); this.body = new THREE.Mesh(bodyGeo(), mat); this.group.add(this.body);
    this.eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e9e2ff').multiplyScalar(2) });
    for (const x of [-0.075, 0.075]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), this.eyeMat); e.position.set(x, 1.77, 0.18); this.group.add(e); }
    const n = 16, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), pal = ['#ffd6a0', '#ffc0cf', '#c9f0e6', '#e6d6ff', '#fff2b0'].map((h) => new THREE.Color(h));
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = 0.1 + Math.random() * 0.22; pos.set([Math.cos(a) * r, 0.5 + Math.random() * 1.2, Math.sin(a) * r], i * 3); const c = pal[i % 5]; col.set([c.r, c.g, c.b], i * 3); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.frag = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.07, map: dotTexture(), vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.group.add(this.frag);
    this.group.visible = false; G.scene.add(this.group);
  }
  setEnabled(on) {
    if (on === this.enabled) return;
    this.enabled = on; this.group.visible = on;
    if (on) { this.placeAwayFromPlayer(); this.state = 'wander'; this.aw = 0; this.path = null; }
  }
  placeAwayFromPlayer() {
    const P = this.G.player.feet;
    for (let i = 0; i < 12; i++) {
      const p = this.nav.randomFree(this.zone); if (!p) break;
      const d = Math.hypot(p[0] - P.x, p[1] - P.z);
      if (d > 20 || i === 11) { this.pos.set(p[0], this.floorY, p[1]); return; }
    }
  }
  reset() { this.pos.copy(this.home); const p = this.nav.nearestFree(this.home.x, this.home.z, 5); if (p) this.pos.set(p[0], this.floorY, p[1]); this.state = 'wander'; this.aw = 0; this.path = null; this.noLos = 0; }
  goTo(x, z) { this.path = this.nav.path(this.pos.x, this.pos.z, x, z); this.pi = 0; if (!this.path) this.path = [[x, z]]; }
  follow(speed, dt) {
    if (!this.path || this.pi >= this.path.length) return true;
    const [tx, tz] = this.path[this.pi];
    if (this.step(tx, tz, speed, dt)) this.pi++;
    return this.pi >= this.path.length;
  }
  step(tx, tz, speed, dt) {
    const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.15) return true;
    const st = Math.min(d, speed * dt);
    this.pos.x += (dx / d) * st; this.pos.z += (dz / d) * st;
    let dy = Math.atan2(dx, dz) - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * Math.min(1, dt * 6);
    for (const s of this.M.shelters()) {
      const sx = this.pos.x - s.pos.x, sz = this.pos.z - s.pos.z, sd = Math.hypot(sx, sz), lim = s.r + 0.8;
      if (sd < lim && Math.abs(this.floorY - s.pos.y) < 3) { this.pos.x = s.pos.x + (sx / (sd || 1)) * lim; this.pos.z = s.pos.z + (sz / (sd || 1)) * lim; }
    }
    _s.center.set(this.pos.x, this.floorY + 1.25, this.pos.z);
    const hit = this.G.world.col.octree.sphereIntersect(_s);
    if (hit && Math.abs(hit.normal.y) < 0.6) { this.pos.x += hit.normal.x * hit.depth; this.pos.z += hit.normal.z * hit.depth; }
    return d - st < 0.15;
  }
  perceive(dt, noises) {
    const G = this.G, P = G.player, cam = G.camera.position, fl = G.flashlight;
    _v.set(this.pos.x, this.floorY + 1.55, this.pos.z);
    _d.set(cam.x, cam.y - 0.35, cam.z).sub(_v);
    const d = _d.length(); this.dist = d;
    const sameLevel = Math.abs(P.feet.y - this.floorY) < 3.2;
    this.los = sameLevel && d < 40 && !G.world.col.ray(_v, _d.normalize(), Math.max(0.1, d - 0.4), true);
    let rate = 0, lit = false;
    if (this.los && !this.M.playerSheltered()) {
      if (fl.lit) {
        _f.set(0, 0, -1).applyQuaternion(G.camera.quaternion);
        _d.set(this.pos.x - cam.x, this.floorY + 1.0 - cam.y, this.pos.z - cam.z);
        const dd = _d.length(); lit = dd < 24 && _d.dot(_f) / dd > Math.cos(0.58);
        if (lit) rate = 2.4;
        else if (d < C.lightSight) rate = 0.35 + 0.9 * (1 - d / C.lightSight);
      }
      let sight = P.crouch ? C.darkCrouch : C.darkStand;
      if (P.crouch && this.M.inTallGrass(P.feet)) sight *= 0.5;
      if (G.time.night < 0.25 && !G.world.zoneAt(cam)) sight = 12;
      if (d < sight) rate = Math.max(rate, 0.6 + 1.6 * (1 - d / sight));
    }
    this.lit += ((lit ? 1 : 0) - this.lit) * Math.min(1, dt * 8);
    if (rate > 0) { this.aw += rate * dt * this.percept; this.last.copy(P.feet); }
    else this.aw = Math.max(0, this.aw - 0.22 * dt);
    for (const n of noises) {
      if (Math.abs(n.pos.y - this.floorY) > 4) continue;
      const dn = Math.hypot(n.pos.x - this.pos.x, n.pos.z - this.pos.z);
      if (dn > n.r) continue;
      this.aw = Math.max(this.aw, Math.min(0.95, 0.4 + ((n.r - dn) / n.r) * 0.5));
      if (dn < 3) this.aw += 0.6;
      if (this.state === 'wander' || this.state === 'investigate' || this.state === 'search') { this.state = 'investigate'; this.goTo(n.pos.x, n.pos.z); this.wait = 0; }
    }
    this.aw = Math.min(this.aw, 1.3);
    return rate > 0;
  }
  update(dt, noises) {
    const G = this.G, P = G.player.feet;
    this.tick -= dt;
    let seen = this.state === 'chase' ? this.los : false;
    if (this.tick <= 0) { this.tick = 0.1; seen = this.perceive(0.1, noises); }
    const sheltered = this.M.playerSheltered();
    switch (this.state) {
      case 'wander':
        if (this.wait > 0) this.wait -= dt;
        else if (!this.path || this.pi >= this.path.length) { const p = this.nav.randomFree(this.zone); if (p) this.goTo(p[0], p[1]); if (Math.random() < 0.4) this.wait = 1 + Math.random() * 2.5; }
        else this.follow(C.wander * this.speedMul, dt);
        if (this.aw >= 1) this.toNotice(); else if (this.aw >= 0.35 && seen) { this.state = 'investigate'; this.goTo(this.last.x, this.last.z); }
        break;
      case 'investigate':
        if (this.aw >= 1) { this.toNotice(); break; }
        if (this.follow(C.investigate * this.speedMul, dt)) { this.state = 'search'; this.wait = 2.5; }
        break;
      case 'notice':
        this.noticeT -= dt; this.face(P.x, P.z, dt);
        if (this.noticeT <= 0) { if (sheltered) { this.state = 'search'; this.wait = 3; } else { this.state = 'chase'; this.noLos = 0; this.repath = 0; G.events.emit('remnantChase', this); } }
        break;
      case 'chase': {
        this.agit = 1;
        if (this.los && !sheltered) { this.noLos = 0; this.last.copy(P); this.step(P.x, P.z, this.chaseSpeed * this.speedMul, dt); this.path = null; }
        else {
          this.noLos += dt; this.repath -= dt;
          if (this.repath <= 0 || !this.path) { this.repath = 0.6; this.goTo(this.last.x, this.last.z); }
          this.follow(this.chaseSpeed * this.speedMul * 0.85, dt);
          const hidden = G.player.crouch && !G.flashlight.lit;
          if (sheltered || this.noLos > C.loseTime || (hidden && this.noLos > 2)) { this.state = 'search'; this.wait = 3.5; this.aw = 0.3; this.goTo(this.last.x, this.last.z); G.events.emit('remnantLost', this); }
        }
        if (Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z) > 48) { this.state = 'search'; this.wait = 1; this.aw = 0; this.goTo(this.home.x, this.home.z); }
        const dh = Math.hypot(P.x - this.pos.x, P.z - this.pos.z);
        if (!sheltered && dh < C.catchDist && Math.abs(P.y - this.floorY) < 1.8) this.M.catchPlayer(this);
        break;
      }
      case 'search':
        if (!this.follow(C.investigate * this.speedMul * 0.8, dt)) break;
        this.wait -= dt; this.yaw += dt * 1.2;
        if (this.aw >= 1 && this.los) this.toNotice();
        else if (this.wait <= 0) { this.state = 'wander'; this.path = null; }
        break;
    }
    if (this.state !== 'chase') this.agit = Math.max(this.state === 'notice' ? 0.8 : 0, this.agit - dt);
    this.render(dt);
  }
  toNotice() { this.state = 'notice'; this.noticeT = C.notice; this.path = null; this.G.events.emit('remnantNotice', this); }
  face(x, z, dt) { let dy = Math.atan2(x - this.pos.x, z - this.pos.z) - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * Math.min(1, dt * 8); }
  render(dt) {
    const t = this.G.elapsed;
    this.group.position.set(this.pos.x, this.floorY + 0.05 + Math.sin(t * 1.3 + this.home.x) * 0.06, this.pos.z);
    this.group.rotation.y = this.yaw;
    this.u.uAgit.value = this.agit; this.u.uLit.value = this.lit;
    const hot = this.state === 'chase' ? 1 : this.state === 'notice' ? 0.7 : this.aw * 0.4;
    this.eyeMat.color.setRGB(0.9 + hot * 0.6, 0.85 + hot * 0.2, 1.0).multiplyScalar(1.6 + hot * 2.4);
    this.frag.rotation.y += dt * (0.6 + this.agit * 2);
    this.body.scale.setScalar(1 + this.lit * 0.04 * Math.sin(t * 40));
  }
}
