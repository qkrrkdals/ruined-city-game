// 배치 ①: 여백·솔숲·붓골. (좌표는 layout.js 의 마당 기준)
import * as THREE from 'three';
import { G } from '../core/g.js';
import { F } from './field.js';
import { NODES, EDGES } from './layout.js';
import * as Pr from './props.js';
import { textPlane, makeBarrier } from './kit.js';
import { plumGeo, willowGeo } from './scatter.js';
import { MAT } from '../gfx/materials.js';
import { createNpc } from '../entity/npc.js';
import { lerp } from '../core/util.js';

// 배치 도우미 묶음(regions_b 에서도 쓴다)
export function makeHelpers(kit) {
  const W = G.world, T = G.text;
  const H = {
    kit,
    at: (id, dx = 0, dz = 0) => [NODES[id].x + dx, NODES[id].z + dz],
    boulder(x, z, s = 1, tall = 1) { kit.place(Pr.boulder(s, tall), x, z, x * 1.3 + z, F.hr(x, z) - 0.15 * s); F.addCircle(x, z, 0.95 * s); },
    lantern(x, z) { kit.place(Pr.lantern(), x, z, 0); F.addCircle(x, z, 0.5); },
    // 까치가 앉는 돌
    perch(id, x, z, s = 0.75) { kit.place(Pr.boulder(s, 1.1), x, z, x + z, F.hr(x, z) - 0.1); F.addCircle(x, z, 0.8 * s); W.anchor('perch_' + id, x, z, { top: F.hr(x, z) + 1.12 * s }); },
    memo(i, x, z, yaw = 0) { kit.place(Pr.memoStone(), x, z, yaw); F.addCircle(x, z, 0.6); G.pickups.memo(i, x + Math.sin(yaw) * 0.8, z + Math.cos(yaw) * 0.8); },
    sign(text, x, z, yaw) {
      const g = new THREE.Group(), y = F.hr(x, z);
      const tp = textPlane(text, { h: 0.5 }); tp.position.set(0, 1.75, 0.05);
      kit.place([[new THREE.BoxGeometry(0.12, 2.2, 0.12).translate(0, 1.1, 0), 'world']].map(([geo, m]) => [paintWood(geo), m]), x, z, yaw, y);
      kit.place([[paintWood(new THREE.BoxGeometry(tp.userData.w + 0.4, 0.66, 0.06).translate(0, 1.75, 0)), 'world']], x, z, yaw, y);
      g.add(tp); g.position.set(x, y, z); g.rotation.y = yaw; G.gfx.scene.add(g); F.addCircle(x, z, 0.3);
    },
    // 길(edge)의 꺾이는 점들: [{x,z,y}]
    edgePts(a, b) {
      const ed = EDGES.find((e) => e.a === a && e.b === b), A = NODES[a], B = NODES[b];
      const pts = [[A.x, A.z], ...ed.via.map((v) => [v[0], v[1]]), [B.x, B.z]]; let tot = 0; const cum = [0];
      for (let i = 1; i < pts.length; i++) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(tot); }
      return pts.map((p, i) => ({ x: p[0], z: p[1], y: lerp(A.y, B.y, cum[i] / tot), w: ed.w }));
    },
    // 다리·널다리: 길을 따라 판을 깐다
    decks(a, b, rail) {
      const pts = H.edgePts(a, b);
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], q = pts[i], len = Math.hypot(q.x - p.x, q.z - p.z), yaw = Math.atan2(q.x - p.x, q.z - p.z);
        const parts = Pr.deck(len, p.w - (rail ? 0.1 : 0.25), rail);
        const pitch = Math.atan2(q.y - p.y, len);
        for (const [geo] of parts) geo.rotateX(-pitch);
        kit.place(parts, p.x, p.z, yaw, p.y + 0.02);
      }
    },
    // 마당 가장자리의 먹 장막: 마당 중심에서 (tx,tz) 쪽 길목을 가로막는다
    arenaGate(node, tx, tz, hw = 6.5, inset = 1.2) {
      const n = NODES[node], dx = tx - n.x, dz = tz - n.z, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
      const cx = n.x + ux * (n.r - inset), cz = n.z + uz * (n.r - inset);
      return makeBarrier(cx - uz * hw, cz + ux * hw, cx + uz * hw, cz - ux * hw);
    },
    enc(id, node, list, o = {}) { const n = NODES[node] || { x: node[0], z: node[1] }; return G.spawner.add({ id, x: n.x + (o.dx || 0), z: n.z + (o.dz || 0), list, ...o }); },
    tree(geo, x, z, s = 1, ry = 0) { const g = geo.clone(); kit.place([[g, 'tree']], x, z, ry, F.hr(x, z) - 0.1, s); },
    T,
  };
  return H;
}
const _wc = new THREE.Color(0x8a6a48);
function paintWood(geo) { const g = geo.toNonIndexed(), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = _wc.r; a[i * 3 + 1] = _wc.g; a[i * 3 + 2] = _wc.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; }

