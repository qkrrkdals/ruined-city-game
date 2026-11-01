// Story state: steps/objectives, found notes & observations, journal thoughts, hints, position triggers.
import * as THREE from 'three';
import { t } from '../i18n/i18n.js';
import { NOTES, OBS, STEPS, noteAnchor, obsAnchor } from './content.js';

export class Story {
  constructor(G) {
    this.G = G; this.step = 0; this.flags = {}; this.notes = new Set(); this.obs = new Set(); this.thoughts = []; this.hint = 0; this.stepTime = 0; this.fails = {};
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
    if (item.id === 'o_bridge' && this.step >= 4) this.hint = Math.max(this.hint, 1);
  }
  addThought(id) {
    if (this.thoughts.includes(id)) return;
    this.thoughts.push(id); this.G.ui.toast(t('journal.newEntry'));
    this.G.events.emit('thought', id);
  }
  stepIndex(id) { return STEPS.findIndex((s) => s.id === id); }
  advanceTo(id) { const i = this.stepIndex(id); if (i > this.step) { this.step = i; this.enterStep(true); } }
  enterStep(announce) {
    const s = this.cur; this.stepTime = 0; this.hint = 0;
    this.G.time.range(s.time[0], s.time[1]);
    if (announce && s.obj) this.G.ui.objective(this.objectiveText());
    this.G.events.emit('step', s.id);
  }
  objectiveText() {
    const s = this.cur; if (!s.obj) return '';
    let txt = t('obj.' + s.obj);
    if (s.id === 'office' && (this.fails.office || 0) >= 2) txt += ' — ' + t('obj.office_h2');
    else if (this.hint > 0) { const h = t('obj.' + s.obj + '_h'); if (h !== 'obj.' + s.obj + '_h') txt += ' — ' + h; }
    return txt;
  }
  hintText() { const h = t('obj.' + this.cur.obj + '_h'); return this.hint > 0 && h !== 'obj.' + this.cur.obj + '_h' ? h : ''; }
  fail(key) { this.fails[key] = (this.fails[key] || 0) + 1; if (this.fails[key] >= 2) { this.hint = 2; this.G.ui.objective(this.objectiveText()); } }
  update(dt) {
    const G = this.G, p = G.player.feet, s = this.cur.id;
    this.stepTime += dt;
    if (s === 'gate' && p.z < 136 && Math.abs(p.x) < 18 && p.y > -1) this.advanceTo('fuse_r1');
    if (this.flags.gateOpen && this.step < this.stepIndex('office') && p.y < -2 && p.z < 70) this.advanceTo('office');
    if (this.flags.shutterOpen && this.step < this.stepIndex('tower') && p.y < -2 && p.z < -64) this.advanceTo('tower');
    if (s === 'tower' && p.y > -1 && p.z < -140 && p.z > -160 && Math.abs(p.x) < 15) this.advanceTo('generator');
    if (s === 'climb' && p.y > 23 && Math.abs(p.x) < 7 && p.z < -159 && p.z > -173) this.advanceTo('core');
    if (this.step >= this.stepIndex('tower') && p.z < -40 && p.y > -1) this.addThought('t_center');
    const hk = 'obj.' + this.cur.obj + '_h';
    if (this.hint === 0 && this.stepTime > 150 && this.cur.obj && t(hk) !== hk) { this.hint = 1; G.ui.objective(this.objectiveText()); }
  }
  serialize() { return { step: this.step, flags: this.flags, notes: [...this.notes], obs: [...this.obs], thoughts: this.thoughts, fails: this.fails }; }
  restore(d) {
    if (!d) return;
    this.step = d.step || 0; this.flags = d.flags || {}; this.notes = new Set(d.notes || []); this.obs = new Set(d.obs || []); this.thoughts = d.thoughts || []; this.fails = d.fails || {};
    this.enterStep(false);
  }
  debugState() { return { step: this.cur.id, flags: { ...this.flags }, notes: this.notes.size, obs: this.obs.size }; }
}
