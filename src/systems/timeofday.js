// Story-driven time of day. The story sets an hour range; time drifts slowly inside it and never past it.
// Hours run 13.5 .. 30.1 (30 = 06:00 the next morning).
import * as THREE from 'three';
import { U } from '../world/materials.js';

const K = (t, o) => ({ t, ...o });
const KEYS = [
  K(13.5, { el: 55, az: 205, sun: '#fff1da', si: 2.7, sky: '#8ec5ea', fog: '#f6dcc4', hs: '#d6ebf6', hg: '#e4c6a6', hi: 1.45, fd: 0.0062, st: 0, cl: '#ffffff', ex: 1.0 }),
  K(16.2, { el: 28, az: 238, sun: '#ffe1b0', si: 2.5, sky: '#9cc6e6', fog: '#f8d5b2', hs: '#ece2dc', hg: '#e0b893', hi: 1.3, fd: 0.0066, st: 0, cl: '#fff2e2', ex: 1.0 }),
  K(17.4, { el: 9, az: 258, sun: '#ffb27a', si: 2.1, sky: '#b6a3d3', fog: '#f2ae8f', hs: '#eab9b4', hg: '#c99a86', hi: 1.05, fd: 0.0074, st: 0, cl: '#ffc6ae', ex: 1.03 }),
  K(18.4, { el: 1, az: 268, sun: '#ff8f6a', si: 1.3, sky: '#8a83c2', fog: '#d99a9a', hs: '#b9a3c9', hg: '#8f7690', hi: 0.8, fd: 0.0082, st: 0.05, cl: '#e7a5b3', ex: 1.06 }),
  K(19.4, { el: -6, az: 275, sun: '#aab0e0', si: 0.55, sky: '#4c5090', fog: '#696296', hs: '#7f7fb4', hg: '#4c4766', hi: 0.62, fd: 0.0092, st: 0.45, cl: '#8a84b8', ex: 1.12 }),
  K(21.0, { el: -20, az: 290, sun: '#9fb2e6', si: 0.42, sky: '#262c58', fog: '#3a4170', hs: '#56609a', hg: '#2c2c44', hi: 0.5, fd: 0.011, st: 0.9, cl: '#4a4f80', ex: 1.18 }),
  K(25.0, { el: -40, az: 0, sun: '#9fb2e6', si: 0.45, sky: '#1b1f44', fog: '#2b3062', hs: '#4b5590', hg: '#24243a', hi: 0.46, fd: 0.016, st: 1.0, cl: '#33375e', ex: 1.2 }),
  K(28.6, { el: -14, az: 80, sun: '#a7b4e6', si: 0.4, sky: '#2b3270', fog: '#4d4c80', hs: '#6870a8', hg: '#3a3550', hi: 0.5, fd: 0.012, st: 0.6, cl: '#4f5288', ex: 1.18 }),
  K(29.4, { el: -2, az: 92, sun: '#ffb796', si: 0.9, sky: '#7f86c8', fog: '#e8b6b0', hs: '#d9b8c6', hg: '#8a7484', hi: 0.8, fd: 0.008, st: 0.15, cl: '#e0a8b8', ex: 1.08 }),
  K(30.1, { el: 7, az: 100, sun: '#ffd4a0', si: 2.1, sky: '#a9c4ec', fog: '#ffd2b4', hs: '#f3d9d0', hg: '#c9a58f', hi: 1.15, fd: 0.0052, st: 0, cl: '#ffe6d6', ex: 1.0 }),
];
const COLS = ['sun', 'sky', 'fog', 'hs', 'hg', 'cl'], NUMS = ['el', 'az', 'si', 'hi', 'fd', 'st', 'ex'];
KEYS.forEach((k) => COLS.forEach((c) => { k[c] = new THREE.Color(k[c]); }));
// indoor / underground modifiers
const ZONES = {
  indoor: { sun: 0.45, hemi: 1.12, fogMul: 1.3, tint: new THREE.Color('#5a5060'), tintAmt: 0.15 },
  dim: { sun: 0.12, hemi: 0.42, fogMul: 1.6, tint: new THREE.Color('#2a2833'), tintAmt: 0.45 },
  garage: { sun: 0, hemi: 0, fogMul: 0, hs: new THREE.Color('#61686a'), hg: new THREE.Color('#1d2021'), hi: 0.32, fog: new THREE.Color('#1c1f21'), fd: 0.034 },
  underground: { sun: 0, hemi: 0, fogMul: 0, hs: new THREE.Color('#3d7a80'), hg: new THREE.Color('#0f2328'), hi: 0.32, fog: new THREE.Color('#122c35'), fd: 0.03 },
};
const dirFrom = (el, az, v) => { const e = THREE.MathUtils.degToRad(el), a = THREE.MathUtils.degToRad(az); return v.set(Math.cos(e) * Math.sin(a), Math.sin(e), -Math.cos(e) * Math.cos(a)); };
const MOON = dirFrom(42, 150, new THREE.Vector3());

