// DOM UI shell: overlays, HUD, title, pause. Panels (note/journal/keypad/settings/ending) mount into their screens.
import { t, applyDom, getLang } from '../i18n/i18n.js';

export function clockText(hour) {
  const h = ((hour % 24) + 24) % 24, hh = Math.floor(h), mm = Math.floor((h - hh) * 60), pm = hh >= 12, h12 = hh % 12 === 0 ? 12 : hh % 12;
  return t('time.fmt', { ampm: t(pm ? 'time.pm' : 'time.am'), h: h12, m: mm, mm: String(mm).padStart(2, '0') });
}

export class UI {
  constructor(G) {
    this.G = G;
    const root = (this.root = document.getElementById('ui'));
    root.innerHTML = `
<div id="vignette"></div><div id="threat"></div><div id="flicker"></div>
<div id="hud" class="hidden">
  <div id="hud-region"><div class="name"></div><div class="time"></div></div>
  <div id="hud-obj"></div>
  <div id="crosshair"></div><div id="prompt"></div>
  <div id="battery" class="hidden"><div class="cells"><i></i><i></i><i></i><i></i><i></i></div><span class="pct"></span><span class="lightoff"></span></div>
  <div id="crouch" class="hidden" data-i18n="hud.crouch"></div>
  <div id="holding"></div>
  <div id="toasts"></div>
</div>
<div id="title" class="screen hidden"><div>
  <div class="logo"><span data-i18n="meta.title"></span><small data-i18n="meta.subtitle"></small></div>
  <div class="menu">
    <button class="btn" data-act="new" data-i18n="ui.newGame"></button>
    <button class="btn" data-act="continue" data-i18n="ui.continue" disabled></button>
    <button class="btn" data-act="settings" data-i18n="ui.settings"></button>
  </div>
  <div class="hint" data-i18n="ui.headphones"></div>
  <div class="controls" data-i18n="ui.controlsHint"></div>
</div></div>
<div id="pause" class="screen hidden" data-act="resume-bg"><h2 data-i18n="ui.paused"></h2><div class="menu">
  <button class="btn" data-act="resume" data-i18n="ui.resume"></button>
  <button class="btn" data-act="journal" data-i18n="ui.journal"></button>
  <button class="btn" data-act="settings" data-i18n="ui.settings"></button>
  <button class="btn" data-act="title" data-i18n="ui.toTitle"></button>
</div><div class="hint" data-i18n="ui.clickToResume"></div></div>
<div id="note" class="screen hidden"></div>
<div id="journal" class="screen hidden"></div>
<div id="keypad" class="screen hidden"></div>
<div id="settings" class="screen hidden"></div>
<div id="ending" class="screen hidden"></div>
<div id="fade"></div>
<div id="loading" class="screen"><div><div data-i18n="ui.loading"></div><div class="bar"><i></i></div></div></div>`;
    applyDom(root);
    this.$ = (id) => document.getElementById(id);
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      if (b.dataset.act === 'resume-bg' && e.target !== b) return;
      G.events.emit('ui', b.dataset.act === 'resume-bg' ? 'resume' : b.dataset.act, b);
    });
    this.cells = [...this.$('battery').querySelectorAll('i')];
  }
  show(id, on = true) { this.$(id).classList.toggle('hidden', !on); }
  visible(id) { return !this.$(id).classList.contains('hidden'); }
  fade(on, white = false, ms = 900) {
    const f = this.$('fade'); f.classList.toggle('white', white); f.style.transitionDuration = ms + 'ms'; f.style.opacity = on ? 1 : 0;
    return new Promise((r) => setTimeout(r, ms));
  }
  toast(text) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = text; this.$('toasts').appendChild(el); setTimeout(() => el.remove(), 3700); }
  regionCard(name, time) {
    const r = this.$('hud-region');
    r.querySelector('.name').textContent = name; r.querySelector('.time').textContent = time;
    r.classList.add('show'); this.$('hud-obj').classList.remove('show');
    clearTimeout(this._rc); this._rc = setTimeout(() => { r.classList.remove('show'); if (this._objPending) this.objective(this._objPending); }, 4200);
  }
  objective(text) {
    if (!text) return;
    if (this.$('hud-region').classList.contains('show')) { this._objPending = text; return; }
    this._objPending = null;
    const o = this.$('hud-obj'); o.textContent = text; o.classList.add('show');
    clearTimeout(this._ob); this._ob = setTimeout(() => o.classList.remove('show'), 6500);
  }
  prompt(html) { if (this._p !== html) { this.$('prompt').innerHTML = html || ''; this._p = html; this.$('crosshair').classList.toggle('active', !!html); } }
  holding(html) { if (this._h !== html) { this.$('holding').innerHTML = html || ''; this._h = html; } }
  battery(level, visible, on) {
    const b = this.$('battery'); b.classList.toggle('hidden', !visible); if (!visible) return;
    const n = Math.ceil(level * 5 - 0.001);
    this.cells.forEach((c, i) => c.classList.toggle('on', i < n));
    b.classList.toggle('low', level < 0.15 && on);
    const pct = Math.round(level * 100) + '%';
    if (this._pct !== pct) { b.querySelector('.pct').textContent = pct; this._pct = pct; }
    const off = on ? '' : t('hud.lightOff');
    if (this._off !== off) { b.querySelector('.lightoff').textContent = off; this._off = off; }
  }
  crouch(on) { this.show('crouch', on); }
  threat(level, sx = 0.5, sy = 0.5) {
    const el = this.$('threat'); el.style.opacity = level.toFixed(3);
    el.style.setProperty('--tx', `${(1 - sx) * 100}%`); el.style.setProperty('--ty', `${(1 - sy) * 100}%`);
  }
  flicker(v) { this.$('flicker').style.opacity = v.toFixed(3); }
  lang() { return getLang(); }
}
