// Interaction targeting: nearest registered interactable in front of the camera (angle + distance + line of sight).
// Items: { id, pos | getPos(v), r, range, verb, name, enabled(), onUse(), accepts, onInsert(prop) }
import * as THREE from 'three';
import { CFG } from '../core/config.js';
import { t } from '../i18n/i18n.js';

const _f = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3();
const key = (k) => `<span class="k">${k}</span>`;

export class Interact {
  constructor(G) { this.G = G; this.items = []; this.target = null; }
  add(it) { this.items.push(it); return it; }
  remove(it) { const i = this.items.indexOf(it); if (i >= 0) this.items.splice(i, 1); if (this.target === it) this.target = null; }
  find(id) { return this.items.find((i) => i.id === id); }
  pick(carrying) {
    const G = this.G, eye = G.camera.position, fwd = _f.set(0, 0, -1).applyQuaternion(G.camera.quaternion);
    let best = null, bestScore = 1e9;
    for (const it of this.items) {
      if (it.enabled && !it.enabled()) continue;
      if (carrying && it.accepts !== carrying.kind) continue;
      if (!carrying && it.accepts && !it.onUse) continue;
      const p = it.getPos ? it.getPos(_p) : it.pos, r = it.r ?? 0.3;
      const d = p.distanceTo(eye);
      if (d > (it.range ?? CFG.interactDist) + r * 0.5 || d < 0.05) continue;
      _d.subVectors(p, eye).multiplyScalar(1 / d);
      const cos = _d.dot(fwd); if (cos < 0.6) continue;
      const ang = Math.acos(Math.min(1, cos));
      if (ang > Math.atan2(r, d) + 0.09) continue;
      const score = ang + d * 0.04;
      if (score >= bestScore) continue;
      const hit = G.world.col.ray(eye, _d, Math.max(0.01, d - r - 0.06), !it.ignoreDyn);
      if (hit) continue;
      best = it; bestScore = score;
    }
    return best;
  }
  update() {
    const G = this.G, props = G.props, carrying = props.carrying;
    this.target = this.pick(carrying);
    const tg = this.target;
    let prompt = '';
    if (tg) prompt = `${key('E')}${t('verb.' + (carrying ? 'insert' : tg.verb))}<span class="sub">${t(tg.name)}</span>`;
    G.ui.prompt(prompt);
    if (carrying) {
      const parts = [`${t('hud.holding', { name: t('items.' + carrying.kind) })}`, `${key('E')}${t('verb.drop')}`];
      if (carrying.throwable) parts.push(`${key(t('hud.click'))}${t('verb.throw')}`);
      G.ui.holding(parts.join('&nbsp;&nbsp;'));
    } else G.ui.holding('');
    if (!G.player.enabled) return;
    if (G.input.pressed('KeyE')) {
      if (carrying) { if (tg && tg.onInsert) tg.onInsert(carrying); else props.drop(); }
      else if (tg) tg.onUse();
    } else if (carrying && carrying.throwable && G.input.click(0)) props.throwHeld();
  }
}
