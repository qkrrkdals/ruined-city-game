// Puzzles. Hints live in the world; wrong answers make noise (sparks, buzzers) that draws Remnants.
//  P2 gate: the gate's power-box label says "B-3"; the garage cabinet holds six fuses in a labelled grid.
//  P3 station office keypad: Haram's birthday, found on the right print in the photo studio (0314).
//  P6 Control Core: the stopped time (2147, or 0947).
//  P4 power panel, P5 generator start-up, P5b alarm clock: see puzzles2.js. States live in story.flags.
import * as THREE from 'three';
import { Geo } from '../world/geo.js';
import { makeSign, dotTexture } from '../world/textures.js';
import { t } from '../i18n/i18n.js';
import { buildPanel, restorePanel, buildGenerator, restoreGenerator, buildAlarm, updateAlarm } from './puzzles2.js';

const ease = (x) => x * x * (3 - 2 * x);
const SPARK_N = 16;

export class Puzzles {
  constructor(G) {
    this.G = G; this.anims = [];
    this.M = G.world.M.world;
    this.fuseMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9ff0e0').multiplyScalar(1.5) });
    this.offMat = new THREE.MeshBasicMaterial({ color: '#5a2b2b' }); this.onMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#8ff0a0').multiplyScalar(1.8) });
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARK_N * 3), 3));
    this.sparks = new THREE.Points(sg, new THREE.PointsMaterial({ map: dotTexture(), size: 0.07, color: new THREE.Color('#ffd27a').multiplyScalar(2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.sparks.visible = false; this.sparks.frustumCulled = false; G.scene.add(this.sparks); this.sparkVel = [];
    this.warm = [this.sparks];
    this.buildGate(); this.buildOffice(); buildPanel(this); buildGenerator(this); buildAlarm(this); this.buildCore();
  }
  get story() { return this.G.story; }
  get flags() { return this.G.story.flags; }
  A(id) { return this.G.world.anchors.get(id).pos; }
  anim(dur, fn, done) { this.anims.push({ t: 0, dur, fn, done }); }
  update(dt) {
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i]; a.t += dt; const f = Math.min(1, a.t / a.dur); a.fn(ease(f), f);
      if (f >= 1) { this.anims.splice(i, 1); if (a.done) a.done(); }
    }
    updateAlarm(this, dt);
  }
  mesh(geo, at) { const m = new THREE.Mesh(geo.build(), this.M); m.castShadow = true; m.position.copy(at); this.G.scene.add(m); return m; }
  smallFuse(at) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.18, 8), this.fuseMat); m.position.copy(at); this.G.scene.add(m); return m; }
  // sparks + crackle + noise: the cost of a wrong guess
  spark(at, noise = 22) {
    const P = this.sparks, arr = P.geometry.attributes.position.array, v = this.sparkVel;
    P.position.copy(at); P.visible = true;
    for (let i = 0; i < SPARK_N; i++) v[i] = new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3);
    this.anim(0.55, (k, f) => {
      for (let i = 0; i < SPARK_N; i++) { arr[i * 3] = v[i].x * f * 0.5; arr[i * 3 + 1] = v[i].y * f * 0.5 - 2.4 * f * f; arr[i * 3 + 2] = v[i].z * f * 0.5; }
      P.geometry.attributes.position.needsUpdate = true; P.material.opacity = 1 - f;
    }, () => { P.visible = false; });
    this.G.audio.play('spark'); this.G.remnants.noise(at, noise);
  }

  // ---- P2: gate
  buildGate() {
    const G = this.G, g = new Geo(Math.random);
    g.box(-5.9, 1.7, 0, 0.16, 3.4, 0.16, '#6f6a78'); g.box(5.9, 1.7, 0, 0.16, 3.4, 0.16, '#6f6a78'); g.box(0, 3.35, 0, 12, 0.14, 0.16, '#6f6a78'); g.box(0, 0.08, 0, 12, 0.14, 0.16, '#6f6a78'); g.box(0, 1.7, 0, 12, 0.1, 0.12, '#6f6a78');
    this.gate = this.mesh(g, this.A('gate_r1'));
    const chain = makeSign({ kind: 'chain', x: 0, y: 1.7, z: 0, w: 11.8, h: 3.2, pw: 64, ph: 64 }, G.world); this.gate.add(chain);
    const sign = makeSign({ kind: 'banner', key: 'signs.restricted', x: 0, y: 2.2, z: 0.12, w: 3.4, h: 0.8, bg: '#c9625a', bg2: '#d98a6a' }, G.world); this.gate.add(sign);
    const box = this.A('gatebox_r1');
    G.interact.add({ id: 'gatebox', pos: box, r: 0.35, verb: 'examine', name: 'items.gatebox', accepts: 'fuse', enabled: () => !this.flags.gateOpen,
      onUse: () => { G.ui.toast(t('puz.gateNoFuse')); this.story.addThought('t_gatebox'); this.story.advanceTo('fuse_r1'); },
      onInsert: (p) => {
        if (p.code === 'b3') { G.props.remove(p); this.openGate(true); return; }
        G.props.drop(); this.spark(box); G.ui.toast(t('puz.wrongFuse')); this.story.addThought('t_wrongfuse');
      } });
  }
  openGate(animate) {
    const G = this.G, f = this.flags; f.gateOpen = true;
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
    G.interact.add({ id: 'keypad_office', pos: this.A('keypad_office'), r: 0.25, verb: 'enter', name: 'items.keypad', enabled: () => !this.flags.officeOpen,
      onUse: () => G.panels.openKeypad({ title: t('puz.keypadOffice'), codes: ['0314'], onOk: () => this.openOffice(true), onFail: () => G.remnants.noise(this.door.position, 18) }) });
  }
  openOffice(animate) {
    const G = this.G; this.flags.officeOpen = true;
    G.world.col.setDyn('door_office', null);
    const x0 = this.door.position.x;
    if (animate) { G.ui.toast(t('puz.doorOpen')); G.events.emit('doorOpen'); this.anim(1.4, (k) => { this.door.position.x = x0 - 2.05 * k; }); this.story.addThought('t_code'); }
    else this.door.position.x = x0 - 2.05;
    this.story.advanceTo('fuses_u');
  }
  // ---- P6: Control Core
  buildCore() {
    const G = this.G;
    G.interact.add({ id: 'core', pos: this.A('core'), r: 0.4, verb: 'use', name: 'items.core', enabled: () => !this.flags.coreDone,
      onUse: () => {
        const pad = () => G.panels.openKeypad({ title: t('puz.keypadCore'), codes: ['2147', '0947'], onOk: () => { this.flags.coreDone = true; G.ending.start(); }, onFail: () => G.audio.play('keyFail') });
        if (!this.story.notes.has('n_r3_final')) this.story.read('n_r3_final', () => setTimeout(pad, 50)); else pad();
      } });
  }
  restore(f) {
    if (f.gateOpen) this.openGate(false);
    if (f.officeOpen) this.openOffice(false);
    restorePanel(this, f);
    restoreGenerator(this, f);
  }
}
