// 이야기의 뼈대: 순서 실행기(코루틴), 대화·연출 도우미, 길잡이, 구역·음악, 죽음과 다시 일어남, 시작·이어하기.
import { G } from '../core/g.js';
import { F } from '../world/field.js';
import { createProg } from '../systems/prog.js';
import { Save } from '../systems/save.js';
import { U } from '../gfx/materials.js';
import { HEX } from '../gfx/palette.js';
import { installChapter } from './chapter.js';

const ZMOOD = ['margin', 'pine', 'village', 'bamboo', 'marsh', 'north'], ZKEY = ['margin', 'pine', 'village', 'bamboo', 'marsh', 'north'];

export function createStory() {
  const T = G.text;
  const S = {
    co: null, queue: [], triggers: [], objTarget: null, zone: -1, zoneT: 0, fightT: 0, boss: null, started: false, ch: null,
    get flags() { return G.prog.flags; },
    // 순서대로 실행되는 연출. gen 은 제너레이터 함수. yield 초(실제 시간) 또는 yield ()=>참이 될 때까지
    run(gen) { this.queue.push(gen); },
    busy() { return !!this.co || this.queue.length > 0; },
    trigger(o) { o.done = false; this.triggers.push(o); return o; },
    // ── 연출 도우미(제너레이터 안에서 yield* 로 부른다) ──
    *say(key, o) {
      const lines = Array.isArray(key) ? key : T.dlg[key], prev = G.state, p = G.player;
      if (prev === 'play') { G.state = 'dialog'; p.frozen = true; G.peace = true; }
      let done = false; G.ui.dialog.open(lines, () => { done = true; }, o);
      yield () => done;
      if (prev === 'play') { G.state = 'play'; p.frozen = false; G.peace = false; }
    },
    cine(on) {
      const p = G.player;
      if (on) { G.state = 'cine'; p.frozen = true; G.peace = true; G.fx.setBars(true); G.input.clear(); G.cam.target = null; }
      else { G.state = 'play'; p.frozen = false; G.peace = false; G.fx.setBars(false); G.cam.cine = null; G.input.clear(); }
    },
    // 까치가 날아와 앉는다(perch 앵커 이름)
    *magpie(perch) {
      const a = G.world.anchors['perch_' + perch], m = G.magpie; if (!a) return;
      if (!m.visible || Math.hypot(m.pos.x - a.x, m.pos.z - a.z) > 70) m.perch(a.x + 16, a.top + 13, a.z + 12);
      if (Math.hypot(m.pos.x - a.x, m.pos.z - a.z) < 0.5) return;
      let ok = false; m.flyTo(a.x, a.z, 0, () => { ok = true; }, a.top); yield () => ok;
    },
    readMemo(i, first) {
      this.run(function* () { yield* S.say([['memo', T.memos[i]]], { memo: true }); if (first) G.ui.toast(`${T.memoCount} ${G.prog.memos.length} / ${T.memos.length}`); });
    },
    objective() { const o = this.ch.objective(); this.objTarget = o.target || null; G.ui.setObjective(o.key, o.target); },

    // ── 시작·이어하기·초기화 ──
    reset() {
      this.co = null; this.queue.length = 0; this.boss = null; this.zone = -1; this.started = false;
      for (const t of this.triggers) t.done = false;
      G.spawner.reset(true); G.shrines.reset(); G.pickups.reset(); G.world.clearRestores(); G.loot.clear();
      U.uSat.value = 0; G.peace = false; G.player.frozen = false; G.cam.cine = null; G.cam.target = null; G.fx.setBars(false);
      G.ui.showBoss(null); G.ui.setObjective(null); G.magpie.hide();
      G.prog = createProg(); this.ch.reset();
    },
    start(save) {
      this.reset(); this.started = true;
      if (save) G.prog.load(save);
      G.shrines.load(); G.pickups.load(); this.ch.load();
      const p = G.player; p.armed = !!G.prog.flags.brush; p.ink = 0; G.prog.apply(); p.fullRestore();
      G.flow.applySettings();
      if (save) {
        const r = G.shrines.respawnPoint() || { x: 0, z: 240, yaw: Math.PI };
        p.respawn(r.x, r.z, r.yaw); G.cam.setBehind(r.yaw); G.cam.pitch = 0.3; G.cam.snap();
        G.fx.fade = 1; G.fx.fadeIn(1); G.state = 'play'; this.objective();
      } else { G.state = 'cine'; G.fx.fade = 1; G.fx.fadeTo = 1; this.run(this.ch.intro); }
    },
    respawn() {
      G.spawner.reset(false); this.ch.onRespawn(); this.boss = null; G.ui.showBoss(null);
      const r = G.shrines.respawnPoint() || { x: 0, z: 240, yaw: Math.PI };
      G.player.respawn(r.x, r.z, r.yaw); G.cam.setBehind(r.yaw); G.cam.pitch = 0.3; G.cam.snap();
    },

    update(dt, rdt) {
      if (!this.started) return;
      // 순서 실행
      for (let guard = 0; guard < 40; guard++) {
        if (!this.co) { if (!this.queue.length) break; this.co = { gen: this.queue.shift()(), wait: null }; }
        const c = this.co;
        if (c.wait !== null) { if (typeof c.wait === 'number') { c.wait -= rdt; if (c.wait > 0) break; } else if (!c.wait()) break; c.wait = null; }
        const r = c.gen.next();
        if (r.done) { this.co = null; continue; }
        c.wait = r.value === undefined ? 0 : r.value;
        if (typeof c.wait === 'number' ? c.wait > 0 : !c.wait()) break;
        c.wait = null;
      }
      const p = G.player;
      if (G.state === 'play') {
        G.prog.stats.time += rdt;
        // 발동 지점
        if (!this.busy() && p.alive) {
          for (const t of this.triggers) {
            if (t.done || Math.hypot(p.pos.x - t.x, p.pos.z - t.z) > t.r) continue;
            if (t.cond && !t.cond()) continue;
            if (t.calm !== false && G.enemies.fighting) continue;
            if (t.once !== false) t.done = true;
            t.fn(); break;
          }
        }
        G.spawner.update();
      }
      G.interact.update(); G.shrines.update(rdt); G.pickups.update(dt); G.magpie.update(dt);
      if (G.world.npcs) for (const k in G.world.npcs) G.world.npcs[k].update(dt);
      this.ch.update(dt, rdt);
      // 구역 이름·음악
      this.zoneT -= rdt;
      if (this.zoneT <= 0) {
        this.zoneT = 0.35;
        const z = F.zone(p.pos.x, p.pos.z);
        if (z !== this.zone && G.state === 'play') {
          this.zone = z;
          if (!this.flags['z' + z] && z > 0) { this.flags['z' + z] = true; G.ui.banner(T.zones[ZKEY[z]]); }
        }
        if (G.enemies.fighting) this.fightT = 2.2; else this.fightT -= 0.35;
        let mood = this.boss ? this.boss.mood : this.fightT > 0 ? 'combat' : this.flags.tiger ? 'calm' : ZMOOD[Math.max(0, this.zone)];
        if (G.state === 'title') mood = 'margin';
        G.audio.setMood(mood);
        if (G.audio.ready) G.audio.music.setBright(G.world.restoredAt(p.pos.x, p.pos.z));
      }
    },
  };
  // 죽음 → 마지막 연적에서 다시
  G.on('playerDead', () => {
    S.queue.length = 0; S.co = null;
    S.run(function* () {
      G.state = 'dead'; G.prog.stats.deaths++; yield 1.4;
      G.ui.screens.death(true); yield 2.6;
      G.fx.fadeOut(2.5, HEX.ink); yield 0.6;
      G.ui.screens.death(false); S.respawn();
      G.gfx.pu.uFadeCol.value.set(HEX.ink); G.fx.fadeIn(1.2); G.state = 'play'; S.objective();
      yield 1; G.gfx.pu.uFadeCol.value.set(HEX.paper);
    });
  });
  S.ch = installChapter(S);
  return S;
}
