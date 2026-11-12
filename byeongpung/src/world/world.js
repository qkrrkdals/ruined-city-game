// 월드 조립: 지형·하늘·식생·소품·구역 배치.
import { G } from '../core/g.js';
import { buildField, F } from './field.js';
import { buildTerrain } from './terrain.js';
import { buildSky } from './sky.js';
import { NODES } from './layout.js';
import { U, setRestore } from '../gfx/materials.js';

export function buildWorld() {
  const scene = G.gfx.scene;
  buildField();
  const terrain = buildTerrain(scene);
  const sky = buildSky(scene);
  const W = {
    F, terrain, sky, anchors: {}, updaters: [],
    restores: [],               // 색이 돌아온 곳: { x, z, r, target, cur }
    anchor(id, x, z, data = {}) { this.anchors[id] = { id, x, z, y: F.h(x, z), ...data }; return this.anchors[id]; },
    node(id) { return NODES[id]; },
    // 연적이 깨어나면 그 둘레로 담채가 번진다
    addRestore(x, z, r, instant) {
      const i = this.restores.length; if (i >= 8) return;
      const s = { x, z, r, cur: instant ? r : 0 }; this.restores.push(s); setRestore(i, x, z, s.cur, 1);
      return s;
    },
    update(dt, rdt) {
      terrain.update(G.real); sky.update(rdt);
      for (let i = 0; i < this.restores.length; i++) {
        const s = this.restores[i];
        if (s.cur < s.r) { s.cur = Math.min(s.r, s.cur + (18 + s.cur * 0.55) * rdt); setRestore(i, s.x, s.z, s.cur, 1); }
      }
      if (G.player) U.uMistY.value = G.player.pos.y;
      for (const u of this.updaters) u(dt, rdt);
    },
  };
  return W;
}
