// 결말: 먹범을 맺은 뒤의 연출과, 그 뒤의 세계(색이 돌아온 첫째 폭 — 소나무 아래의 범과 가지 위의 까치).
import * as THREE from 'three';
import { G } from '../core/g.js';
import { F } from '../world/field.js';
import { NODES } from '../world/layout.js';
import { buildTiger, poseSit } from '../entity/enemies/tiger_model.js';
import { Save } from '../systems/save.js';
import { U } from '../gfx/materials.js';
import { HEX } from '../gfx/palette.js';

function spots() {
  const a = G.world.anchors.greatPine, bt = NODES.bossT;
  const tx = a.x + 6.8, tz = a.z + 6.2;
  return { tx, tz, ty: F.h(tx, tz), yaw: Math.atan2(bt.x + 6 - tx, bt.z + 14 - tz), bx: a.x + 3.4, by: F.hr(a.x, a.z) + 11.9, bz: a.z + 2.8 };
}
// 호작도의 범을 소나무 아래에 앉히고, 까치를 가지에 올린다
export function placeEpilogue(S) {
  const W = G.world; if (W.epilogue) return;
  const s = spots(), t = buildTiger('folk');
  t.root.position.set(s.tx, s.ty, s.tz); t.root.rotation.y = s.yaw; t.root.scale.setScalar(0.82); G.gfx.scene.add(t.root);
  poseSit(t.J, 0); t.J.snap();
  const col = F.addCircle(s.tx, s.tz, 1.7);
  W.epilogue = { tiger: t, update(dt) { poseSit(t.J, G.time); t.J.update(dt, 7); }, dispose() { G.gfx.scene.remove(t.root); col.on = false; G.interact.remove('tigerFolk'); } };
  if (!W.epiHook) { W.epiHook = true; W.updaters.push((dt) => { if (W.epilogue) W.epilogue.update(dt); }); }
  G.magpie.perch(s.bx, s.by, s.bz, s.yaw);
  W.seam.material.opacity = 0.85;
  const last = G.text.dlg.ending[G.text.dlg.ending.length - 1];
  G.interact.add({ id: 'tigerFolk', x: s.tx, z: s.tz, r: 4.2, label: () => G.text.ui.talk, onUse: () => S.run(function* () { yield* S.say([last]); }) });
}

export function endingSeq(S) {
  return function* () {
    const p = G.player, W = G.world, T = G.text, bt = NODES.bossT, s = spots();
    G.prog.flags.tiger = true;
    S.cine(true); G.fx.slowmo(0.3, 1.3); G.ui.sealStamp(); G.audio.play('stampUi');
    yield 1.5;
    G.fx.fadeOut(1.0, HEX.white); G.audio.play('wash'); yield 1.5;
    // 흰 종이 뒤에서: 첫째 폭 전체에 색이 돌아온다
    G.spawner.reset(false); S.ch.bars(); U.uSat.value = 1; placeEpilogue(S); G.magpie.hide();
    const px = bt.x + 3, pz = bt.z + 5; p.place(px, pz, Math.atan2(s.tx - px, s.tz - pz)); p.setState('move', 0); p.fullRestore(); p.combatT = 99;
    G.audio.setMood('calm');
    G.cam.cine = { pos: new THREE.Vector3(s.tx + 13, s.ty + 4.2, s.tz + 15), look: new THREE.Vector3(s.tx - 1.5, s.ty + 4.4, s.tz - 1.5), fov: 44, snap: true };
    yield 0.6; G.fx.fadeIn(0.45); G.audio.play('shrine'); yield 3.6;
    // 까치가 가지로 날아든다
    let ok = false; G.magpie.perch(s.bx + 22, s.by + 12, s.bz + 26); G.magpie.flyTo(s.bx, s.bz, 0, () => { ok = true; }, s.by); yield () => ok;
    yield 0.5;
    G.cam.cine = { pos: new THREE.Vector3(s.tx + 7.5, s.ty + 2.6, s.tz + 9.5), look: new THREE.Vector3(s.tx, s.ty + 2.3, s.tz), fov: 42, k: 1.2 };
    yield* S.say('ending');
    // 접힌 틈 너머 둘째 폭으로
    G.cam.cine = { pos: new THREE.Vector3(bt.x + 9, bt.y + 6.5, bt.z + 20), look: new THREE.Vector3(0, bt.y + 5, -262), fov: 46, k: 0.9 };
    p.auto = { x: 0, z: bt.z - 22.6, speed: 2.7 };
    yield 1.6; G.magpie.flyTo(0.8, bt.z - 21, 2.6);
    yield 3.6; G.fx.fadeOut(0.7, HEX.paper); yield 1.7;
    p.auto = null;
    let done = false; G.ui.screens.cards([`${T.end.line1}\n${T.end.line2}`], () => { done = true; }); yield () => done;
    G.prog.flags.ended = true; Save.write();
    done = false; G.state = 'ending'; G.input.exitLock(); G.ui.screens.ending(() => { done = true; }); yield () => done;
    G.fx.setBars(false); p.frozen = false; G.peace = false; G.cam.cine = null;
    G.flow.toTitle();
  };
}
