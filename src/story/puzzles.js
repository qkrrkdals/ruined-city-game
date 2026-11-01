// Puzzles P2–P6: quarantine gate (fuse), office keypad (0314), power panel (2 fuses) + shutter,
// generator (fuse) + tower door, Control Core (2147). States live in story.flags so saves restore them.
import * as THREE from 'three';
import { Geo } from '../world/geo.js';
import { makeSign } from '../world/textures.js';
import { t } from '../i18n/i18n.js';

const ease = (x) => x * x * (3 - 2 * x);

export class Puzzles {
  constructor(G) {
    this.G = G; this.anims = [];
    this.M = G.world.M.world;
    this.fuseMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9ff0e0').multiplyScalar(1.5) });
    this.offMat = new THREE.MeshBasicMaterial({ color: '#5a2b2b' }); this.onMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#8ff0a0').multiplyScalar(1.8) });
    this.buildGate(); this.buildOffice(); this.buildPanel(); this.buildTower(); this.buildCore();
  }
  get story() { return this.G.story; }
  A(id) { return this.G.world.anchors.get(id).pos; }
  anim(dur, fn, done) { this.anims.push({ t: 0, dur, fn, done }); }
  update(dt) {
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i]; a.t += dt; const f = Math.min(1, a.t / a.dur); a.fn(ease(f));
      if (f >= 1) { this.anims.splice(i, 1); if (a.done) a.done(); }
    }
  }
  mesh(geo, at) { const m = new THREE.Mesh(geo.build(), this.M); m.castShadow = true; m.position.copy(at); this.G.scene.add(m); return m; }
  smallFuse(at) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.18, 8), this.fuseMat); m.position.copy(at); this.G.scene.add(m); return m; }

  // ---- P2: gate
  buildGate() {
    const G = this.G, g = new Geo(Math.random);
    g.box(-5.9, 1.7, 0, 0.16, 3.4, 0.16, '#6f6a78'); g.box(5.9, 1.7, 0, 0.16, 3.4, 0.16, '#6f6a78'); g.box(0, 3.35, 0, 12, 0.14, 0.16, '#6f6a78'); g.box(0, 0.08, 0, 12, 0.14, 0.16, '#6f6a78'); g.box(0, 1.7, 0, 12, 0.1, 0.12, '#6f6a78');
    this.gate = this.mesh(g, this.A('gate_r1'));
    const chain = makeSign({ kind: 'chain', x: 0, y: 1.7, z: 0, w: 11.8, h: 3.2, pw: 64, ph: 64 }, G.world); this.gate.add(chain);
    const sign = makeSign({ kind: 'banner', key: 'signs.restricted', x: 0, y: 2.2, z: 0.12, w: 3.4, h: 0.8, bg: '#c9625a', bg2: '#d98a6a' }, G.world); this.gate.add(sign);
    G.interact.add({ id: 'gatebox', pos: this.A('gatebox_r1'), r: 0.35, verb: 'examine', name: 'items.gatebox', accepts: 'fuse', enabled: () => !this.story.flags.gateOpen,
      onUse: () => { G.ui.toast(t('puz.gateNoFuse')); this.story.advanceTo('fuse_r1'); },
      onInsert: (p) => { G.props.remove(p); this.openGate(true); } });
  }
  openGate(animate) {
    const G = this.G, f = this.story.flags; f.gateOpen = true;
    G.world.col.setDyn('gate_r1', null);
    this.smallFuse(this.A('gatebox_r1')).rotation.z = Math.PI / 2;
    const x0 = this.gate.position.x;
    if (animate) {
      G.ui.toast(t('puz.gateOpen')); G.events.emit('gateOpen'); G.remnants.noise(this.gate.position, 25);
      this.anim(4.5, (k) => { this.gate.position.x = x0 + 12.5 * k; });
      this.story.addThought('t_gate');
    } else this.gate.position.x = x0 + 12.5;
    this.story.advanceTo('cross');
  }
  // ---- P3: office keypad
  buildOffice() {
    const G = this.G, Y = -7, g = new Geo(Math.random);
    g.box(0, 0, 0, 2.0, 2.2, 0.12, '#5f8f8a'); g.box(0.75, 0, 0.07, 0.08, 0.3, 0.05, '#c9c4cf'); g.panel(0, 0.6, 0.065, 1.4, 0.5, 0, '#cde7e0');
    this.door = this.mesh(g, new THREE.Vector3(-44, Y + 1.1, 48));
    const kp = new Geo(Math.random); kp.box(0, 0, 0, 0.22, 0.3, 0.06, '#3f4a5a'); kp.panel(0, 0.06, -0.031, 0.16, 0.06, Math.PI, '#8ff0c8');
    this.mesh(kp, this.A('keypad_office'));
    G.interact.add({ id: 'keypad_office', pos: this.A('keypad_office'), r: 0.25, verb: 'enter', name: 'items.keypad', enabled: () => !this.story.flags.officeOpen,
      onUse: () => G.panels.openKeypad({ title: t('puz.keypadOffice'), codes: ['0314'], onOk: () => this.openOffice(true), onFail: () => this.story.fail('office') }) });
  }
  openOffice(animate) {
    const G = this.G; this.story.flags.officeOpen = true;
    G.world.col.setDyn('door_office', null);
    const x0 = this.door.position.x;
    if (animate) { G.ui.toast(t('puz.doorOpen')); G.events.emit('doorOpen'); this.anim(1.4, (k) => { this.door.position.x = x0 - 2.05 * k; }); this.story.addThought('t_code'); }
    else this.door.position.x = x0 - 2.05;
    this.story.advanceTo('fuses_u');
  }
  // ---- P4: power panel (2 fuses) -> shutter
  buildPanel() {
    const G = this.G, Y = -7, g = new Geo(Math.random);
    for (let y = 0.15; y < 4.4; y += 0.3) g.box(0, y, 0, 20, 0.26, 0.12, y % 0.6 < 0.3 ? '#8d99a6' : '#7c8794');
    g.box(0, 4.3, -0.1, 20.4, 0.3, 0.4, '#5f6a76');
    this.shutter = this.mesh(g, new THREE.Vector3(-58, Y, 0.1));
    this.lamps = [];
    for (const i of [1, 2]) {
      const at = this.A('socket_u_' + i), lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), this.offMat);
      lamp.position.set(at.x - 0.02, at.y + 0.42, at.z); G.scene.add(lamp); this.lamps.push(lamp);
      G.interact.add({ id: 'socket_u_' + i, pos: at, r: 0.22, verb: 'examine', name: 'items.panel', accepts: 'fuse', enabled: () => !this.story.flags['sock' + i] && this.story.flags.officeOpen,
        onUse: () => G.ui.toast(t('obj.fuses_u')),
        onInsert: (p) => { G.props.remove(p); this.fillSocket(i, true); } });
    }
  }
  fillSocket(i, animate) {
    const G = this.G, f = this.story.flags; f['sock' + i] = true;
    const at = this.A('socket_u_' + i); this.smallFuse(at);
    this.lamps[i - 1].material = this.onMat;
    if (f.sock1 && f.sock2) this.openShutter(animate);
    else if (animate) { G.ui.toast(t('puz.panelHalf')); G.events.emit('socket'); }
  }
  openShutter(animate) {
    const G = this.G; this.story.flags.shutterOpen = true;
    G.world.col.setDyn('shutter_u', null);
    const y0 = this.shutter.position.y;
    if (animate) { G.ui.toast(t('puz.panelFull')); G.events.emit('shutterOpen'); G.remnants.noise(this.shutter.position, 30); this.anim(5, (k) => { this.shutter.position.y = y0 + 4.1 * k; }); }
    else this.shutter.position.y = y0 + 4.1;
    this.story.advanceTo('tunnel');
  }
  // ---- P5: generator -> tower door
  buildTower() {
    const G = this.G, g = new Geo(Math.random);
    g.box(0, 1.5, 0, 2.8, 3, 0.2, '#6d6a86'); for (const x of [-0.7, 0.7]) g.box(x, 1.5, 0.12, 1.25, 2.8, 0.04, '#7f7c98'); g.box(0, 1.4, 0.16, 0.1, 0.4, 0.05, '#c9c0d4');
    this.towerDoor = this.mesh(g, new THREE.Vector3(0, 0, -159.55));
    G.interact.add({ id: 'tower_door', pos: new THREE.Vector3(0, 1.4, -159.3), r: 0.6, verb: 'examine', name: 'items.towerDoor', enabled: () => !this.story.flags.towerOpen,
      onUse: () => { G.ui.toast(t('puz.towerLocked')); this.story.advanceTo('generator'); } });
    const at = this.A('socket_gen');
    this.genLamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), this.offMat); this.genLamp.position.set(at.x, at.y + 0.5, at.z + 0.05); G.scene.add(this.genLamp);
    G.interact.add({ id: 'socket_gen', pos: at, r: 0.3, verb: 'examine', name: 'items.generator', accepts: 'fuse', enabled: () => !this.story.flags.towerOpen,
      onUse: () => G.ui.toast(t('obj.generator_h')), onInsert: (p) => { G.props.remove(p); this.startGenerator(true); } });
  }
  startGenerator(animate) {
    const G = this.G; this.story.flags.towerOpen = true;
    this.smallFuse(this.A('socket_gen')); this.genLamp.material = this.onMat;
    G.world.col.setDyn('tower_door', null);
    const y0 = this.towerDoor.position.y;
    for (const lv of [0, 8, 16, 24]) G.lights.add({ pos: [0, lv + 3.6, -166], intensity: 5, distance: 10, color: '#ffd9a0' });
    if (animate) { G.ui.toast(t('puz.generatorOn')); G.events.emit('generatorOn'); this.anim(3, (k) => { this.towerDoor.position.y = y0 + 3.05 * k; }); }
    else this.towerDoor.position.y = y0 + 3.05;
    this.story.advanceTo('climb');
  }
  // ---- P6: Control Core
  buildCore() {
    const G = this.G;
    G.interact.add({ id: 'core', pos: this.A('core'), r: 0.4, verb: 'use', name: 'items.core', enabled: () => !this.story.flags.coreDone,
      onUse: () => {
        const pad = () => G.panels.openKeypad({ title: t('puz.keypadCore'), codes: ['2147', '0947'], onOk: () => { this.story.flags.coreDone = true; G.ending.start(); }, onFail: () => this.story.fail('core') });
        if (!this.story.notes.has('n_r3_final')) this.story.read('n_r3_final', () => setTimeout(pad, 50)); else pad();
      } });
  }
  restore(f) {
    if (f.gateOpen) this.openGate(false);
    if (f.officeOpen) this.openOffice(false);
    for (const i of [1, 2]) if (f['sock' + i]) { f['sock' + i] = false; this.fillSocket(i, false); }
    if (f.towerOpen) this.startGenerator(false);
  }
}
