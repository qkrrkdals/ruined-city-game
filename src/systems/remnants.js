// Remnant manager: nav grids, spawns/activation, noise events, threat feedback (screen edge), catching.
import * as THREE from 'three';
import { NavGrid } from './navgrid.js';
import { Remnant } from './remnant.js';
import { CFG } from '../core/config.js';
import { t } from '../i18n/i18n.js';

const SPAWNS = [
  { id: 'garage', anchor: 'remnant_garage', nav: 'garage', speed: 0.8, percept: 0.7, chase: 3.0 },
  { id: 'r2_cer', anchor: 'rem_r2_cer', nav: 'surface', night: true },
  { id: 'r2_ave', anchor: 'rem_r2_ave', nav: 'surface', night: true },
  { id: 'mall', anchor: 'rem_mall', nav: 'surface' },
  { id: 'arc_w', anchor: 'rem_arc_w', nav: 'under' },
  { id: 'arc_e', anchor: 'rem_arc_e', nav: 'under' },
  { id: 'store', anchor: 'rem_store', nav: 'under', speed: 0.9 },
  { id: 'tunnel', anchor: 'rem_tunnel', nav: 'under' },
  { id: 'plaza_w', anchor: 'rem_plaza_w', nav: 'surface' },
  { id: 'plaza_e', anchor: 'rem_plaza_e', nav: 'surface' },
  { id: 'inst_lobby', anchor: 'rem_inst_lobby', nav: 'surface' },
  { id: 'inst_wing', anchor: 'rem_inst_wing', nav: 'surface' },
  { id: 'tower16', anchor: 'rem_tower16', nav: 'tower16', speed: 0.9 },
];
const _p = new THREE.Vector3();

export class Remnants {
  constructor(G) {
    this.G = G; this.list = []; this.noises = []; this.threat = 0; this.catching = false; this.disabled = false;
    const boxes = G.world.col.boxes;
    this.navs = {
      surface: new NavGrid(-80, -190, 80, 266, 0, 1).build(boxes),
      under: new NavGrid(-70, -92, 45, 62, -7, 1).build(boxes),
      garage: new NavGrid(16, 124, 48, 148, -3.8, 0.5).build(boxes),
      tower16: new NavGrid(-6.5, -172.5, 6.5, -159.5, 16, 0.5).build(boxes),
    };
    for (const s of SPAWNS) {
      const a = G.world.anchors.get(s.anchor);
      if (!a) continue;
      this.list.push(new Remnant(this, { ...s, x: a.pos.x, y: a.pos.y, z: a.pos.z, zone: a.zone, nav: a.nav || s.nav }));
    }
    G.events.on('footstep', (mode, feet) => { const surf = G.world.surfaceAt(feet), k = surf === 'metal' || surf === 'water' ? 1.3 : surf === 'grass' ? 0.8 : 1; this.noise(feet, CFG.noise[mode] * k); });
    G.events.on('land', (v, feet) => this.noise(feet, CFG.noise.land));
    G.events.on('impact', (p, speed) => this.noise(p.pos, p.breakable ? CFG.noise.impact : p.crate ? 8 : 12 * Math.min(1, speed / 6)));
    G.events.on('break', (p) => this.noise(p.pos, CFG.noise.impact));
  }
  shelters() { return this.G.shelters ? this.G.shelters.list : []; }
  playerSheltered() { return !!(this.G.shelters && this.G.shelters.inside); }
  inTallGrass(p) { const tg = this.G.world.tallAt; return tg ? tg(p) : false; }
  noise(pos, r) { this.noises.push({ pos: pos.clone ? pos.clone() : new THREE.Vector3(pos.x, pos.y, pos.z), r }); }
  isActive(r) {
    if (this.disabled) return false;
    const G = this.G, s = r.spec, P = G.player.feet;
    if (s.night && G.time.hour < 19.1) return false;
    if (s.when && !s.when(G)) return false;
    const z = r.zone, cx = (z[0] + z[2]) / 2, cz = (z[1] + z[3]) / 2;
    return Math.abs(P.y - r.floorY) < 4.2 && Math.hypot(P.x - cx, P.z - cz) < 75;
  }
  resetAll() { for (const r of this.list) r.reset(); this.noises.length = 0; }
  catchPlayer() {
    if (this.catching) return;
    this.catching = true;
    const G = this.G;
    G.events.emit('caught');
    G.player.enabled = false; G.player.lookEnabled = false;
    G.ui.fade(true, false, 700).then(() => {
      G.props.returnCarried();
      G.shelters.respawnPlayer();
      G.flashlight.on = false; G.flashlight.level = Math.max(G.flashlight.level, CFG.battery.respawn);
      this.resetAll();
      setTimeout(() => {
        G.player.enabled = true; G.player.lookEnabled = true; this.catching = false;
        G.ui.fade(false, false, 1400); G.ui.toast(t('hud.caught'));
        G.events.emit('respawned');
      }, 700);
    });
  }
  update(dt) {
    const G = this.G, noises = this.noises.splice(0);
    let best = 0, bx = 0.5, by = 0.5;
    for (const r of this.list) {
      const on = this.isActive(r);
      r.setEnabled(on);
      if (!on) continue;
      if (!this.catching) r.update(dt, noises); else r.render(dt);
      const d = r.dist;
      let lv = 0;
      if (r.state === 'chase') lv = 0.75 + 0.25 * Math.max(0, 1 - d / 20);
      else if (r.state === 'notice') lv = 0.8;
      else if (r.state === 'investigate') lv = 0.25 + 0.3 * Math.max(0, 1 - d / 18);
      else if (d < 14) lv = 0.3 * (1 - d / 14);
      if (lv > best) {
        best = lv;
        _p.set(r.pos.x, r.floorY + 1.2, r.pos.z).project(G.camera);
        const behind = _p.z > 1;
        bx = THREE.MathUtils.clamp((behind ? -_p.x : _p.x) * 0.5 + 0.5, 0, 1); by = THREE.MathUtils.clamp(-_p.y * 0.5 + 0.5, 0, 1);
        if (behind) by = 0.85;
      }
    }
    this.threat += (best - this.threat) * Math.min(1, dt * 3);
    G.ui.threat(this.threat * 0.8, bx, by);
  }
}
