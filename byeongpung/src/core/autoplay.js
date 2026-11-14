// 자동 플레이(점검용): 길잡이를 따라 걷고, 싸우고, 말 걸고, 연적을 깨우며 처음부터 결말까지 간다.
// 사람 대신 흐름 전체(발동 지점·문·보스·결말)가 끊기지 않는지 확인하는 도구다.
import { G } from './g.js';
import { NODES, EDGES } from '../world/layout.js';
import { F } from '../world/field.js';

const N = (id) => ({ node: id }), U = (id) => ({ use: id });
export const PLAN = [
  U('brush'), N('mgate'), N('first'), U('shrine_first'), N('p1'), N('p2'), N('p2s'), U('chest_c_pine'), N('p2'), N('p3'), U('shrine_pine2'), U('memo_0'), N('p3s'), U('chest_c_page1'), N('p3'), N('p4'), N('vsouth'), N('village'),
  U('kid'), U('scholar'), U('granny'), U('elder'), N('vnorth'), U('jang'), N('village'),
  N('vwest'), N('b1'), N('b2'), N('b2s'), U('chest_c_page2'), N('b2'), N('b3'), U('shrine_bamboo'), N('b4'), N('b5'), N('b6'), { node: 'bossB', boss: 'general' }, N('bs1'), N('bs2'), N('vnw'), N('village'), U('elder'),
  N('veast'), N('m0'), N('m1'), N('m2'), N('m3'), U('shrine_marsh'), N('m4'), N('m4s'), U('chest_c_page3'), N('m4'), N('m5'), { node: 'bossM', boss: 'toad' }, N('ms1'), N('ms2'), N('vne'), N('village'), U('scholar'), U('elder'), U('shrine_village'),
  N('vnorth'), U('jang'), N('n1'), N('n2'), N('n3'), N('n4'), U('shrine_north'), N('n5'), { node: 'bossT', boss: 'tiger' }, { end: true },
];

function edgeWaypoints(a, b) {
  for (const e of EDGES) {
    if (e.a === a && e.b === b) return [...e.via.map((v) => [v[0], v[1]]), [NODES[b].x, NODES[b].z]];
    if (e.a === b && e.b === a) return [...e.via.map((v) => [v[0], v[1]]).reverse(), [NODES[b].x, NODES[b].z]];
  }
  return [[NODES[b].x, NODES[b].z]];
}
function nearestNode(x, z) { let best = null, bd = 1e9; for (const id in NODES) { const n = NODES[id], d = Math.hypot(n.x - x, n.z - z) - n.r; if (d < bd) { bd = d; best = id; } } return best; }

