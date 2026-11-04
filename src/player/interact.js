// Interaction targeting: nearest registered interactable in front of the camera (angle + distance + line of sight).
// Items: { id, pos | getPos(v), r, range, verb, name, enabled(), idle (i18n key shown when not usable yet),
//          onUse(), accepts, onInsert(prop) }
// Feedback: a glowing ring on the target, a dim "closer" prompt for things in view but out of reach, faint
// sparkles on nearby interactables (setting), and when carrying a fuse the nearest socket is used even if
// you aim a little off. Holding E (0.45 s) always drops what you carry.
import * as THREE from 'three';
import { CFG } from '../core/config.js';
import { t } from '../i18n/i18n.js';
import { ringTexture, dotTexture } from '../world/textures.js';

const _f = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Vector3();
const key = (k) => `<span class="k">${k}</span>`;
const HOLD = 0.45, SPARK_N = 24, SPARK_R = 6;

export class Interact {
  constructor(G) {
    this.G = G; this.items = []; this.target = null; this.far = null; this.snap = null; this.hold = -1; this.holdDone = false;
    this.ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture(), color: new THREE.Color('#ffe2a6'), transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
    this.ring.renderOrder = 20; this.ring.visible = false; G.scene.add(this.ring);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARK_N * 3), 3)); sg.setDrawRange(0, 0);
    this.spark = new THREE.Points(sg, new THREE.PointsMaterial({ map: dotTexture(), size: 0.09, color: new THREE.Color('#fff2c8').multiplyScalar(1.3), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.spark.frustumCulled = false; this.spark.visible = false; G.scene.add(this.spark);
    this.warm = [this.ring, this.spark];
  }
  add(it) { this.items.push(it); return it; }
  remove(it) { const i = this.items.indexOf(it); if (i >= 0) this.items.splice(i, 1); if (this.target === it) this.target = null; }
  find(id) { return this.items.find((i) => i.id === id); }
  pos(it, v) { return it.getPos ? it.getPos(v) : v.copy(it.pos); }
  usable(it) { return !it.enabled || it.enabled(); }
  // aimed candidates: in reach -> target; usable later / out of reach but visible -> far (dim prompt)
  pick(carrying) {
    const G = this.G, eye = G.camera.position, fwd = _f.set(0, 0, -1).applyQuaternion(G.camera.quaternion);
    let best = null, bestScore = 1e9, far = null, farScore = 1e9;
    for (const it of this.items) {
      const usable = this.usable(it);
      if (!usable && !it.idle) continue;
      if (carrying && it.accepts !== carrying.kind) continue;
      if (!carrying && it.accepts && !it.onUse) continue;
      const p = this.pos(it, _p), r = it.r ?? 0.3;
      const d = p.distanceTo(eye);
      if (d > SPARK_R || d < 0.05) continue;
      _d.subVectors(p, eye).multiplyScalar(1 / d);
      const cos = _d.dot(fwd); if (cos < 0.6) continue;
      const ang = Math.acos(Math.min(1, cos));
      if (ang > Math.atan2(Math.max(r, 0.3), d) + 0.12) continue;
      const score = ang + d * 0.04, reach = d - r * 0.6 <= (it.range ?? CFG.interactDist);
      const inReach = reach && usable;
      if (inReach ? score >= bestScore : score >= farScore) continue;
      if (G.world.col.ray(eye, _d, Math.max(0.01, d - r - 0.06), !it.ignoreDyn)) continue;
      if (inReach) { best = it; bestScore = score; } else { far = it; farScore = score; }
    }
    this.far = best ? null : far;
    return best;
  }
  // carrying something insertable: nearest accepting target within 3 m that you can see
  nearestSocket(carrying) {
    const eye = this.G.camera.position; let best = null, bd = 3;
    for (const it of this.items) {
      if (it.accepts !== carrying.kind || !this.usable(it)) continue;
      const p = this.pos(it, _p), d = p.distanceTo(eye); if (d >= bd) continue;
      _d.subVectors(p, eye).multiplyScalar(1 / d);
      if (this.G.world.col.ray(eye, _d, Math.max(0.01, d - (it.r ?? 0.3) - 0.06), !it.ignoreDyn)) continue;
      best = it; bd = d;
    }
    return best;
  }
  update(dt) {
    const G = this.G, props = G.props, carrying = props.carrying, pl = G.player;
    this.target = pl.airTime < 0.3 || carrying ? this.pick(carrying) : null;
    this.snap = carrying && !this.target && carrying.kind !== 'crate' ? this.nearestSocket(carrying) : null;
    const tg = this.target || this.snap;
    let prompt = '';
    if (tg) prompt = `${key('E')}${t('verb.' + (carrying ? 'insert' : tg.verb))}<span class="sub">${t(tg.name)}</span>`;
    else if (this.far) prompt = `<span class="far">${t(this.far.name)}<span class="sub">${t(this.usable(this.far) ? 'hud.closer' : this.far.idle)}</span></span>`;
    else if (pl.mantleHint && !carrying) prompt = `${key('Space')}${t('verb.climb')}`;
    G.ui.prompt(prompt, !!tg);
    if (carrying) {
      const parts = [`${t('hud.holding', { name: t('items.' + carrying.kind) })}`, `${key('E')}${t(tg ? 'hud.holdToDrop' : 'verb.drop')}`];
      if (carrying.throwable) parts.push(`${key(t('hud.click'))}${t('verb.throw')}`);
      G.ui.holding(parts.join('&nbsp;&nbsp;'));
    } else G.ui.holding('');
    this.markers(dt, tg);
    if (!pl.enabled) { this.hold = -1; return; }
    const inp = G.input;
    if (inp.pressed('KeyE')) {
      this.hold = 0; this.holdDone = false;
      if (!carrying) { if (this.target) this.target.onUse(); this.hold = -1; }
      else if (this.target && this.target.onInsert) { this.target.onInsert(carrying); this.hold = -1; }
      else if (!this.snap) { props.drop(); this.hold = -1; }
    } else if (this.hold >= 0) {
      // carrying with a socket nearby: tap = insert, hold = drop
      if (inp.isDown('KeyE')) { this.hold += dt; if (this.hold >= HOLD && !this.holdDone) { this.holdDone = true; props.drop(); this.hold = -1; } }
      else { const s = this.snap; this.hold = -1; if (props.carrying && s && s.onInsert) s.onInsert(props.carrying); else if (props.carrying) props.drop(); }
    }
    if (this.hold < 0 && carrying && carrying.throwable && inp.click(0) && props.carrying) props.throwHeld();
  }
  markers(dt, tg) {
    const G = this.G, eye = G.camera.position, ring = this.ring;
    // ring on the current target, gently pulsing
    if (tg) {
      this.pos(tg, _q); const r = Math.min(Math.max(tg.r ?? 0.3, 0.16), 0.5), s = r * 1.7 * (1 + Math.sin(G.elapsed * 4) * 0.05);
      _q.addScaledVector(_d.subVectors(eye, _q).normalize(), Math.min(0.25, r));
      ring.position.copy(_q); ring.scale.setScalar(s); ring.visible = true;
      ring.material.opacity = Math.min(0.5, ring.material.opacity + dt * 4);
    } else { ring.material.opacity = Math.max(0, ring.material.opacity - dt * 6); ring.visible = ring.material.opacity > 0.01; }
    // faint sparkles on usable things nearby (not crates: they are obvious)
    const on = G.settings.sparkle !== false && G.state === 'playing';
    this.spark.visible = on;
    if (!on) return;
    const arr = this.spark.geometry.attributes.position.array; let n = 0;
    for (const it of this.items) {
      if (n >= SPARK_N) break;
      if (it === tg || it.accepts && !it.onUse && !G.props.carrying) continue;
      if (it.id.startsWith('prop_crate') || !this.usable(it)) continue;
      const p = this.pos(it, _p), d = p.distanceTo(eye); if (d > SPARK_R) continue;
      p.addScaledVector(_d.subVectors(eye, p).normalize(), 0.12);
      arr[n * 3] = p.x; arr[n * 3 + 1] = p.y; arr[n * 3 + 2] = p.z; n++;
    }
    this.spark.geometry.setDrawRange(0, n); this.spark.geometry.attributes.position.needsUpdate = true;
    this.spark.material.opacity = 0.35 + Math.sin(G.elapsed * 2.2) * 0.15;
  }
}
