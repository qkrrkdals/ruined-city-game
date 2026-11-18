// 배치 ②: 대숲·갈대늪·벼룻길·벼루못.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { F } from './field.js';
import { NODES } from './layout.js';
import * as Pr from './props.js';
import { textPlane } from './kit.js';
import { MAT } from '../gfx/materials.js';

export function buildWestEastNorth(H, pineGeo) {
  const { kit, at } = H, W = G.world, S = G.shrines, K = G.pickups;
  const I = 'inkling', So = 'soldier', Sh = 'shield', El = 'elite', Cr = 'crane', Bo = 'boar';
  const amb = { ambush: true };
  // ── 대숲 ──
  H.perch('b0', -50.5, -0.5);
  H.enc('b1', 'b1', [[I, -3, 2], [I, 2, 3], [I, 0, -4], [So, -5, -2]]);
  H.enc('b2', 'b2', [[So, -4, 1, amb], [So, 3, -3, amb], [So, 2, 5, amb]]);
  H.enc('b2s', 'b2s', [[Sh, 0, 1]]);
  K.chest('c_page2', ...at('b2s', -3, 4.5), 2.6, { item: 'page', ink: 40 });
  H.memo(1, ...at('b2s', 4.5, 4), -0.7);
  S.add('bamboo', ...at('b3', 1, 3), 112, { spawn: at('b3', 3.5, 6.5) });
  H.lantern(...at('b3', -6, -4)); H.lantern(...at('b1', 6, 5)); H.lantern(-108, -27);
  H.perch('b4', -137, -19);
  H.enc('b4', 'b4', [[Sh, 0, -1], [So, -5, 2], [So, 5, 3]]);
  H.enc('b4s', 'b4s', [[El, 0, 0]]);
  K.chest('c_bamboo', ...at('b4s', -4, 2.5), 1.6, { charm: 'bamboo', ink: 40 });
  H.enc('b5', 'b5', [[Sh, 1, -2], [So, -4, 1], [I, 4, 4, amb], [I, -2, 5, amb], [I, 5, -4, amb]]);
  K.jar('j_b5', ...at('b5', -7.5, -3), 60);
  H.memo(2, ...at('b6', -5, -2.5), 0.8);
  H.perch('b6', ...at('b6', 4.5, 3.5));
  H.lantern(...at('b6', 3, -6));
  kit.place(Pr.ruin(), NODES.bossB.x + 2, NODES.bossB.z - 3, 0.4);
  for (const [dx, dz] of [[-1.9, -5.6], [5.9, -6.9], [-0.7, 0.9], [5.4, -0.5]]) F.addCircle(NODES.bossB.x + dx, NODES.bossB.z + dz, 0.45);
  H.enc('general', 'bossB', [['general', 4, -9]], { once: true, manual: true });
  W.arenas = W.arenas || {};
  W.arenas.general = { node: 'bossB', bars: [H.arenaGate('bossB', -122, -110), H.arenaGate('bossB', NODES.bs1.x, NODES.bs1.z)], exit: 1 };
  // ── 갈대늪 ──
  H.decks('veast', 'm0', true);
  H.perch('m0', 62.5, -1.5);
  H.enc('m1', 'm1', [[Cr, 2, -4], [Cr, -5, 3], [I, 4, 4], [I, -2, -2]]);
  H.perch('m2', 99, -3.5);
  H.enc('m2', 'm2', [[Bo, 5, 3], [Bo, -6, -5]]);
  H.boulder(...at('m2', -2, 8), 1.5); H.boulder(...at('m2', 8, -7), 1.3); H.boulder(...at('m2', -9, 2), 1.1);
  H.enc('m2s', 'm2s', [[I, -2, 1, amb], [I, 2, 3, amb], [I, 3, -2, amb]]);
  K.chest('c_dew', ...at('m2s', 1, 5), Math.PI, { item: 'dew', ink: 30 });
  H.memo(3, ...at('m2s', -5, 3.5), 1.2);
  S.add('marsh', ...at('m3', -1, 2), 116, { spawn: at('m3', -4, 5.5) });
  H.lantern(...at('m3', 6.5, -5));
  H.decks('m3', 'm4'); H.decks('m4', 'm4s'); H.decks('m4', 'm5');
  H.enc('m4', 'm4', [[I, -3, 1], [I, 3, 3], [I, 0, -4], [Cr, 5, -2], [Cr, -5, -3]]);
  H.enc('m4s', 'm4s', [[So, -1, 0], [So, 2, 2]]);
  K.chest('c_page3', ...at('m4s', 3.5, -2.5), -1.2, { item: 'page', ink: 40 });
  H.memo(4, ...at('m4s', 4, 3), -1.4);
  H.enc('m5', 'm5', [[Bo, -3, -2], [Cr, 4, 2], [I, 2, -5, amb], [I, -5, 4, amb]]);
  K.jar('j_m5', ...at('m5', 6.5, -3), 60);
  H.perch('m5', 158.5, -96);
  H.enc('toad', 'bossM', [['toad', -3, -6]], { once: true, manual: true });
  W.arenas.toad = { node: 'bossM', bars: [H.arenaGate('bossM', 154, -104), H.arenaGate('bossM', NODES.ms1.x, NODES.ms1.z)], exit: 1 };
  // ── 벼룻길 ──
  H.perch('n0', 3.5, -50.5);
  H.enc('n1', 'n1', [[So, -3, -1], [So, 3, -2], [Sh, 0, -5]]);
  H.lantern(-4.5, -55); H.lantern(4.5, -55);
  H.enc('n2', 'n2', [[El, 0, -2], [I, -5, 3, amb], [I, 5, 2, amb], [Cr, 3, -6]]);
  H.boulder(...at('n2', -7, -4), 1.6, 1.4);
  H.enc('n2s', 'n2s', [[El, 0, 0]]);
  K.chest('c_plum', ...at('n2s', 3.5, -2), -1.5, { charm: 'plum', ink: 60 });
  H.memo(5, ...at('n2s', 2, 4), -2.2);
  // 큰 먹(검은 비석)
  kit.place(Pr.inkStick(), ...at('n3', 9.5, -4), 0.5, F.hr(...at('n3', 9.5, -4)) - 0.8); F.addCircle(...at('n3', 9.5, -4), 2.0);
  const tx = textPlane(G.text.zones.arena, { vertical: true, h: 4.2, color: '#c9a24a', px: 110, keep: true });
  tx.position.set(NODES.n3.x + 8.6, F.hr(...at('n3', 9.5, -4)) + 4.4, NODES.n3.z - 3.3); tx.rotation.set(0.05, 0.2 + 0.5, -0.07); G.gfx.scene.add(tx);
  G.pickups.memo(6, ...at('n3', 7.2, -1.6));
  H.enc('n3', 'n3', [[Bo, -4, 2], [El, 3, -3], [Cr, -6, -5], [Cr, 6, 4]]);
  K.jar('j_n3', ...at('n3', -8, -6), 80);
  S.add('north', ...at('n4', 1, 2), 100, { spawn: at('n4', 3, 5) });
  H.perch('n4', ...at('n4', -5.5, -1.5));
  H.lantern(...at('n4', 6, -4));
  H.memo(7, ...at('n5', 4.5, -1), -1.2);
  H.lantern(-3.6, -200); H.lantern(3.6, -200);
  // ── 벼루못 ──
  const bt = NODES.bossT;
  kit.place(Pr.inkstone(), bt.x, bt.z, 0, bt.y + 0.02);
  const pine = pineGeo(1); kit.place([[pine, 'tree']], bt.x - 22.5, bt.z - 16.5, 0.7, F.hr(bt.x - 22.5, bt.z - 16.5) - 0.3, 2.3); F.addCircle(bt.x - 22.3, bt.z - 16.5, 0.9);
  W.anchor('greatPine', bt.x - 22.5, bt.z - 16.5); W.anchor('pool', bt.x, bt.z - 13.5);
  H.enc('tiger', 'bossT', [['tiger', 0, -13.5]], { once: true, manual: true });
  W.arenas.tiger = { node: 'bossT', bars: [H.arenaGate('bossT', 0, -193, 6), H.arenaGate('bossT', 0, -266, 5)], exit: 1 };
  // 접힌 틈: 병풍이 접히는 자리에서 새어 드는 빛
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 26), new THREE.MeshBasicMaterial({ color: 0xfffdf4, transparent: true, opacity: 0.0, fog: false, depthWrite: false }));
  seam.position.set(0, bt.y + 12, -269); G.gfx.scene.add(seam); W.seam = seam;
  W.anchor('fold', 0, -264);
}
export { MAT };