export class TimeOfDay {
  constructor(G) {
    this.G = G; this.hour = 14; this.max = 16.4; this.rate = 1 / 150;
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = true; this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03;
    const sc = this.sun.shadow.camera; sc.left = -36; sc.right = 36; sc.top = 36; sc.bottom = -36; sc.near = 1; sc.far = 190;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.3);
    G.scene.add(this.sun, this.sun.target, this.hemi);
    G.scene.fog = new THREE.FogExp2(0xffffff, 0.005);
    this.cur = {}; COLS.forEach((c) => { this.cur[c] = new THREE.Color(); });
    this.sunDir = new THREE.Vector3(); this.lightDir = new THREE.Vector3(); this._c = new THREE.Color();
    this.zoneKind = null; this.zb = 0; this.override = null;
    G.events.on('quality', (q) => { this.sun.castShadow = q.shadows; this.sun.shadow.mapSize.set(q.sunMap, q.sunMap); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } });
  }
  set(h, force) { this.hour = h; if (force || h > this.max) this.max = h; this.apply(0); }
  range(min, max, rate) { this.min = min; this.max = Math.max(max, min); this.rate = rate || 1 / 150; }
  get clock() { const h = this.hour % 24, hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return [hh, mm]; }
  update(dt, zone) {
    if (this.min !== undefined && this.hour < this.min - 0.01) this.hour = Math.min(this.min, this.hour + Math.max(0.35, (this.min - this.hour) * 0.6) * dt);
    else if (this.hour < this.max) this.hour = Math.min(this.max, this.hour + this.rate * dt);
    const kind = zone && ZONES[zone.kind] ? zone.kind : null;
    if (kind) this.zoneKind = kind;
    this.zb += ((kind ? 1 : 0) - this.zb) * Math.min(1, dt * 2.2);
    this.apply(dt);
  }
  apply() {
    const h = this.hour; let i = 0;
    while (i < KEYS.length - 2 && h > KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    let f = THREE.MathUtils.clamp((h - a.t) / (b.t - a.t), 0, 1); f = f * f * (3 - 2 * f);
    const c = this.cur;
    NUMS.forEach((n) => { c[n] = a[n] + (b[n] - a[n]) * f; });
    COLS.forEach((n) => c[n].copy(a[n]).lerp(b[n], f));
    dirFrom(c.el, c.az, this.sunDir);
    const m = THREE.MathUtils.clamp((-c.el - 2) / 6, 0, 1);
    this.lightDir.copy(this.sunDir).lerp(MOON, m).normalize();
    if (this.lightDir.y < 0.15) { this.lightDir.y = 0.15; this.lightDir.normalize(); }
    // zone blend
    const z = ZONES[this.zoneKind], zb = this.zb, G = this.G, fog = G.scene.fog;
    let si = c.si, hi = c.hi, fd = c.fd;
    const hs = this._hs || (this._hs = new THREE.Color()), hg = this._hg || (this._hg = new THREE.Color());
    hs.copy(c.hs); hg.copy(c.hg); fog.color.copy(c.fog);
    if (z && zb > 0.001) {
      si *= 1 + (z.sun - 1) * zb;
      if (z.hs) { hs.lerp(z.hs, zb); hg.lerp(z.hg, zb); hi += (z.hi - hi) * zb; fog.color.lerp(z.fog, zb); fd += (z.fd - fd) * zb; }
      else { hi *= 1 + (z.hemi - 1) * zb; fd *= 1 + (z.fogMul - 1) * zb; fog.color.lerp(z.tint, z.tintAmt * zb); }
    }
    this.sun.color.copy(c.sun).lerp(this._c.set('#9fb2e6'), m); this.sun.intensity = si;
    this.hemi.color.copy(hs); this.hemi.groundColor.copy(hg); this.hemi.intensity = hi;
    U.uFogDensity.value = fd; fog.density = fd * 0.8;
    const sky = G.world.sky.u;
    sky.uTop.value.copy(c.sky); sky.uHorizon.value.copy(c.fog); sky.uSunDir.value.copy(this.sunDir); sky.uSunColor.value.copy(c.sun);
    sky.uSunVis.value = THREE.MathUtils.clamp((c.el + 3) / 5, 0, 1); sky.uMoonDir.value.copy(MOON); sky.uMoonVis.value = m; sky.uStars.value = c.st;
    G.world.sky.cloudMat.color.copy(c.cl);
    G.renderer.toneMappingExposure = c.ex;
    const bc = G.world.beacon; if (bc) bc.halo.material.opacity = 0.2 + c.st * 0.5;
    this.night = c.st;
  }
  followShadow(center) {
    const L = this.sun, d = this.lightDir, size = this.sun.shadow.mapSize.x || 1024, tex = 72 / size;
    const right = this._r || (this._r = new THREE.Vector3()), up = this._u || (this._u = new THREE.Vector3()), p = this._p || (this._p = new THREE.Vector3());
    right.crossVectors(d, THREE.Object3D.DEFAULT_UP); if (right.lengthSq() < 1e-4) right.set(1, 0, 0); right.normalize(); up.crossVectors(right, d).normalize();
    const r = center.dot(right), u = center.dot(up);
    p.copy(center).addScaledVector(right, Math.round(r / tex) * tex - r).addScaledVector(up, Math.round(u / tex) * tex - u);
    L.position.copy(p).addScaledVector(d, 90); L.target.position.copy(p); L.target.updateMatrixWorld();
  }
}