export function createAutoplay(o = {}) {
  const I = G.input, keys = new Set();
  const press = (c) => { I.press(c); keys.add(c); }, release = (c) => { if (keys.has(c)) { I.release(c); keys.delete(c); } };
  let tap = null, tapT = 0, atkT = 0, upI = 0;
  const A = {
    gi: 0, way: [], cur: null, log: [], stuckT: 0, lx: 0, lz: 0, done: false, deaths: 0, t: 0, fights: 0, stat: { dodges: 0, fins: 0, stuck: 0, tp: 0 }, lastNode: 'margin',
    note(s) { this.log.push(`${Math.round(this.t)}s g${this.gi} ${s}`); },
    tapKey(c) { if (tap) return; press(c); tap = c; tapT = 0.05; },
    update(rdt) {
      this.t += rdt;
      if (tap) { tapT -= rdt; if (tapT <= 0) { release(tap); tap = null; } }
      const p = G.player, st = G.state;
      for (const c of ['KeyW', 'ShiftLeft', 'KeyA', 'KeyD']) release(c);
      if (this.done) return;
      if (G.ui.screens.cardsActive()) { this.tapKey('KeyE'); return; }
      if (G.ui.dialog.active) { this.tapKey('KeyE'); return; }
      if (st === 'ending') { const b = document.querySelector('.endcard .btn'); if (b) { b.click(); this.done = true; this.note('ending → title'); } return; }
      if (st === 'menu') { // 연적에서는 덧칠, 가게에서는 살 수 있는 만큼
        const pr = G.prog; let guard = 0;
        if (G.ui.menus.name === 'shrine') while (pr.ink >= pr.cost() && guard++ < 20) pr.upgrade(['atk', 'hp', 'atk', 'ink'][upI++ % 4]);
        const act = [...document.querySelectorAll('.panel .act:not([disabled])')].find((b) => !b.closest('.foot'));
        if (act && G.ui.menus.name !== 'shrine') { act.click(); return; }
        G.ui.menus.close(); return;
      }
      if (st === 'dead') { if (!this.wasDead) { this.wasDead = true; this.deaths++; this.note(`죽음 hp0 zone=${F.zone(p.pos.x, p.pos.z)} boss=${G.story.boss ? G.story.boss.key : ''}`); } return; }
      if (this.wasDead && st === 'play') { this.wasDead = false; this.replan(); }
      if (st !== 'play' || !p.alive || G.story.busy()) return;
      // ── 싸움 ──
      let best = null, bd = 1e9, threat = null, fin = null;
      for (const e of G.enemies.list) {
        if (!e.alive || !e.targetable) continue;
        const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
        if ((e.aware || d < 9) && d < bd) { bd = d; best = e; }
        if (e.st === 'windup' && e.windup - e.t < (o.react ?? 0.17) && d < 8) threat = e;
        if (e.staggered && d < 4.8) fin = e;
      }
      if (best && bd < 30) {
        this.stuckT = 0;
        G.cam.yaw = Math.atan2(-(best.pos.x - p.pos.x), -(best.pos.z - p.pos.z));
        if (p.hp < p.maxHp * 0.42 && p.heals > 0 && p.st === 'move') { this.tapKey('KeyR'); return; }
        if (threat && p.st !== 'dodge' && o.dodge !== false && Math.random() < (o.skill ?? 0.85)) { press(Math.random() < 0.5 ? 'KeyA' : 'KeyD'); this.tapKey('Space'); this.stat.dodges++; return; }
        if (fin) { this.tapKey('KeyE'); this.stat.fins++; return; }
        if (bd - best.radius > 2.3) { press('KeyW'); if (bd > 9) press('ShiftLeft'); }
        atkT -= rdt;
        if (bd - best.radius < 3.3 && atkT <= 0) { atkT = 0.15; const r = Math.random(); if (p.ink >= 1 && r < 0.14) this.tapKey(['KeyQ', 'KeyF', 'KeyC'][(Math.random() * 3) | 0]); else if (r < 0.3) this.tapKey('M2'); else this.tapKey('M0'); }
        return;
      }
      if (p.hp < p.maxHp * 0.5 && p.heals > 0 && p.st === 'move') { this.tapKey('KeyR'); return; }
      // ── 길 따라가기 ──
      const g = PLAN[this.gi]; if (!g) { this.done = true; return; }
      if (g.end) { return; }
      if (g !== this.cur) { this.cur = g; this.way = this.route(g); this.stuckT = 0; }
      if (g.use) {
        const it = G.interact.get(g.use);
        if (!it || (it.enabled && !it.enabled())) { this.note(`skip ${g.use}`); this.gi++; return; }
        const d = Math.hypot(it.x - p.pos.x, it.z - p.pos.z);
        if (d < it.r - 0.5 && G.interact.cur === it) { this.tapKey('KeyE'); this.gi++; this.note(`use ${g.use}`); return; }
        if (d < it.r - 0.5 && G.interact.cur && G.interact.cur !== it) { this.walk(it.x + 0.01, it.z, rdt, false); return; }
        this.walk(it.x, it.z, rdt, d > 9); return;
      }
      const w = this.way[0];
      if (!w) { if (g.boss && !G.prog.flags[g.boss]) { const n = NODES[g.node]; this.walk(n.x, n.z, rdt, false); return; } this.lastNode = g.node; this.gi++; return; }
      const d = Math.hypot(w[0] - p.pos.x, w[1] - p.pos.z);
      if (d < 2.6) { this.way.shift(); return; }
      this.walk(w[0], w[1], rdt, d > 7);
    },
    walk(x, z, rdt, sprint) {
      const p = G.player;
      G.cam.yaw = Math.atan2(-(x - p.pos.x), -(z - p.pos.z)); press('KeyW'); if (sprint) press('ShiftLeft');
      // 끼었으면 살짝 옆으로, 그래도 안 되면 다음 지점으로 옮긴다
      this.stuckT += rdt;
      if (this.stuckT > 2.5) {
        const moved = Math.hypot(p.pos.x - this.lx, p.pos.z - this.lz); this.lx = p.pos.x; this.lz = p.pos.z;
        if (moved < 1.2) { this.stat.stuck++; if (this.stat.stuck % 3 === 0) { this.stat.tp++; this.note(`stuck→tp (${Math.round(p.pos.x)},${Math.round(p.pos.z)}) → (${Math.round(x)},${Math.round(z)})`); p.place(x, z); } else this.tapKey('Space'); }
        this.stuckT = 0;
      }
    },
    route(g) {
      if (!g.node) return [];
      const from = this.lastNode && this.lastNode !== g.node ? this.lastNode : nearestNode(G.player.pos.x, G.player.pos.z);
      return edgeWaypoints(from, g.node);
    },
    replan() { // 죽고 다시 일어났을 때: 지금 자리에서 가장 가까운 마당부터 다시
      const near = nearestNode(G.player.pos.x, G.player.pos.z); this.lastNode = near; this.cur = null;
      // 계획에서 그 마당이 마지막으로 나온(지금 목표 이전의) 지점으로 되돌린다
      for (let i = this.gi; i >= 0; i--) if (PLAN[i].node === near) { this.gi = i; return; }
    },
    release() { for (const c of [...keys]) release(c); },
  };
  return A;
}
