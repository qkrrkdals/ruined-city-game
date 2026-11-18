// 무리(encounter): 주인공이 다가오면 번져 나오고, 멀어지면 사라진다. 쉬거나 죽으면 다시 번진다.
import { G } from '../core/g.js';
import { CFG } from '../core/config.js';

export function createSpawner() {
  const encs = [];
  const S = {
    encs,
    // def: { id, x, z, list:[[종류, dx, dz, {ambush, yaw}]], once(우두머리: 한 번 맺으면 끝), manual(이야기가 직접 부른다), onClear }
    add(def) {
      Object.assign(def, { spawned: false, dead: new Set(), cleared: false, members: [] });
      def.alert = (src) => { for (const e of def.members) if (e !== src && e.alive && !e.aware) e.notice(true); };
      encs.push(def); return def;
    },
    get(id) { return encs.find((e) => e.id === id); },
    spawn(def) {
      if (def.spawned) return;
      def.spawned = true; def.members.length = 0;
      def.list.forEach((m, i) => {
        if (def.dead.has(i)) return;
        const [kind, dx, dz, o] = m;
        const e = G.enemies.spawn(kind, def.x + dx, def.z + dz, { ...(o || {}), enc: def, yaw: (o && o.yaw) ?? Math.atan2(-dx, -dz) + Math.PI });
        e.slot = i; def.members.push(e);
      });
    },
    despawn(def) { for (const e of def.members) if (!e.gone) G.enemies.remove(e); def.members.length = 0; def.spawned = false; },
    // 쉬었거나 죽었을 때: 맺지 않은 우두머리를 뺀 모두가 다시 번진다. full=새 게임
    reset(full) {
      for (const d of encs) { S.despawn(d); if (full || !(d.once && d.cleared)) { d.dead.clear(); d.cleared = false; } }
      G.enemies.clear(); G.shots.clear();
    },
    update() {
      const p = G.player.pos;
      for (const d of encs) {
        if (d.manual || (d.once && d.cleared)) continue;
        const dist = Math.hypot(p.x - d.x, p.z - d.z);
        if (!d.spawned) { if (dist < CFG.spawn.wake) S.spawn(d); }
        else if (dist > CFG.spawn.sleep) { let busy = false; for (const e of d.members) if (e.alive && e.aware) busy = true; if (!busy) S.despawn(d); }
      }
    },
  };
  G.on('enemyDead', (e, finished) => {
    if (G.prog) { G.prog.stats.kills++; if (finished) G.prog.stats.finishers++; }
    const d = e.enc; if (!d) return;
    d.dead.add(e.slot);
    if (!d.cleared && d.dead.size >= d.list.length) { d.cleared = true; if (d.onClear) d.onClear(d); G.emit('encClear', d); }
  });
  return S;
}
