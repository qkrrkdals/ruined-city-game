// Flashlight + battery. Drains while on; flickers when low; at 0 it flickers and dies.
import * as THREE from 'three';
import { CFG } from '../core/config.js';
import { t } from '../i18n/i18n.js';

export class Flashlight {
  constructor(G) {
    this.G = G; this.has = false; this.on = false; this.level = 1; this.dying = 0; this.flick = 1; this.lowT = 0;
    const s = (this.spot = new THREE.SpotLight('#fff0d4', 0, 34, 0.5, 0.55, 1.25));
    s.position.set(0.22, -0.18, 0.05); s.target.position.set(0.05, -0.1, -6);
    s.shadow.camera.near = 0.3; s.shadow.camera.far = 30; s.shadow.bias = -0.0006; s.shadow.normalBias = 0.02;
    this.fill = new THREE.PointLight('#ffe8c8', 0, 7, 1.5);
    G.camera.add(s, s.target, this.fill);
    this.base = 46;
    G.events.on('quality', (q) => { s.castShadow = q.flashShadow; s.shadow.mapSize.set(q.flashMap, q.flashMap); if (s.shadow.map) { s.shadow.map.dispose(); s.shadow.map = null; } });
    G.events.on('key', (code) => { if (code === 'KeyF' && G.state === 'playing' && G.player.enabled) this.toggle(); });
  }
  give() { this.has = true; this.G.events.emit('flashlightGet'); }
  toggle(force) {
    if (!this.has) return;
    const want = force ?? !this.on;
    if (want && this.level <= 0.001) { this.G.events.emit('flashlightClick', false); this.G.ui.toast(t('hud.batteryEmpty')); this.dying = 0.35; return; }
    this.on = want; this.G.events.emit('flashlightClick', want);
  }
  add(amount) { this.level = Math.min(1, this.level + amount); }
  get lit() { return this.on && this.level > 0 && this.flick > 0.35; }
  update(dt) {
    const G = this.G;
    if (this.on) {
      this.level = Math.max(0, this.level - dt / CFG.battery.full);
      if (this.level <= 0 && this.dying <= 0) this.dying = 1.3;
    }
    let f = 1;
    if (this.dying > 0) {
      this.dying -= dt;
      f = Math.random() < 0.5 ? 0.1 : 0.9;
      G.ui.flicker(f < 0.5 ? 0.18 : 0);
      if (this.dying <= 0) { this.on = false; G.ui.flicker(0); G.events.emit('flashlightDead'); }
    } else if (this.on && this.level < CFG.battery.low) {
      this.lowT -= dt;
      if (this.lowT <= 0) { this.lowT = 0.6 + Math.random() * 2.4; this.dip = 0.25; }
      if (this.dip > 0) { this.dip -= dt; f = Math.random() < 0.5 ? 0.2 : 1; }
    }
    this.flick = f;
    const target = this.on ? this.base * f * (0.75 + 0.25 * Math.min(1, this.level * 4)) : 0;
    this.spot.intensity += (target - this.spot.intensity) * Math.min(1, dt * 30);
    this.fill.intensity = this.spot.intensity / this.base * 1.6;
    G.ui.battery(this.level, this.has, this.on);
  }
}