export function buildSouthAndVillage(H) {
  const { kit, at } = H, W = G.world, S = G.shrines, K = G.pickups, I = 'inkling', So = 'soldier';
  // ── 여백 ──
  W.anchor('start', 0, 242);
  W.anchor('brush', 1.5, 223);
  H.perch('meet', 6, 216, 0.8);
  // ── 첫 터 ──
  H.enc('first', 'first', [[I, -3, 4], [I, 2, 1], [I, 5, 5]]);
  S.add('first', ...at('first', 3, -10), 95, { spawn: at('first', 1, -5) });
  H.perch('first', ...at('first', 7.5, -7.5));
  K.jar('j_first', ...at('first', -10, -5), 40);
  H.lantern(...at('first', -3, -14.5));
  // ── 솔숲 길 ──
  H.enc('p1', 'p1', [[I, -2, 2], [I, 3, -1], [I, -5, -3, { ambush: true }], [I, 2, 5, { ambush: true }]]);
  H.perch('p2', -30, 128);
  H.enc('p2', 'p2', [[So, 0, -3], [I, -5, 2], [I, 5, 3]]);
  H.boulder(...at('p2', -8, -6), 1.3); H.boulder(...at('p2', 7, -8), 1.0);
  H.enc('p2s', 'p2s', [[So, 1, 0]]);
  K.chest('c_pine', ...at('p2s', -4.5, 2), 1.9, { charm: 'pine', ink: 30 });
  H.enc('p23', [-32, 100], [[So, -1, 0], [So, 3, -3], [I, -3, 3, { ambush: true }]]);
  S.add('pine2', ...at('p3', -1, 3), 80, { spawn: at('p3', 2, 6.5) });
  H.memo(0, ...at('p3', -9, -5), 0.9);
  H.lantern(...at('p3', 6, -3));
  H.enc('p3s', 'p3s', [[I, -1, 1], [I, 2, -2, { ambush: true }], [I, 3, 3, { ambush: true }]]);
  K.chest('c_page1', ...at('p3s', 3.5, 1.5), -1.9, { item: 'page', ink: 30 });
  H.enc('p34', [7, 73], [[I, -2, 2], [I, 2, 0], [I, 0, -3], [So, 3, -5]]);
  H.enc('p4', 'p4', [[So, -3, -2], [So, 3, -4], [I, -6, 3, { ambush: true }], [I, 5, 4, { ambush: true }], [I, 0, 6, { ambush: true }]]);
  K.jar('j_p4', ...at('p4', 8.5, 2), 50);
  H.boulder(...at('p4', -7, 5), 1.2);
  // ── 붓골 ──
  kit.place(Pr.gatePosts(), 6.5, 37.5, Math.atan2(0.14, 1));
  kit.place(Pr.sotdae(), -0.5, 41, 0); kit.place(Pr.sotdae(5.5), 12.5, 40.5, 1);
  F.addCircle(4.2, 37.2, 0.35); F.addCircle(8.8, 37.8, 0.35);
  kit.place(Pr.gatePosts(), -33.5, -4, Math.PI / 2); F.addCircle(-33.5, -6.3, 0.35); F.addCircle(-33.5, -1.7, 0.35);
  kit.place(Pr.gatePosts(), 33.5, -2, Math.PI / 2); F.addCircle(33.5, -4.3, 0.35); F.addCircle(33.5, 0.3, 0.35);
  H.sign(G.text.zones.bamboo, -28.5, 0.5, Math.PI / 2 + 0.2);
  H.sign(G.text.zones.marsh, 28.5, 2.5, -Math.PI / 2 - 0.2);
  H.sign(G.text.zones.arena, 5.8, -30, 0.25);
  // 집들(문이 마을 한가운데를 보게)
  const houses = [[-22, 8, 5.4, 3.6], [22, 9, 5, 3.6], [-12, 20, 4.6, 3.4], [14, 21, 5.2, 3.6], [-11, -21.5, 5, 3.6], [11.5, -21.5, 4.6, 3.4]];
  for (const [x, z, w, d] of houses) {
    const yaw = Math.atan2(-x, -z); kit.place(Pr.house(w, d), x, z, yaw);
    const cx = Math.cos(yaw), sx = Math.sin(yaw), hl = w / 2 - d / 2 + 0.3;
    F.addSeg(x - cx * hl, z + sx * hl, x + cx * hl, z - sx * hl, d / 2 + 0.25);
  }
  kit.place(Pr.pavilion(), 11.5, -8.5, 0.5); F.addCircle(11.5, -8.5, 3.1);
  S.add('village', 0, -1, 88, { pre: true, spawn: [0.5, 4.5] });
  for (const [x, z] of [[-7, 9], [7, 9.5], [-8, -9], [5.5, -13]]) H.lantern(x, z);
  H.tree(plumGeo(), -16.5, 14, 1.25, 0.4); H.tree(plumGeo(), 19, 15.5, 1.1, 2.1); H.tree(plumGeo(), -17, -15.5, 1.3, 4); H.tree(willowGeo(), 26.5, -10, 1.2, 1);
  // 돌담 조각(마을 둘레)
  const ring = [[22, 80], [106, 124], [146, 166], [194, 214], [236, 250], [276, 350]]; // 나들목(남·동·서·북·북동·북서)은 비운다
  for (const [a0, a1] of ring) for (let a = a0; a < a1; a += 9.5) { const r = 26.2, t = ((a + 4.75) * Math.PI) / 180, x = Math.sin(t) * r, z = Math.cos(t) * r; kit.place(Pr.wall(4.4, 1.0), x, z, t + Math.PI); F.addSeg(x - Math.cos(t) * 2.1, z + Math.sin(t) * 2.1, x + Math.cos(t) * 2.1, z - Math.sin(t) * 2.1, 0.45); }
  // 먹 할멈의 좌판
  kit.place([[new THREE.BoxGeometry(2.2, 0.5, 1.0).translate(0, 0.25, 0), 'world']].map(([g, m]) => [paintWood(g), m]), 10.5, 8.6, Math.atan2(-10.5, -8.6)); F.addCircle(10.5, 8.6, 1.0);
  kit.place(Pr.jar(), 9.9, 8.2, 0, F.hr(10, 8) + 0.5, 0.6); kit.place(Pr.jar(), 11, 8.9, 1, F.hr(10, 8) + 0.5, 0.5);
  // 사람들
  W.npcs = {
    elder: createNpc('elder', -17.5, 6.5, Math.atan2(17.5, -6.5)), granny: createNpc('granny', 12.2, 10, Math.atan2(-12.2, -10)),
    scholar: createNpc('scholar', 8, -5.5, Math.atan2(-8, 5.5)), kid: createNpc('kid', -3.2, -3.4, 2.4),
  };
  // 장승과 먹문
  const jang = [Pr.jangseung(0), Pr.jangseung(1)];
  jang.forEach((j, i) => {
    const x = i ? 5.2 : -5.2, z = -36.6; j.position.set(x, F.h(x, z), z); j.rotation.y = i ? -0.2 : 0.2; G.gfx.scene.add(j); F.addCircle(x, z, 0.6);
    const tp = textPlane(i ? G.text.names.jangB : G.text.names.jangA, { vertical: true, h: 1.5, color: '#f4eedd', px: 72 }); tp.position.set(0, 1.15, 0.43); j.add(tp);
  });
  W.jang = jang; W.anchor('jang', 0, -35);
  const gate = Pr.inkGate(), gy = F.h(0, -41); gate.position.set(0, gy, -41); G.gfx.scene.add(gate);
  F.addCircle(-3.9, -41, 1.15); F.addCircle(3.9, -41, 1.15);
  for (const s of [-1, 1]) { kit.place(Pr.wall(5, 2.2), s * 7.2, -41, 0); F.addSeg(s * 4.8, -41, s * 9.8, -41, 0.6); }
  W.gate = { g: gate, col: F.addSeg(-3, -41, 3, -41, 0.7), t: 0, target: 0 };
  // 먹문의 획 표식(점·삐침·파임)
  ['dot', 'wave', 'smash'].forEach((id, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ transparent: true, color: 0x5a5a60 }));
    m.position.set((i - 1) * 2.1, 6.0, 0.97); gate.add(m); gate.userData.seals.push({ id, m });
  });
  H.perch('village', -8.5, -29, 0.9);
  H.perch('vs', 11.5, 31.5, 0.8);
  W.anchor('gateFront', 0, -36.5);
}
