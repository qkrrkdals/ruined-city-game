// 궤(상자)·먹물 항아리·화공의 쪽글. 열거나 읽은 것은 저장된다.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { F } from '../world/field.js';
import { chest as chestProp, jar as jarProp } from '../world/props.js';
import { MAT } from '../gfx/materials.js';
import { P } from '../gfx/particles.js';

const _p = new THREE.Vector3();

export function createPickups() {
  const chests = [], jars = [], memos = [];
  const K = {
    chests, jars, memos,
    // loot: { charm } | { item:'dew'|'page'|'bristle' } | { ink }
    chest(id, x, z, yaw, loot) {
      const g = chestProp(); g.position.set(x, F.h(x, z), z); g.rotation.y = yaw; G.gfx.scene.add(g); F.addCircle(x, z, 0.65);
      const c = { id, x, z, g, loot, open: false, t: 0 }; chests.push(c);
      G.interact.add({ id: 'chest_' + id, x, z, r: 2.4, label: chestLabel, enabled: () => !c.open, onUse: () => K.openChest(c) });
      return c;
    },
    openChest(c, silent) {
      c.open = true; c.t = silent ? 1 : 0; if (silent) c.g.userData.lid.rotation.x = -1.25;
      if (silent) return;
      const T = G.text, pr = G.prog, L = c.loot; pr.chests.push(c.id);
      G.audio.play('chest'); _p.set(c.x, F.h(c.x, c.z) + 0.8, c.z); P.sparks(_p, 16, 5, 0xc9a24a); G.fx.gold = 0.35;
      if (L.charm) { pr.addCharm(L.charm); G.ui.big(T.charms[L.charm].name, T.toast.get); G.ui.toast(T.charms[L.charm].name, T.charms[L.charm].desc); }
      else if (L.item) {
        if (L.item === 'dew') { pr.dew++; pr.apply(); G.player.heals = G.player.healsMax; } else if (L.item === 'page') pr.pages++; else if (L.item === 'bristle') pr.bristle++;
        G.ui.big(T.items[L.item].name, T.toast.get); G.ui.toast(T.items[L.item].name + (L.item === 'page' ? ` ${pr.pages} / 3` : ''), T.items[L.item].desc);
      }
      if (L.ink) { G.loot.ink(_p, L.ink); if (!L.charm && !L.item) G.ui.toast(`${T.toast.inkGet} +${L.ink}`); }
      G.emit('chest', c);
    },
    jar(id, x, z, ink) {
      const parts = jarProp(), g = new THREE.Group();
      for (const [geo, m] of parts) g.add(new THREE.Mesh(geo, MAT[m]));
      g.position.set(x, F.h(x, z), z); G.gfx.scene.add(g);
      const j = { id, x, z, g, ink, taken: false }; jars.push(j);
      G.interact.add({ id: 'jar_' + id, x, z, r: 2.2, label: () => G.text.items.jar.name, enabled: () => !j.taken, onUse: () => { K.takeJar(j); G.prog.chests.push(j.id); G.audio.play('item'); _p.set(x, F.h(x, z) + 0.5, z); G.loot.ink(_p, ink); P.sparks(_p, 8, 4, 0x6f8fb8); G.ui.toast(`${G.text.toast.inkGet} +${ink}`); } });
      return j;
    },
    takeJar(j) { j.taken = true; j.g.visible = false; },
    // 쪽글: 돌은 Kit 로 따로 세운다. 여기서는 읽기만.
    memo(i, x, z) {
      memos.push({ i, x, z });
      G.interact.add({ id: 'memo_' + i, x, z, r: 2.6, label: () => G.text.ui.read, onUse: () => {
        const pr = G.prog, first = !pr.memos.includes(i); if (first) pr.memos.push(i);
        G.story.readMemo(i, first);
      } });
    },
    reset() { for (const c of chests) { c.open = false; c.g.userData.lid.rotation.x = 0; } for (const j of jars) { j.taken = false; j.g.visible = true; } },
    load() { const got = G.prog.chests; for (const c of chests) if (got.includes(c.id)) K.openChest(c, true); for (const j of jars) if (got.includes(j.id)) K.takeJar(j); },
    update(dt) { for (const c of chests) if (c.open && c.t < 1) { c.t = Math.min(1, c.t + dt * 2.6); c.g.userData.lid.rotation.x = -1.25 * (1 - (1 - c.t) * (1 - c.t)); } },
  };
  const chestLabel = () => G.text.ui.chest;
  return K;
}
