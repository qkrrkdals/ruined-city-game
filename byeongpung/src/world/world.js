// 월드 조립: 지형·하늘·식생·소품·구역 배치.
import { G } from '../core/g.js';
import { buildField, F } from './field.js';
import { buildTerrain } from './terrain.js';
import { buildSky } from './sky.js';
import { NODES } from './layout.js';
import { U, setRestore } from '../gfx/materials.js';
import { buildScatter, pineGeo } from './scatter.js';
import { Kit } from './kit.js';
import { makeHelpers, buildSouthAndVillage } from './regions_a.js';
import { buildWestEastNorth } from './regions_b.js';

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
    clearRestores() { this.restores.length = 0; for (let i = 0; i < 8; i++) setRestore(i, 0, 0, 0, 0); },
    // 그 자리에 색이 돌아왔는가
    restoredAt(x, z) { if (U.uSat.value > 0.5) return true; for (const s of this.restores) if (Math.hypot(x - s.x, z - s.z) < s.cur * 0.85) return true; return false; },
    // 식생·소품·적 무리·사람들을 놓는다(시스템들이 준비된 뒤에 부른다)
    populate() {
      this.scatter = buildScatter(scene);
      const kit = new Kit(scene), H = makeHelpers(kit);
      buildSouthAndVillage(H); buildWestEastNorth(H, pineGeo);
      kit.build();
      this.shrines = G.shrines.list;
    },
    update(dt, rdt) {
      terrain.update(G.real); sky.update(rdt); if (this.scatter) this.scatter.update(rdt);
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
