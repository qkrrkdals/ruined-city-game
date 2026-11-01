// Ending: the clock moves again, Remnants dissolve into memory fragments that drift home, dawn breaks,
// one light returns to you; journal lines on white; credits.
import * as THREE from 'three';
import { t } from '../i18n/i18n.js';
import { dotTexture } from '../world/textures.js';
import { Save } from '../systems/save.js';

const PAL = ['#ffd6a0', '#ffc0cf', '#c9f0e6', '#e6d6ff', '#fff2b0', '#bfe3f2'].map((c) => new THREE.Color(c).multiplyScalar(1.7));

export class Ending {
  constructor(G) { this.G = G; this.active = false; }
  start() {
    const G = this.G;
    if (this.active) return;
    this.active = true; this.t = 0; this.step = 0;
    G.state = 'cutscene'; G.player.enabled = false; G.player.lookEnabled = false;
    G.ui.show('hud', false); G.ui.threat(0); G.flashlight.on = false;
    G.story.advanceTo('ending'); G.time.range(29.25, 30.1, 0.075);
    G.events.emit('ending');
    // fragments: from every Remnant and from all over the city
    const n = 1800, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), seeds = [];
    const srcs = G.remnants.list.map((r) => r.pos.clone().setY(r.floorY + 1));
    for (let i = 0; i < n; i++) {
      const s = i < srcs.length * 60 && srcs.length ? srcs[i % srcs.length] : null;
      const x = s ? s.x + (Math.random() - 0.5) * 2 : -70 + Math.random() * 140, z = s ? s.z + (Math.random() - 0.5) * 2 : -170 + Math.random() * 420, y = s ? s.y : 0.5 + Math.random() * 8;
      pos.set([x, y, z], i * 3); const c = PAL[i % PAL.length]; col.set([c.r, c.g, c.b], i * 3);
      seeds.push({ x, y, z, d: 0.6 + Math.random() * 3.5, v: 1.5 + Math.random() * 4, ph: Math.random() * 6.28 });
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.frag = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.55, map: dotTexture(), vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.frag.frustumCulled = false; G.scene.add(this.frag); this.seeds = seeds;
    this.one = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: new THREE.Color('#fff2b0').multiplyScalar(2.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.one.scale.setScalar(1.6); G.scene.add(this.one);
    this.camFrom = G.camera.position.clone(); this.qFrom = G.camera.quaternion.clone();
    const look = new THREE.Object3D(); look.position.set(0, 25.7, -161.6); look.lookAt(0, 16, -90); this.qTo = look.quaternion.clone(); this.camTo = look.position.clone();
    for (const r of G.remnants.list) r.dissolve = r.enabled;
  }
  update(dt) {
    if (!this.active) return;
    const G = this.G, T = (this.t += dt);
    const k = Math.min(1, T / 4), e = k * k * (3 - 2 * k);
    G.camera.position.lerpVectors(this.camFrom, this.camTo, e); G.camera.quaternion.slerpQuaternions(this.qFrom, this.qTo, e);
    const clockT = Math.max(0, T - 1.5);
    const mins = 47 + clockT * clockT * 18; G.world.setTowerTime(9 + Math.floor(mins / 60), mins % 60);
    if (this.step === 0 && T > 2) { this.step = 1; G.events.emit('bell'); }
    if (this.step === 1 && T > 4.5) { this.step = 2; G.events.emit('bell'); }
    if (this.step === 2 && T > 7) { this.step = 3; G.events.emit('bell'); }
    // remnants dissolve
    for (const r of G.remnants.list) if (r.dissolve) { r.group.visible = true; r.u.uOpacity.value = Math.max(0, 0.88 - (T - 3) * 0.3); r.group.position.y += dt * Math.max(0, T - 3) * 0.6; if (r.u.uOpacity.value <= 0) r.group.visible = false; }
    G.remnants.disabled = true;
    // fragments rise and drift south (home, outside the city)
    if (T > 3) {
      const a = this.frag.geometry.attributes.position, tt = T - 3;
      this.frag.material.opacity = Math.min(1, tt / 2) * (T > 22 ? Math.max(0, 1 - (T - 22) / 4) : 1);
      for (let i = 0; i < this.seeds.length; i++) {
        const s = this.seeds[i], u = Math.max(0, tt - s.d);
        a.array[i * 3] = s.x + Math.sin(u * 0.7 + s.ph) * 1.5 * Math.min(1, u);
        a.array[i * 3 + 1] = s.y + u * s.v * 0.9 + u * u * 0.4;
        a.array[i * 3 + 2] = s.z + u * u * 2.2 + u * 3;
      }
      a.needsUpdate = true;
    }
    // one light comes back to you
    if (T > 10) {
      const u = Math.min(1, (T - 10) / 4), ue = u * u;
      this.one.material.opacity = Math.min(1, (T - 10) * 0.8);
      this.one.position.set(0, 25.7 + (1 - ue) * 10, -161.6 + (1 - ue) * 60).lerp(G.camera.position.clone().add(new THREE.Vector3(0, 0, 0.0).applyQuaternion(G.camera.quaternion)), ue * 0.92);
    }
    if (this.step === 3 && T > 13.5) { this.step = 4; G.ui.fade(true, true, 2200); }
    if (this.step === 4 && T > 16) { this.step = 5; this.showLines(); }
    if (this.step === 5 && T > 33) { this.step = 6; this.credits(); }
  }
  showLines() {
    const G = this.G, el = document.getElementById('ending');
    const lines = [...t('ending.lines'), t('thoughts.t_final')];
    el.innerHTML = `<div class="lines">${lines.map((l) => `<p>${l}</p>`).join('')}</div>`;
    G.ui.show('ending', true);
    const ps = el.querySelectorAll('p');
    ps.forEach((p, i) => setTimeout(() => p.classList.add('on'), 600 + i * 2800));
    G.story.addThought('t_final');
    Save.clear();
  }
  credits() {
    const el = document.getElementById('ending'), c = t('ending.credits');
    el.insertAdjacentHTML('beforeend', `<div id="credits"><h1>${c[0]}</h1><p style="font-family:var(--hand);font-size:26px;opacity:.9">${c[1]}</p><br>${c.slice(2).map((l) => `<p>${l}</p>`).join('')}<br><button class="btn" data-act="title" style="pointer-events:auto">${t('ending.back')}</button></div>`);
    requestAnimationFrame(() => document.getElementById('credits').classList.add('on'));
    this.G.input.unlock(true);
  }
}
