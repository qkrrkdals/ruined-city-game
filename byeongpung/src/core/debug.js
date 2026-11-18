// 개발·자동 점검용 훅(window.__game). 주소에 ?debug 또는 #debug 가 있을 때 화면 표시도 켠다.
import { G } from './g.js';
import { tick } from './game.js';
import { NODES } from '../world/layout.js';
import { F } from '../world/field.js';
import * as HA from '../entity/hanim.js';
import { buildHumanoid } from '../entity/humanoid.js';
import { newPose, applyPose } from '../entity/rig.js';
import { createAudio } from '../systems/audio/engine.js';
import { SFX } from '../systems/audio/sfx.js';
import { createAutoplay, PLAN } from './autoplay.js';

export function installDebug() {
  window.__game = {
    G,
    get ready() { return !!G.ready; },
    freeze(b = true) { G.frozen = b; },
    renderOnce() { const t = performance.now(); G.gfx.render(); return Math.round(performance.now() - t); },
    sim(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) tick(dt); },
    // 이름(노드) 또는 [x,z] 로 순간 이동. yaw=주인공이 보는 방향
    tp(where, yaw, pitch, dist) {
      const p = G.player; let x, z;
      if (typeof where === 'string') { const n = NODES[where]; x = n.x; z = n.z; } else { [x, z] = where; }
      p.pos.set(x, F.h(x, z), z);
      if (p.vel) p.vel.set(0, 0, 0);
      if (yaw !== undefined && yaw !== null) { p.yaw = yaw; G.cam.setBehind(yaw); }
      if (pitch !== undefined && pitch !== null) G.cam.pitch = pitch;
      if (dist !== undefined && dist !== null) G.cam.dist = dist;
      G.cam.snap();
    },
    // 자세 점검: 주인공 자리에 시험용 모델을 세우고 자세 함수를 입힌다
    poseRig(kind = 'hero') {
      if (this._rig) G.gfx.scene.remove(this._rig.root);
      const r = buildHumanoid(kind); this._rig = r; this._pose = newPose();
      r.root.position.copy(G.player.pos); r.root.rotation.y = G.player.yaw; G.gfx.scene.add(r.root);
      return Object.keys(r.j);
    },
    pose(fn, ...args) { HA[fn](this._pose, ...args); applyPose(this._rig, this._pose); return this._pose; },
    view(yawOff = 0, pitch = 0.2, dist = 4) { G.cam.yaw = G.player.yaw + Math.PI + yawOff; G.cam.pitch = pitch; G.cam.dist = dist; G.cam.snap(); },
    // 제목과 여는 글을 건너뛰고 바로 놀이 상태로. o: { flags, arts, armed }
    start(o = {}) {
      G.ui.screens.hideAll(); G.story.reset(); G.story.started = true;
      Object.assign(G.prog.flags, { brush: true, ...(o.flags || {}) });
      if (o.arts) for (const a of o.arts) G.prog.arts[a] = true;
      G.shrines.load(); G.pickups.load(); G.story.ch.load();
      const p = G.player; p.armed = o.armed !== false; G.prog.apply(); p.fullRestore(); p.frozen = false; p.setState('move', 0);
      G.cam.cine = null; G.fx.setBars(false); G.fx.fade = 0; G.fx.fadeTo = 0; G.state = 'play'; G.story.objective();
    },
    spawn(kind, dx = 0, dz = 4, o = {}) { const p = G.player; return !!G.enemies.spawn(kind, p.pos.x + dx, p.pos.z + dz, o); },
    // 자동 전투(점검용): 가까운 적에게 다가가 치고, 예고가 끝날 즈음 피하고, 흐트러지면 맺는다
    bot(on = true, o = {}) {
      if (!on) { G.bot = null; G.input.releaseAll(); return; }
      const I = G.input; let tA = 0, hold = null, stat = { dodges: 0, attacks: 0, fins: 0 };
      const tapKey = (c) => { I.press(c); hold = c; };
      G.bot = { stat, update(rdt) {
        if (hold) { I.release(hold); hold = null; }
        const p = G.player; if (!p.alive || G.state !== 'play') { I.releaseAll(); return; }
        let best = null, bd = 1e9, threat = null, fin = null;
        for (const e of G.enemies.list) {
          if (!e.alive || !e.targetable) continue;
          const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
          if (d < bd) { bd = d; best = e; }
          if (e.st === 'windup' && e.windup - e.t < (o.react ?? 0.16) && d < 6.5) threat = e;
          if (e.staggered && d < 5) fin = e;
        }
        for (const c of ['KeyW', 'KeyA', 'KeyD', 'KeyS']) I.release(c);
        if (!best) return;
        G.cam.yaw = Math.atan2(-(best.pos.x - p.pos.x), -(best.pos.z - p.pos.z));
        if (o.heal !== false && p.hp < p.maxHp * 0.4 && p.heals > 0 && p.st === 'move') { tapKey('KeyR'); return; }
        if (threat && o.dodge !== false && p.st !== 'dodge') { I.press(Math.random() < 0.5 ? 'KeyA' : 'KeyD'); tapKey('Space'); stat.dodges++; return; }
        if (fin) { tapKey('KeyE'); stat.fins++; return; }
        if (bd - best.radius > 2.3) I.press('KeyW');
        tA -= rdt;
        if (bd - best.radius < 3.2 && tA <= 0) { tA = 0.14; if (o.arts && p.ink >= 1 && Math.random() < 0.2) tapKey(['KeyQ', 'KeyF', 'KeyC'][(Math.random() * 3) | 0]); else if (o.heavy && Math.random() < 0.25) { tapKey('M2'); } else tapKey('M0'); stat.attacks++; }
      } };
    },
    // 소리 점검: 효과음·음악을 오프라인으로 렌더링해 크기(최댓값·RMS)와 길이를 잰다
    async audioTest(names, moods) {
      const res = {}, measure = (buf) => { const d = buf.getChannelData(0); let peak = 0, sum = 0, last = 0; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += a * a; if (a > 0.002) last = i; } return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4), dur: +(last / buf.sampleRate).toFixed(2), nan: Number.isNaN(sum) }; };
      for (const n of names || Object.keys(SFX)) {
        const oc = new OfflineAudioContext(2, 44100 * 5, 44100), A = createAudio(); A.init(oc);
        A.play(n, { power: 2, note: 3, n: 2, kind: 'inkling', size: 3, lv: 1, id: 'dot' });
        res[n] = measure(await oc.startRendering());
      }
      for (const m of moods || []) {
        const oc = new OfflineAudioContext(2, 44100 * 24, 44100), A = createAudio(); A.init(oc);
        A.music.setMood(m); for (let t = 0; t < 23; t += 0.25) A.music.update(0, t);
        res['music:' + m] = measure(await oc.startRendering());
      }
      return res;
    },
    // 처음부터 결말까지 자동 플레이. o: { god, react, skill, from(계획의 몇 번째부터) }
    autoplay(o = {}) { G.god = !!o.god; G.bot = createAutoplay(o); if (o.from) G.bot.gi = o.from; return PLAN.length; },
    autoStatus() {
      const b = G.bot, p = G.player, pr = G.prog, g = PLAN[b.gi] || {};
      return { t: Math.round(b.t), gi: b.gi, goal: g.node || g.use || (g.end ? 'end' : ''), state: G.state, pos: [Math.round(p.pos.x), Math.round(p.pos.z)], hp: Math.round(p.hp), maxHp: p.maxHp, ink: Math.round(pr.ink), lv: pr.level, weapon: pr.weapon, arts: pr.artCount, deaths: b.deaths, kills: pr.stats.kills, fins: pr.stats.finishers, done: b.done, boss: G.story.boss ? `${G.story.boss.key}:${Math.round(G.story.boss.e.hp)}` : '', stat: b.stat, log: b.log.splice(0) };
    },
    enemies() { return G.enemies.list.map((e) => ({ kind: e.kind, st: e.st, hp: Math.round(e.hp), posture: Math.round(e.posture), d: +e.distP.toFixed(1) })); },
    info() {
      const p = G.player;
      return { state: G.state, st: p.st, hp: Math.round(p.hp), ink: +(p.ink || 0).toFixed(2), enemies: G.enemies ? G.enemies.list.filter((e) => e.alive).length : 0, pos: [+p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)], sdf: +F.sdf(p.pos.x, p.pos.z).toFixed(2), zone: F.zone(p.pos.x, p.pos.z), calls: G.gfx.renderer.info.render.calls, tris: G.gfx.renderer.info.render.triangles };
    },
  };
}
