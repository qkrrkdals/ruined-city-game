// P4 station power panel, P5 generator start-up + tower door, P5b wind-up alarm clock.
import * as THREE from 'three';
import { Geo } from '../world/geo.js';
import { t } from '../i18n/i18n.js';

const SLOTS = ['a', 'b', 'c', 'd'];

// ---- P4: four slots (A lights, B shutter motor, C shutter lock, D ventilation). Fuses can be pulled out
// again. Only one spare fuse exists, so the one lighting the concourse (A) has to be moved: B + C opens the
// shutter. Ventilation (D) starts a loud fan.
export function buildPanel(P) {
  const G = P.G, Y = -7, g = new Geo(Math.random);
  for (let y = 0.15; y < 4.4; y += 0.3) g.box(0, y, 0, 20, 0.26, 0.12, y % 0.6 < 0.3 ? '#8d99a6' : '#7c8794');
  g.box(0, 4.3, -0.1, 20.4, 0.3, 0.4, '#5f6a76');
  P.shutter = P.mesh(g, new THREE.Vector3(-58, Y, 0.1));
  P.slot = {};
  for (const l of SLOTS) {
    const at = P.A('slot_' + l), lamp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), P.offMat), fuse = P.smallFuse(at);
    lamp.position.set(at.x - 0.02, at.y + 0.3, at.z); G.scene.add(lamp); fuse.rotation.z = Math.PI / 2; fuse.visible = false;
    P.slot[l] = { at, lamp, fuse };
    const busy = () => P.flags.shutterOpen;
    G.interact.add({ id: 'slot_' + l, pos: at, r: 0.15, verb: 'examine', name: 'items.slot_' + l, accepts: 'fuse', enabled: () => !busy() && !slots(P)[l],
      onUse: () => { G.ui.toast(t('puz.slotEmpty')); P.story.addThought('t_panel'); }, onInsert: (p) => fillSlot(P, l, p, true) });
    G.interact.add({ id: 'pull_' + l, pos: at, r: 0.15, verb: 'pullOut', name: 'items.slot_' + l, enabled: () => !busy() && !!slots(P)[l], onUse: () => pullSlot(P, l) });
  }
  applySlots(P, false);
}
const slots = (P) => (P.flags.slots ||= { a: 'fuse_u_lamp', b: null, c: null, d: null });
function setSlotVisual(P, l, on) { const s = P.slot[l]; s.fuse.visible = on; s.lamp.material = on ? P.onMat : P.offMat; if (l === 'a') concourseLights(P.G, on); }
function concourseLights(G, on) { for (const v of G.lights.virtual) if (v.group === 'concourse') v.on = on; }
function applySlots(P, animate) {
  const S = slots(P);
  for (const l of SLOTS) { const id = S[l], p = id && P.G.props.byId.get(id); if (p && !p.inserted) P.G.props.insert(p); setSlotVisual(P, l, !!id); }
  if (S.b && S.c) openShutter(P, animate);
}
function fillSlot(P, l, p, animate) {
  const G = P.G, S = slots(P);
  G.props.insert(p); S[l] = p.id; setSlotVisual(P, l, true); G.events.emit('socket');
  if (l === 'd') { G.audio.play('rumble', { dur: 3.5 }); G.remnants.noise(P.slot.d.at, 30); G.ui.toast(t('puz.fan')); P.story.addThought('t_fan'); }
  if (S.b && S.c) openShutter(P, animate);
  else if (l === 'b' || l === 'c') G.ui.toast(t('puz.panelHalf'));
  else if (l === 'a') G.ui.toast(t('puz.lightsOn'));
}
function pullSlot(P, l) {
  const G = P.G, S = slots(P), p = G.props.byId.get(S[l]);
  if (!p || !G.props.extract(p, P.slot[l].at)) return;
  S[l] = null; setSlotVisual(P, l, false);
  if (l === 'a') { G.ui.toast(t('puz.lightsOut')); P.story.addThought('t_lightsout'); }
}
function openShutter(P, animate) {
  const G = P.G; P.flags.shutterOpen = true;
  G.world.col.setDyn('shutter_u', null);
  const y0 = -7;
  if (animate) { G.ui.toast(t('puz.panelFull')); G.events.emit('shutterOpen'); G.remnants.noise(P.shutter.position, 30); P.anim(5, (k) => { P.shutter.position.y = y0 + 4.1 * k; }); }
  else P.shutter.position.y = y0 + 4.1;
  P.story.advanceTo('tunnel');
}
export function restorePanel(P) { applySlots(P, false); }

