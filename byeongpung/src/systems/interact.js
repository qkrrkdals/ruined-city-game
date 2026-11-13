// 상호작용(E): 가까이 있는 대상 가운데 가장 알맞은 것을 고르고, 안내 문구를 띄운다.
import { G } from '../core/g.js';

export function createInteract() {
  const list = [];
  const I = {
    list, cur: null,
    // o: { id, x, z, y, r, label(문구 또는 함수), enabled(함수), onUse(함수) }
    add(o) { o.r = o.r || 2.4; list.push(o); return o; },
    remove(id) { const i = list.findIndex((x) => x.id === id); if (i >= 0) list.splice(i, 1); },
    get(id) { return list.find((x) => x.id === id); },
    update() {
      this.cur = null;
      const p = G.player;
      if (G.state !== 'play' || !p.alive || p.st !== 'move' || (G.enemies.fighting && !G.peace)) return;
      let bd = 1e9;
      for (const o of list) {
        if (o.enabled && !o.enabled()) continue;
        const d = Math.hypot(o.x - p.pos.x, o.z - p.pos.z);
        if (d < o.r && d < bd) { bd = d; this.cur = o; }
      }
    },
    use() { const o = this.cur; if (!o) return false; G.input.clear(); o.onUse(o); return true; },
    label() { const o = this.cur; return o ? (typeof o.label === 'function' ? o.label() : o.label) : null; },
  };
  return I;
}
