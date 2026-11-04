// Story state: steps (a vague direction for the journal), found notes & observations, the journal's
// "what I know" entries (thoughts), position triggers. No timed hints: clues live in the world.
import * as THREE from 'three';
import { t } from '../i18n/i18n.js';
import { NOTES, OBS, STEPS, noteAnchor, obsAnchor } from './content.js';

export class Story {
  constructor(G) {
    this.G = G; this.step = 0; this.flags = {}; this.notes = new Set(); this.obs = new Set(); this.thoughts = []; this.fails = {};
    this.paperMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2d6').multiplyScalar(1.12) });
    this.paperGeo = new THREE.BoxGeometry(0.21, 0.006, 0.29);
    this.meshes = {};
    for (const n of NOTES) this.addNote(n);
    for (const o of OBS) this.addObs(o);
  }
  get cur() { return STEPS[this.step]; }
  addNote(n) {
    const a = this.G.world.anchors.get(noteAnchor(n.id));
    if (!a) { console.warn('missing note anchor', n.id); return; }
    if (!n.noMesh) {
      const m = new THREE.Mesh(this.paperGeo, this.paperMat); m.position.copy(a.pos);
      if (n.wall !== undefined) m.rotation.set(Math.PI / 2, n.wall, 0, 'YXZ'); else m.rotation.y = (Math.random() - 0.5) * 0.7;
      this.G.scene.add(m); this.meshes[n.id] = m;
    }
    this.G.interact.add({ id: n.id, pos: a.pos, r: 0.3, verb: 'read', name: `notes.${n.id}.title`, onUse: () => this.read(n.id) });
  }
  addObs(o) {
    const a = this.G.world.anchors.get(obsAnchor(o.id));
    if (!a) { console.warn('missing obs anchor', o.id); return; }
    this.G.interact.add({ id: o.id, pos: a.pos, r: 0.45, range: 3.2, verb: 'examine', name: `obs.${o.id}.title`, onUse: () => this.examine(o.id) });
  }
  read(id, after) {
    const first = !this.notes.has(id);
    this.notes.add(id);
    this.G.panels.openDoc('note', id, () => { if (first) this.onFirst(NOTES.find((n) => n.id === id)); if (after) after(); });
    if (first) this.G.events.emit('noteRead', id);
  }
  examine(id) {
    const first = !this.obs.has(id);
    this.obs.add(id);
    this.G.panels.openDoc('obs', id, () => { if (first) this.onFirst(OBS.find((o) => o.id === id)); });
  }
  onFirst(item) {
    if (!item) return;
    if (item.thought) this.addThought(item.thought);
    if (item.id === 'n_r1_table') this.advanceTo('flashlight');
    if (item.id === 'o_gate_sign') this.advanceTo('fuse_r1');
  }
  // new journal entry: no pop-up text, just a pen sound and the journal icon pulsing
  addThought(id) {
    if (this.thoughts.includes(id)) return;
    this.thoughts.push(id); this.G.ui.journalPulse();
    this.G.events.emit('thought', id);
  }
  stepIndex(id) { return STEPS.findIndex((s) => s.id === id); }
  advanceTo(id) { const i = this.stepIndex(id); if (i > this.step) { this.step = i; this.enterStep(); } }
  enterStep() {
    const s = this.cur;
    this.G.time.range(s.time[0], s.time[1]);
    this.G.events.emit('step', s.id);
  }
  dirText() { const s = this.cur; return s.dir ? t('dir.' + s.dir) : ''; }
  update() {
    const G = this.G, p = G.player.feet, s = this.cur.id;
    if (s === 'gate' && p.z < 136 && Math.abs(p.x) < 18 && p.y > -1) this.advanceTo('fuse_r1');
    if (this.flags.gateOpen && this.step < this.stepIndex('office') && p.y < -2 && p.z < 70) this.advanceTo('office');
    if (this.flags.shutterOpen && this.step < this.stepIndex('tower') && p.y < -2 && p.z < -64) this.advanceTo('tower');
    if (s === 'tower' && p.y > -1 && p.z < -140 && p.z > -160 && Math.abs(p.x) < 15) this.advanceTo('generator');
    if (s === 'climb' && p.y > 23 && Math.abs(p.x) < 7 && p.z < -159 && p.z > -173) this.advanceTo('core');
    if (this.step >= this.stepIndex('tower') && p.z < -40 && p.y > -1) this.addThought('t_center');
  }
  serialize() { return { step: this.step, flags: this.flags, notes: [...this.notes], obs: [...this.obs], thoughts: this.thoughts, fails: this.fails }; }
  restore(d) {
    if (!d) return;
    this.step = d.step || 0; this.flags = d.flags || {}; this.notes = new Set(d.notes || []); this.obs = new Set(d.obs || []); this.thoughts = d.thoughts || []; this.fails = d.fails || {};
    this.enterStep();
  }
  debugState() { return { step: this.cur.id, flags: { ...this.flags }, notes: this.notes.size, obs: this.obs.size }; }
}
