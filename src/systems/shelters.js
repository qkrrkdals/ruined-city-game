// Shelters: warm-lamp safe zones. Remnants cannot enter. Entering one = checkpoint (and autosave in stage 4).
import { t } from '../i18n/i18n.js';

export class Shelters {
  constructor(G) {
    this.G = G; this.list = []; this.inside = null;
    for (const id of ['s1', 's2', 's3', 's4', 's5']) {
      const a = G.world.anchors.get(id);
      if (a) this.list.push({ id, pos: a.pos, yaw: a.yaw ?? 0, r: a.r ?? 4.5 });
    }
    this.current = this.list[0];
  }
  at(p) { return this.list.find((s) => Math.hypot(p.x - s.pos.x, p.z - s.pos.z) < s.r && Math.abs(p.y - s.pos.y) < 2.6) || null; }
  get(id) { return this.list.find((s) => s.id === id); }
  update() {
    const s = this.at(this.G.player.feet);
    if (s !== this.inside) {
      this.inside = s;
      if (s) {
        const first = this.current !== s;
        this.current = s;
        this.G.events.emit('shelterEnter', s, first);
        if (first) this.G.ui.toast(t('hud.shelter'));
      }
    }
  }
  respawnPlayer() { const s = this.current; this.G.player.spawn(s.pos.x, s.pos.y, s.pos.z, s.yaw); this.inside = s; }
}