// ---- P5: generator. Valve (fuel) and choke toggle; the start lever runs it only with fuel + choke
// (fuel without choke = backfire: loud, Remnants come); the transfer switch powers the tower door.
export function buildGenerator(P) {
  const G = P.G, M = P.M, mk = (geo, at) => { const m = new THREE.Mesh(geo.build(), M); m.position.copy(at); m.castShadow = true; G.scene.add(m); return m; };
  const gv = new Geo(Math.random); gv.prism(0, 0, 0, 0.16, 0.16, 0.04, 10, '#c9625a', { rx: Math.PI / 2, jit: 0 }); gv.box(0, 0, 0.03, 0.3, 0.04, 0.03, '#a3504a', { jit: 0 }); gv.box(0, 0, 0.03, 0.04, 0.3, 0.03, '#a3504a', { jit: 0 });
  const gc = new Geo(Math.random); gc.box(0, 0, 0.05, 0.05, 0.05, 0.12, '#9aa7b4', { jit: 0 }); gc.box(0, 0, 0.12, 0.12, 0.07, 0.04, '#e9d29a', { jit: 0 });
  const gs = new Geo(Math.random); gs.beam(0, 0, 0, 0, 0.28, 0.08, 0.04, '#5f6a76', 0); gs.ico(0, 0.3, 0.09, 0.05, '#2f3352', { j: 0 });
  const gw = new Geo(Math.random); gw.box(0, 0, 0, 0.05, 0.22, 0.05, '#2f3352', { jit: 0 });
  P.gen = { valve: mk(gv, P.A('gen_valve')), choke: mk(gc, P.A('gen_choke')), start: mk(gs, P.A('gen_start')), sw: mk(gw, P.A('gen_switch')) };
  P.gen.sw.rotation.z = 0.5; P.gen.start.rotation.x = -0.4;
  P.genLamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), P.offMat); P.genLamp.position.set(39, 2.45, -160.6); G.scene.add(P.genLamp);
  const f = () => P.flags, open = () => !f().towerOpen;
  G.interact.add({ id: 'gen_valve', pos: P.A('gen_valve'), r: 0.2, verb: 'turn', name: 'items.genValve', enabled: open, onUse: () => {
    f().genValve = !f().genValve; G.audio.play(f().genValve ? 'hiss' : 'keyPress'); genVisual(P); if (!f().genValve) f().genRunning = false; } });
  G.interact.add({ id: 'gen_choke', pos: P.A('gen_choke'), r: 0.16, verb: 'pull', name: 'items.genChoke', enabled: open, onUse: () => {
    f().genChoke = !f().genChoke; G.audio.play('keyPress'); genVisual(P); } });
  G.interact.add({ id: 'gen_start', pos: P.A('gen_start'), r: 0.2, verb: 'pull', name: 'items.genStart', enabled: open, onUse: () => startLever(P) });
  G.interact.add({ id: 'gen_switch', pos: P.A('gen_switch'), r: 0.18, verb: 'use', name: 'items.genSwitch', enabled: open, onUse: () => {
    if (f().genRunning) { P.gen.sw.rotation.z = -0.5; startGenerator(P, true); } else { G.audio.play('keyPress'); G.ui.toast(t('puz.noPower')); P.story.addThought('t_nopower'); } } });
  // tower door (opened by the generator)
  const g = new Geo(Math.random);
  g.box(0, 1.5, 0, 2.8, 3, 0.2, '#6d6a86'); for (const x of [-0.7, 0.7]) g.box(x, 1.5, 0.12, 1.25, 2.8, 0.04, '#7f7c98'); g.box(0, 1.4, 0.16, 0.1, 0.4, 0.05, '#c9c0d4');
  P.towerDoor = P.mesh(g, new THREE.Vector3(0, 0, -159.55));
  G.interact.add({ id: 'tower_door', pos: new THREE.Vector3(0, 1.4, -159.3), r: 0.6, verb: 'examine', name: 'items.towerDoor', enabled: open,
    onUse: () => { G.ui.toast(t('puz.towerLocked')); P.story.addThought('t_towerdoor'); P.story.advanceTo('generator'); } });
}
function genVisual(P) {
  const f = P.flags;
  P.gen.valve.rotation.z = f.genValve ? Math.PI / 2 : 0;
  P.gen.choke.position.z = P.A('gen_choke').z + (f.genChoke ? 0.1 : 0);
  P.genLamp.material = f.towerOpen ? P.onMat : P.offMat;
}
function startLever(P) {
  const G = P.G, f = P.flags, s = P.gen.start;
  P.anim(0.5, (k, r) => { s.rotation.x = -0.4 + Math.sin(r * Math.PI) * 1.0; });
  if (f.genRunning) return;
  if (!f.genValve) { G.audio.play('crank'); G.ui.toast(t('puz.genNoFuel')); return; }
  if (!f.genChoke) {
    // backfire: the cost of a wrong order
    G.audio.play('backfire'); G.remnants.noise(P.A('gen_start'), 32); P.spark(P.A('gen_start'), 0);
    f.genValve = false; genVisual(P); G.ui.toast(t('puz.backfire')); P.story.addThought('t_backfire'); return;
  }
  f.genRunning = true; f.genChoke = false; genVisual(P); G.audio.play('generator'); G.ui.toast(t('puz.genRunning'));
}
function startGenerator(P, animate) {
  const G = P.G; P.flags.towerOpen = true; P.flags.genRunning = true; genVisual(P);
  G.world.col.setDyn('tower_door', null);
  for (const lv of [0, 8, 16, 24]) G.lights.add({ pos: [0, lv + 3.6, -166], intensity: 5, distance: 10, color: '#ffd9a0' });
  if (animate) { G.ui.toast(t('puz.generatorOn')); G.events.emit('generatorOn'); P.anim(3, (k) => { P.towerDoor.position.y = 3.05 * k; }); }
  else P.towerDoor.position.y = 3.05;
  P.story.advanceTo('climb');
}
export function restoreGenerator(P, f) { if (f.towerOpen) { P.gen.sw.rotation.z = -0.5; startGenerator(P, false); } else genVisual(P); }

// ---- P5b: wind-up alarm clock. Picking it up winds it; 6 s later it rings for 7 s wherever it is
// (in your hand too), pulling Remnants towards it. Throw it where you want them to go.
export function buildAlarm(P) {
  const G = P.G;
  G.events.on('pickup', (p) => {
    if (p.kind !== 'alarm' || p.ringAt) return;
    p.ringAt = G.elapsed + 6; p.ringEnd = p.ringAt + 7; p.nextRing = p.ringAt;
    G.audio.play('wind'); P.story.addThought('t_alarm');
  });
}
const _w = new THREE.Vector3();
export function updateAlarm(P) {
  const G = P.G, p = G.props.byId.get('alarm_t'); if (!p || !p.ringAt) return;
  const now = G.elapsed; if (now < p.nextRing) return;
  if (now > p.ringEnd) { p.ringAt = 0; return; }
  p.nextRing = now + 0.7;
  const at = G.props.carrying === p ? G.player.feet : p.mesh.getWorldPosition(_w);
  G.remnants.noise(at, 28); G.audio.play('alarm', { pos: at.clone().setY(at.y + 0.3) });
}
