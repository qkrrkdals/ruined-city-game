// 연적: 깨우면 둘레로 색이 번져 돌아온다. 쉬면 회복·저장되고, 번진 것들도 다시 번진다.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { F } from '../world/field.js';
import { shrine as shrineProp } from '../world/props.js';
import { Save } from './save.js';
import { P } from '../gfx/particles.js';
import { Slash } from '../gfx/slash.js';

const _p = new THREE.Vector3();

export function createShrines() {
  const list = [];
  const S = {
    list,
    add(id, x, z, restore, o = {}) {
      const g = shrineProp(), y = F.h(x, z); g.position.set(x, y, z); g.rotation.y = o.yaw || 0; G.gfx.scene.add(g);
      F.addCircle(x, z, 1.5);
      const s = { id, x, z, y, restore, g, active: false, pre: !!o.pre, spawn: o.spawn || [x, z + 3.2], dripT: 0 };
      list.push(s);
      G.interact.add({ id: 'shrine_' + id, x, z, r: 3.4, label: () => (s.active ? G.text.shrine.title : G.text.ui.wakeShrine), onUse: () => (s.active ? S.rest(s) : S.wake(s)) });
      return s;
    },
    get(id) { return list.find((s) => s.id === id); },
    activate(s, instant) { s.active = true; s.g.userData.setActive(true); G.world.addRestore(s.x, s.z, s.restore, instant); if (!G.prog.shrines.includes(s.id)) G.prog.shrines.push(s.id); },
    // 처음 깨울 때
    wake(s) {
      const T = G.text;
      S.activate(s, false);
      G.audio.play('shrine'); G.audio.play('wash'); G.cam.shake(0.25); G.fx.gold = 0.7;
      _p.set(s.x, s.y + 1.4, s.z); P.sparks(_p, 40, 9, 0xbfe2e4); P.paperBurst(_p, 14, 5);
      Slash.ring({ pos: _p.set(s.x, s.y, s.z), y: 0.2, r0: 1.2, r1: 2.4, grow: 26, fade: 1.6, color: 0x9fd0d8, dry: 0.3, opacity: 0.7 });
      G.ui.big(T.shrine.wake, T.shrine.wakeSub);
      G.prog.lastShrine = s.id; G.player.fullRestore(); Save.write();
      G.emit('shrineWake', s);
    },
    // 숨 돌리기
    rest(s) {
      G.prog.lastShrine = s.id; G.player.fullRestore(); G.spawner.reset(false); Save.write();
      G.audio.play('rest'); G.fx.gold = 0.4;
      G.emit('rest', s);
      G.ui.menus.show('shrine', () => G.ui.toast(G.text.ui.saved));
    },
    respawnPoint() { const s = S.get(G.prog.lastShrine); return s ? { x: s.spawn[0], z: s.spawn[1], yaw: Math.atan2(s.x - s.spawn[0], s.z - s.spawn[1]) } : null; },
    reset() { for (const s of list) { s.active = false; s.g.userData.setActive(false); } },
    load() { for (const s of list) if (G.prog.shrines.includes(s.id) || s.pre) S.activate(s, true); },
    update(rdt) {
      const p = G.player.pos;
      for (const s of list) {
        if (!s.active) continue;
        const d = Math.hypot(p.x - s.x, p.z - s.z); if (d > 22) continue;
        s.dripT -= rdt;
        if (s.dripT <= 0) { s.dripT = 1.1 + Math.random() * 1.6; const a = s.g.rotation.y; P.ink.spawn(s.x + Math.cos(a) * 0.78, s.y + 1.3, s.z - Math.sin(a) * 0.78, 0, 0, 0, 0.05, 0.5, 0xbfe2e4, 9, 0, 0); if (d < 12) G.audio.play('drop'); }
      }
    },
  };
  return S;
}
