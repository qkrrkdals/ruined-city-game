// First-person controller: Capsule vs Octree (static + dynamic), walk/run/crouch/jump, footsteps, head bob.
import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { CFG } from '../core/config.js';

const _v = new THREE.Vector3(), _o = new THREE.Vector3(), _dn = new THREE.Vector3(0, -1, 0), _fw = new THREE.Vector3(), _n = new THREE.Vector3();

export class Player {
  constructor(G) {
    this.G = G;
    this.cap = new Capsule(new THREE.Vector3(0, CFG.radius, 0), new THREE.Vector3(0, CFG.standTop, 0), CFG.radius);
    this.test = new Capsule(new THREE.Vector3(), new THREE.Vector3(), CFG.radius - 0.02);
    this.vel = new THREE.Vector3(); this.feet = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.crouch = false; this.eyeH = CFG.eyeStand;
    this.onFloor = false; this.airTime = 0; this.jumpBuf = 0; this.stride = 0; this.bob = 0; this.bobAmp = 0; this.landDip = 0;
    this.speedMul = 1; this.enabled = true; this.running = false; this.moving = false; this.lookEnabled = true; this.mantle = null; this.mantleHint = false; this.hintT = 0;
  }
  spawn(x, y, z, yaw = 0) {
    this.crouch = false; this.eyeH = CFG.eyeStand;
    this.cap.start.set(x, y + CFG.radius + 0.02, z); this.cap.end.set(x, y + CFG.standTop + 0.02, z);
    this.vel.set(0, 0, 0); this.yaw = yaw; this.pitch = 0; this.airTime = 0;
    this.syncCam(0);
  }
  get feetY() { return this.cap.start.y - CFG.radius; }
  mode() { return this.crouch ? 'crouch' : this.running ? 'run' : 'walk'; }
  setCrouch(on) {
    if (on === this.crouch) return true;
    if (!on && !this.canStand()) return false;
    this.crouch = on;
    this.cap.end.y = this.cap.start.y + ((on ? CFG.crouchTop : CFG.standTop) - CFG.radius);
    this.G.events.emit('crouch', on);
    return true;
  }
  canStand() {
    this.test.start.copy(this.cap.start); this.test.end.copy(this.cap.start); this.test.end.y += CFG.standTop - CFG.radius;
    for (const t of this.G.world.col.trees()) { const r = t.capsuleIntersect(this.test); if (r && r.normal.y < -0.3 && r.depth > 0.01) return false; }
    return true;
  }
  update(dt) {
    const G = this.G, inp = G.input;
    if (this.lookEnabled) {
      const [dx, dy] = inp.takeMouse(), sens = 0.0021 * (G.settings.sens ?? 1);
      this.yaw -= dx * sens; this.pitch = THREE.MathUtils.clamp(this.pitch - dy * sens * (G.settings.invertY ? -1 : 1), -1.52, 1.52);
    } else inp.takeMouse();
    let f = 0, s = 0;
    if (this.enabled) {
      if (inp.isDown('KeyW') || inp.isDown('ArrowUp')) f += 1;
      if (inp.isDown('KeyS') || inp.isDown('ArrowDown')) f -= 1;
      if (inp.isDown('KeyD') || inp.isDown('ArrowRight')) s += 1;
      if (inp.isDown('KeyA') || inp.isDown('ArrowLeft')) s -= 1;
      if (inp.pressed('KeyC')) this.setCrouch(!this.crouch);
      if (inp.pressed('Space')) this.jumpBuf = 0.15;
    }
    const len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const wx = -sy * f + cy * s, wz = -cy * f - sy * s;
    this.running = this.enabled && (inp.isDown('ShiftLeft') || inp.isDown('ShiftRight')) && f > 0 && !this.crouch;
    const speed = (this.crouch ? CFG.crouch : this.running ? CFG.run : CFG.walk) * this.speedMul;
    this.jumpBuf -= dt;
    if (this.mantle) this.doMantle(dt);
    else {
      if (this.jumpBuf > 0 && this.enabled && f > 0 && this.tryMantle()) this.jumpBuf = 0;
      const steps = 4, h = Math.min(dt, 0.05) / steps;
      for (let i = 0; i < steps; i++) this.step(h, wx * speed, wz * speed);
    }
    this.eyeH += ((this.crouch ? CFG.eyeCrouch : CFG.eyeStand) - this.eyeH) * Math.min(1, dt * 10);
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.moving = this.onFloor && hs > 0.6;
    if (this.moving) {
      const sl = this.crouch ? 0.6 : this.running ? 1.15 : 0.8;
      this.stride += hs * dt; this.bob += hs * dt * (Math.PI / sl);
      if (this.stride >= sl) { this.stride = 0; G.events.emit('footstep', this.mode(), this.feet); }
    }
    this.landDip *= Math.exp(-dt * 7);
    this.hintT -= dt;
    if (this.hintT <= 0) { this.hintT = 0.12; this.mantleHint = !this.mantle && this.onFloor && !!this.mantleCheck(); }
    if (this.feetY < -40 || G.world.pit(this.feet)) G.events.emit('fellOut');
    this.syncCam(dt);
  }
  step(dt, tx, tz) {
    const a = this.onFloor ? 13 : 4.5, k = 1 - Math.exp(-a * dt);
    this.vel.x += (tx - this.vel.x) * k; this.vel.z += (tz - this.vel.z) * k;
    this.vel.y = Math.max(this.vel.y - CFG.gravity * dt, -30);
    this.airTime = this.onFloor ? 0 : this.airTime + dt;
    if (this.jumpBuf > 0 && this.airTime < 0.12 && this.enabled) {
      if (!this.crouch || this.setCrouch(false)) { this.vel.y = CFG.jump; this.jumpBuf = 0; this.airTime = 1; this.onFloor = false; this.G.events.emit('jump', this.feet); }
    }
    const vy = this.vel.y, wasAir = !this.onFloor;
    this.cap.translate(_v.copy(this.vel).multiplyScalar(dt));
    this.collide();
    // stick to the ground when walking down slopes/stairs (otherwise the capsule hops: no footsteps, no E)
    if (!wasAir && !this.onFloor && this.vel.y <= 0) this.snapDown();
    if (wasAir && this.onFloor && vy < -5.5) { this.landDip = Math.min(0.16, -vy * 0.011); this.G.events.emit('land', -vy, this.feet); }
  }
  snapDown() {
    _o.set(this.cap.start.x, this.cap.start.y - CFG.radius + 0.05, this.cap.start.z);
    const hit = this.G.world.col.ray(_o, _dn, 0.5, true);
    if (!hit || (hit.triangle && hit.triangle.getNormal(_n).y < 0.55)) return;
    const drop = hit.distance - 0.05;
    if (drop < 0.001 || drop > 0.42) return;
    this.cap.translate(_v.set(0, -(drop + 0.01), 0));
    this.collide();
    if (this.onFloor) this.vel.y = 0;
  }
  // ledge 0.55–1.5 m above the feet right in front of you (used for the "Space: climb" hint and the climb)
  mantleCheck() {
    const carry = this.G.props.carrying;
    if (this.crouch || (carry && carry.crate) || this.airTime > 0.12) return null;
    const col = this.G.world.col, f = this.feet;
    _fw.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _o.copy(f).addScaledVector(_fw, 0.3).add(_v.set(0, 0.45, 0));
    const wall = col.ray(_o, _fw, 0.75, true);
    if (!wall) return null;
    const reach = 0.3 + wall.distance + 0.42;
    _o.copy(f).addScaledVector(_fw, reach).add(_v.set(0, 1.9, 0));
    const hit = col.ray(_o, _dn, 1.9, true); if (!hit) return null;
    const top = _o.y - hit.distance, h = top - f.y;
    if (h < 0.55 || h > 1.5) return null;
    this.test.start.set(_o.x, top + CFG.radius + 0.05, _o.z); this.test.end.set(_o.x, top + CFG.standTop + 0.05, _o.z);
    for (const t of col.trees()) { const r = t.capsuleIntersect(this.test); if (r && r.depth > 0.02) return null; }
    return { to: new THREE.Vector3(_o.x, top + 0.02, _o.z), h };
  }
  tryMantle() {
    const m = this.mantleCheck(); if (!m) return false;
    this.mantle = { t: 0, dur: 0.42 + m.h * 0.15, from: this.feet.clone(), to: m.to, h: m.h };
    this.G.events.emit('mantle', m.h);
    return true;
  }
  doMantle(dt) {
    const m = this.mantle; m.t += dt;
    const k = Math.min(1, m.t / m.dur), up = Math.min(1, k * 1.6), fw = Math.max(0, (k - 0.35) / 0.65);
    const x = m.from.x + (m.to.x - m.from.x) * fw, z = m.from.z + (m.to.z - m.from.z) * fw, y = m.from.y + (m.to.y - m.from.y) * up;
    this.cap.start.set(x, y + CFG.radius, z); this.cap.end.set(x, y + CFG.standTop, z);
    this.vel.set(0, 0, 0); this.landDip = Math.sin(k * Math.PI) * 0.12;
    if (k >= 1) { this.mantle = null; this.onFloor = true; }
  }
  collide() {
    this.onFloor = false;
    for (const tree of this.G.world.col.trees()) {
      for (let it = 0; it < 3; it++) {
        const r = tree.capsuleIntersect(this.cap);
        if (!r || r.depth < 1e-4) break;
        if (r.normal.y > 0.55) { this.onFloor = true; this.cap.translate(_v.set(0, r.depth / r.normal.y, 0)); if (this.vel.y < 0) this.vel.y = 0; }
        else { this.cap.translate(_v.copy(r.normal).multiplyScalar(r.depth)); const d = this.vel.dot(r.normal); if (d < 0) this.vel.addScaledVector(r.normal, -d); }
      }
    }
  }
  syncCam(dt) {
    const c = this.G.camera, target = this.moving && this.G.settings.bob !== false ? (this.running ? 0.05 : this.crouch ? 0.018 : 0.032) : 0;
    this.bobAmp += (target - this.bobAmp) * Math.min(1, dt * 6);
    this.feet.set(this.cap.start.x, this.cap.start.y - CFG.radius, this.cap.start.z);
    c.position.set(this.feet.x, this.feet.y + this.eyeH + Math.sin(this.bob * 2) * this.bobAmp * 0.5 - this.landDip, this.feet.z);
    c.rotation.set(this.pitch, this.yaw, Math.sin(this.bob) * this.bobAmp * 0.05, 'YXZ');
  }
}
