// 제1폭 「까치와 범」의 진행: 길잡이, 발동 지점, 사람들과의 대화, 중간 보스·먹문, 안내 문구.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { F } from '../world/field.js';
import { NODES } from '../world/layout.js';
import { bigBrush } from '../world/props.js';
import { Save } from '../systems/save.js';
import { P } from '../gfx/particles.js';
import { HEX } from '../gfx/palette.js';
import { U } from '../gfx/materials.js';
import { endingSeq, placeEpilogue } from './ending.js';
import { damp } from '../core/util.js';

const _p = new THREE.Vector3();

export function installChapter(S) {
  const T = G.text, W = G.world, A = (id) => W.anchors[id], fl = () => G.prog.flags, N = (id) => ({ x: NODES[id].x, z: NODES[id].z });
  const hint = (key, dur) => { if (fl()['h_' + key]) return; fl()['h_' + key] = true; G.ui.hint(key, dur || 7); };
  // 화공이 떨어뜨린 붓
  const brush = bigBrush(); { const a = A('brush'); brush.position.set(a.x, F.h(a.x, a.z) + 0.3, a.z); brush.rotation.set(0.12, 0, 0.22); G.gfx.scene.add(brush); }
  let sealTex = null, lowHpT = 0;

  const C = {
    magpieAt: null,
    objective() {
      const f = fl(), a = G.prog.arts;
      if (!f.brush) return { key: 'brush', target: A('brush') };
      if (!f.firstFight && !f.shrine1) return { key: 'first', target: N('first') };
      if (!f.shrine1) return { key: 'shrine', target: G.shrines.get('first') };
      if (!f.village) return { key: 'village', target: N('vsouth') };
      if (!f.jang) return { key: 'talk', target: A('jang') };
      if (!f.gateOpen) {
        if (!a.wave && !a.smash) return { key: 'strokes', target: null };
        if (!a.wave) return { key: 'strokes1s', target: N('bossB') };
        if (!a.smash) return { key: 'strokes1w', target: N('bossM') };
        return { key: 'gate', target: A('jang') };
      }
      if (!f.tiger) return S.boss ? { key: 'boss', target: null } : { key: 'tiger', target: N('bossT') };
      return { key: 'done', target: null };
    },
    reset() { brush.visible = true; W.gate.t = W.gate.target = 0; W.gate.g.userData.open(0); W.gate.col.on = true; C.magpieAt = null; if (W.epilogue) { W.epilogue.dispose(); W.epilogue = null; } W.seam.material.opacity = 0; C.bars(); },
    // 저장된 진행을 세계에 입힌다
    load() {
      const f = fl();
      brush.visible = !f.brush;
      if (f.gateOpen) { W.gate.t = W.gate.target = 1; W.gate.g.userData.open(1); W.gate.col.on = false; }
      if (f.general) W.addRestore(NODES.bossB.x, NODES.bossB.z, 72, true);
      if (f.toad) W.addRestore(NODES.bossM.x, NODES.bossM.z, 72, true);
      if (f.tiger) { U.uSat.value = 1; placeEpilogue(S); }
      for (const k of ['general', 'toad', 'tiger']) if (f[k]) { const e = G.spawner.get(k); e.cleared = true; }
      if (f.village && !f.tiger) { const a = A('perch_village'); G.magpie.perch(a.x, a.top, a.z, 0); C.magpieAt = 'village'; }
      C.bars(); C.seals();
    },
    // 먹 장막: 우두머리가 살아 있으면 뒷문은 늘 막혀 있다. 앞문은 싸울 때만.
    bars() {
      const f = G.prog ? fl() : {};
      for (const k in W.arenas) { const ar = W.arenas[k]; ar.bars[0].set(false, true); ar.bars[1].set(k === 'tiger' ? true : !f[k], true); }
    },
    seals() {
      if (!sealTex) { sealTex = {}; const L = new THREE.TextureLoader(); for (const id of ['dot', 'wave', 'smash']) sealTex[id] = L.load(G.ui.icons[id]); }
      for (const s of W.gate.g.userData.seals) { s.m.material.map = sealTex[s.id]; s.m.material.color.set(G.prog.arts[s.id] ? 0xff6a50 : 0x70707a); s.m.material.needsUpdate = true; }
    },
    onRespawn() { C.bars(); },
    intro: function* () {
      const p = G.player, a = A('start');
      G.state = 'cine'; p.frozen = true; G.peace = true; G.fx.fade = 1; G.fx.fadeTo = 1; G.gfx.pu.uFadeCol.value.set(HEX.paper);
      p.place(a.x, a.z, Math.PI); p.armed = false; p.setState('lie', 0); G.cam.setBehind(Math.PI); G.cam.pitch = 0.24; G.cam.snap();
      let done = false; G.ui.screens.cards(T.intro, () => { done = true; }); yield () => done;
      G.cam.cine = { pos: new THREE.Vector3(a.x + 2.6, F.h(a.x, a.z) + 1.0, a.z - 3.4), look: new THREE.Vector3(a.x, F.h(a.x, a.z) + 0.5, a.z), fov: 42, snap: true };
      G.fx.setBars(true); G.fx.fadeIn(0.5); yield 2.6;
      p.setState('down', 0); p.t = 0.6; yield 1.0;
      G.cam.cine = null; yield 0.9;
      S.cine(false); S.objective(); hint('move', 9);
    },
    update(dt, rdt) {
      const p = G.player, g = W.gate;
      if (g.t !== g.target) { g.t = damp(g.t, g.target, 1.6, rdt); if (Math.abs(g.t - g.target) < 0.004) g.t = g.target; g.g.userData.open(g.t); }
      if (G.state !== 'play') return;
      if (p.hp < p.maxHp * 0.55 && p.heals > 0) { lowHpT += rdt; if (lowHpT > 0.6) hint('heal'); } else lowHpT = 0;
    },
  };

  // ── 붓을 뽑는다 ──
  G.interact.add({ id: 'brush', x: A('brush').x, z: A('brush').z, r: 2.6, label: () => T.ui.brushPull, enabled: () => !fl().brush, onUse: () => S.run(function* () {
    const p = G.player, a = A('brush');
    S.cine(true); p.faceTo(a.x, a.z);
    G.cam.cine = { pos: new THREE.Vector3(a.x + 3.2, F.h(a.x, a.z) + 1.5, a.z + 3.2), look: new THREE.Vector3(a.x, F.h(a.x, a.z) + 1.1, a.z), fov: 44 };
    yield 0.9;
    brush.visible = false; p.armed = true; fl().brush = true; G.audio.play('learn'); G.fx.gold = 0.7; p.combatT = 0;
    _p.set(a.x, F.h(a.x, a.z) + 1.2, a.z); P.sparks(_p, 30, 8, HEX.white); P.inkBurst(_p, 12, 4, null);
    G.ui.big(T.items.brush.name, T.toast.get); yield 2.4;
    G.cam.cine = null;
    yield* S.magpie('meet'); C.magpieAt = 'meet'; yield 0.3;
    yield* S.say('magpieMeet');
    S.cine(false); S.objective(); hint('attack', 9);
  }) });

  // ── 발동 지점 ──
  const mag = (perch, key, flag, extra) => function* () { yield* S.magpie(perch); C.magpieAt = perch; yield* S.say(key); if (flag) fl()[flag] = true; if (extra) extra(); S.objective(); };
  const trig = (flag, x, z, r, gen, cond) => S.trigger({ x, z, r, cond: () => !fl()[flag] && (!cond || cond()), fn: () => { fl()[flag] = true; S.run(gen); } });
  trig('t_soldier', -31, 130, 8, mag('p2', 'soldierHint'), () => fl().shrine1);
  trig('village', 5, 31, 7.5, function* () {
    yield* S.magpie('vs'); yield* S.say('villageArrive');
    const pv = A('perch_village'); G.magpie.flyTo(pv.x, pv.z, 0, null, pv.top); C.magpieAt = 'village';
    S.objective(); hint('map', 6); Save.write();
  });
  trig('t_bamboo', -47, -4.5, 6.5, mag('b0', 'bambooEnter'));
  trig('t_shield', -139, -22, 7, mag('b4', 'shieldHint', null, () => hint('shield', 8)));
  trig('t_shield', -100, -9, 5, function* () { yield* S.say('shieldHint'); hint('shield', 8); });
  trig('t_general', NODES.b6.x, NODES.b6.z, 7, mag('b6', 'generalIntro'), () => !fl().general);
  trig('t_marsh', 60, -5.5, 6, mag('m0', 'marshEnter'));
  trig('t_crane', 71, -9, 5, function* () { yield* S.say('craneHint'); });
  trig('t_boar', 99.5, -6.5, 6, mag('m2', 'boarHint'));
  trig('t_toad', 158, -97.5, 6, mag('m5', 'toadIntro'), () => !fl().toad);
  trig('t_north', 0, -47, 5, mag('n0', 'northEnter'), () => fl().gateOpen);
  // 우두머리의 터
  for (const [key, r] of [['general', 13], ['toad', 14], ['tiger', 19]]) {
    const n = NODES[W.arenas[key].node];
    S.trigger({ x: n.x, z: n.z, r, once: false, calm: false, cond: () => !fl()[key] && !S.boss && G.player.alive, fn: () => S.run(bossIntro(key)) });
  }
  function bossIntro(key) {
    return function* () {
      const ar = W.arenas[key], enc = G.spawner.get(key), p = G.player, n = NODES[ar.node];
      ar.bars[0].set(true); ar.bars[1].set(true, true);
      G.spawner.spawn(enc); const e = enc.members[0];
      S.boss = { key, mood: key === 'tiger' ? 'boss' : 'miniboss', e };
      S.cine(true); G.audio.play('bossIntro');
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz) || 1;
      G.cam.cine = { pos: new THREE.Vector3(e.pos.x - (dx / d) * (7 + e.radius * 3) + (dz / d) * 3, e.pos.y + 1.6 + e.radius, e.pos.z - (dz / d) * (7 + e.radius * 3) - (dx / d) * 3), look: new THREE.Vector3(e.pos.x, e.pos.y + e.height * 0.55, e.pos.z), fov: 46, k: 2.2 };
      if (e.intro) e.intro();
      yield 1.1; G.ui.big(T.names[e.def.nameKey || e.kind], T.bossSub[e.def.nameKey || e.kind]);
      yield e.introTime || 2.4;
      S.cine(false); G.ui.showBoss(e); e.notice(true); S.objective();
      void n;
    };
  }
  // 우두머리를 맺었다
  G.on('enemyDead', (e) => {
    if (!e.def.boss || !S.boss || S.boss.e !== e) return;
    const key = S.boss.key; S.boss = null; G.ui.showBoss(null);
    if (key === 'tiger') { S.run(endingSeq(S)); return; }
    S.run(function* () {
      const art = key === 'general' ? 'wave' : 'smash', n = NODES[W.arenas[key].node];
      fl()[key] = true; G.prog.stats.finishers += 0;
      yield 1.3;
      C.bars(); G.audio.play('wash'); W.addRestore(n.x, n.z, 72, false); G.fx.gold = 0.6;
      yield 1.2;
      G.prog.learn(art); G.prog.bristle++; C.seals(); G.audio.play('learn');
      G.ui.big(T.arts[art].name, T.toast.regain); G.ui.toast(`${T.arts[art].name} (${T.arts[art].key})`, T.arts[art].desc); G.ui.toast(T.items.bristle.name, T.items.bristle.desc); G.ui.toast(T.toast.shortcut);
      G.player.fullRestore();
      yield 3.2;
      yield* S.say(key === 'general' ? 'generalWin' : 'toadWin');
      if (G.prog.artCount >= 3) yield* S.say('allStrokes');
      Save.write(); S.objective();
    });
  });

  // ── 사람들 ──
  const talk = (id, x, z, r, gen, enabled) => G.interact.add({ id, x, z, r, label: () => T.ui.talk, enabled, onUse: () => S.run(gen) });
  const menu = function* (name) { let closed = false; G.ui.menus.show(name, () => { closed = true; }); yield () => closed; };
  const npc = (k) => { const n = W.npcs[k]; return { set talking(v) { n.talking = v; } }; };
  const sayNpc = function* (k, key) { npc(k).talking = true; yield* S.say(key); npc(k).talking = false; };
  talk('elder', -17.5, 6.5, 2.9, function* () {
    const pr = G.prog;
    if (!fl().elder1) { fl().elder1 = true; yield* sayNpc('elder', 'elder1'); if (pr.bristle < 1) return; }
    if (pr.weapon >= 3) { yield* sayNpc('elder', 'elderMax'); return; }
    if (pr.bristle < 1) { yield* sayNpc('elder', 'elderNo'); return; }
    yield* sayNpc('elder', 'elder2'); const before = pr.weapon; yield* menu('smith');
    if (pr.weapon > before) { yield* sayNpc('elder', 'elderDone'); Save.write(); }
  });
  talk('granny', 12.2, 10, 3.2, function* () { yield* sayNpc('granny', fl().granny1 ? 'granny2' : 'granny1'); fl().granny1 = true; yield* menu('shop'); Save.write(); });
  talk('scholar', 8, -5.5, 2.9, function* () {
    const pr = G.prog;
    if (fl().scholarDone) { yield* sayNpc('scholar', 'scholarAfter'); return; }
    if (!fl().scholar1) { fl().scholar1 = true; yield* sayNpc('scholar', 'scholar1'); if (pr.pages < 3) return; }
    if (pr.pages < 3) { yield* sayNpc('scholar', 'scholarWait'); G.ui.toast(`${T.toast.pageCount} ${pr.pages} / 3`); return; }
    yield* sayNpc('scholar', 'scholarDone'); fl().scholarDone = true; pr.addCharm('crane'); G.audio.play('item');
    G.ui.big(T.charms.crane.name, T.toast.get); G.ui.toast(T.charms.crane.name, T.charms.crane.desc); Save.write();
  });
  talk('kid', -3.2, -3.4, 2.6, function* () { yield* sayNpc('kid', fl().tiger ? 'kidEnd' : fl().kid1 ? 'kid2' : 'kid1'); fl().kid1 = true; });
  // 까치(마을에 앉아 있을 때)
  { const a = A('perch_village'); talk('magpie', a.x, a.z, 3.4, function* () { yield* S.say(fl().magpieV1 ? 'magpieVillage2' : 'magpieVillage'); fl().magpieV1 = true; }, () => C.magpieAt === 'village' && !G.magpie.flying && G.magpie.visible && !fl().tiger); }
  // 장승과 먹문
  talk('jang', 0, -35.2, 4, function* () {
    const f = fl();
    if (!f.jang) { f.jang = true; yield* S.say('jang1'); S.objective(); Save.write(); return; }
    if (f.gateOpen) { yield* S.say('jangAfter'); return; }
    if (G.prog.artCount < 3) { yield* S.say('jangWait'); return; }
    yield* S.say('jangOpen');
    S.cine(true);
    G.cam.cine = { pos: new THREE.Vector3(5, F.h(0, -30) + 3.2, -27), look: new THREE.Vector3(0, F.h(0, -41) + 3.2, -41), fov: 50 };
    yield 0.9; G.audio.play('gate'); W.gate.target = 1; G.cam.shake(0.35);
    yield 2.6; W.gate.col.on = false; f.gateOpen = true; G.ui.big(T.toast.gateOpen, ''); G.audio.play('learn');
    yield 1.6; S.cine(false); S.objective(); Save.write();
  });

  // ── 첫 싸움·연적·안내 ──
  G.on('encClear', (d) => {
    if (d.id === 'first' && !fl().firstFight) { fl().firstFight = true; S.run(function* () { yield 0.9; yield* S.magpie('first'); C.magpieAt = 'first'; yield* S.say('afterFirst'); S.objective(); hint('shrine', 8); }); }
  });
  G.on('shrineWake', (s) => {
    if (s.id === 'first' && !fl().shrine1) {
      S.run(function* () {
        fl().shrine1 = true; yield 2.4;
        G.prog.learn('dot'); C.seals(); G.audio.play('learn'); G.ui.big(T.arts.dot.name, T.toast.learn); G.ui.toast(`${T.arts.dot.name} (${T.arts.dot.key})`, T.arts.dot.desc);
        yield 2.6; yield* S.magpie('first'); yield* S.say('afterShrine'); S.objective(); hint('art', 9); Save.write();
      });
    } else if (s.id === 'north' && !fl().lastShrine) { fl().lastShrine = true; S.run(function* () { yield 2.2; yield* S.magpie('n4'); C.magpieAt = 'n4'; yield* S.say('lastShrine'); }); }
    S.objective();
  });
  G.on('playerHit', () => { if (fl().brush) hint('heavy', 7); });
  G.on('tell', () => { if (fl().h_heavy) hint('dodge', 8); });
  G.on('perfect', () => { G.prog.stats.perfect++; hint('perfect', 7); });
  G.on('stagger', () => hint('finish', 8));
  G.on('finisher', () => { if (fl().h_finish) hint('lock', 6); });
  return C;
}
