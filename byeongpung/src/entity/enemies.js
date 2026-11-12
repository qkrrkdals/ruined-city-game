// 적 목록: 만들기·매 프레임 갱신·서로 밀어내기.
import { G } from '../core/g.js';
import { HumanoidEnemy, HUMANOID } from './enemies/soldier.js';
import { Inkling, INKLING } from './enemies/inkling.js';
import { Combat } from './combat.js';

export const KINDS = {
  inkling: [Inkling, INKLING],
  soldier: [HumanoidEnemy, HUMANOID.soldier], shield: [HumanoidEnemy, HUMANOID.shield], elite: [HumanoidEnemy, HUMANOID.elite], general: [HumanoidEnemy, HUMANOID.general],
};
export function registerKind(name, cls, def) { KINDS[name] = [cls, def]; }

export function createEnemies() {
  const E = {
    list: [],
    spawn(kind, x, z, o = {}) {
      const k = KINDS[kind]; if (!k) throw new Error('unknown enemy ' + kind);
      const e = new k[0](k[1], x, z, o); this.list.push(e); return e;
    },
    remove(e) { e.alive = false; e.dispose(); const i = this.list.indexOf(e); if (i >= 0) this.list.splice(i, 1); if (G.cam.target === e) G.cam.target = null; },
    clear() { for (const e of this.list) { e.alive = false; e.dispose(); } this.list.length = 0; Combat.reset(); if (G.cam) G.cam.target = null; },
    // 깨어 있는(주인공을 알아챈) 적이 있는가
    get fighting() { for (const e of this.list) if (e.alive && e.aware && e.st !== 'return' && e.st !== 'sleep') return true; return false; },
    update(dt) {
      const l = this.list;
      for (let i = l.length - 1; i >= 0; i--) { const e = l[i]; e.update(dt); if (e.gone) l.splice(i, 1); }
      // 서로 겹치지 않게
      for (let i = 0; i < l.length; i++) {
        const a = l[i]; if (!a.alive || !a.solid) continue;
        for (let j = i + 1; j < l.length; j++) {
          const b = l[j]; if (!b.alive || !b.solid) continue;
          const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), min = a.radius + b.radius;
          if (d < min && d > 1e-4) { const k = (min - d) / d, wa = b.mass / (a.mass + b.mass), wb = 1 - wa; a.pos.x -= dx * k * wa; a.pos.z -= dz * k * wa; b.pos.x += dx * k * wb; b.pos.z += dz * k * wb; }
        }
      }
      if (G.cam.target && !G.cam.target.alive) G.cam.target = null;
    },
  };
  return E;
}
