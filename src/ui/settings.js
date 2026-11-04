// Settings screen: language (instant), mouse (sensitivity, invert Y), view (FOV, head bob), graphics quality,
// volumes (master / music / effects / ambience), interaction sparkles, FPS display. Saved to localStorage.
import { t, setLang, getLang } from '../i18n/i18n.js';

const TOGGLES = { 'set-fps': 'fps', 'set-inv': 'invertY', 'set-bob': 'bob', 'set-spark': 'sparkle', 'set-autoq': 'autoQuality' };

export class SettingsUI {
  constructor(G) {
    this.G = G; this.from = 'title';
    G.events.on('ui', (act, el) => this.ui(act, el));
    document.getElementById('settings').addEventListener('input', (e) => {
      const k = e.target.dataset.set; if (!k) return;
      G.settings[k] = +e.target.value; G.saveSettings();
      if (k === 'volume') G.events.emit('volume', G.settings.volume);
      if (k.startsWith('vol')) G.events.emit('volumes');
      if (k === 'fov') applyFov(G);
    });
    applyFov(G);
  }
  open(from) {
    this.from = from;
    this.G.ui.show('title', false); this.G.ui.show('pause', false);
    this.render(); this.G.ui.show('settings', true);
  }
  render() {
    const s = this.G.settings, seg = (act, cur, items) => `<div class="seg">${items.map(([v, label]) => `<button data-act="${act}" data-v="${v}" class="${cur === v ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    const onoff = (act, v) => seg(act, v ? 'on' : 'off', [['off', t('settings.off')], ['on', t('settings.on')]]);
    const range = (k, min, max, step) => `<input type="range" min="${min}" max="${max}" step="${step}" value="${s[k]}" data-set="${k}">`;
    const row = (label, ctl) => `<div class="row"><span>${t('settings.' + label)}</span>${ctl}</div>`;
    document.getElementById('settings').innerHTML = `<h2>${t('settings.title')}</h2><div class="rows">
      ${row('lang', seg('set-lang', getLang(), [['ko', t('settings.ko')], ['en', t('settings.en')]]))}
      ${row('sens', range('sens', 0.3, 2.5, 0.05))}
      ${row('invertY', onoff('set-inv', s.invertY))}
      ${row('fov', range('fov', 60, 95, 1))}
      ${row('bob', onoff('set-bob', s.bob !== false))}
      ${row('quality', seg('set-q', this.G.gfx.qName, [['low', t('settings.low')], ['medium', t('settings.medium')], ['high', t('settings.high')]]))}
      ${row('autoQuality', onoff('set-autoq', s.autoQuality !== false))}
      ${row('volume', range('volume', 0, 1, 0.05))}
      ${row('volMusic', range('volMusic', 0, 1, 0.05))}
      ${row('volSfx', range('volSfx', 0, 1, 0.05))}
      ${row('volAmb', range('volAmb', 0, 1, 0.05))}
      ${row('sparkle', onoff('set-spark', s.sparkle !== false))}
      ${row('fps', onoff('set-fps', s.fps))}
      <div class="row" style="opacity:.6;font-size:13px"><span>${t('settings.note')}</span></div>
    </div><div class="menu" style="margin-top:22px"><button class="btn" data-act="set-back">${t('settings.back')}</button></div>`;
  }
  ui(act, el) {
    const G = this.G;
    if (act === 'settings') this.open(G.state === 'paused' ? 'pause' : 'title');
    else if (act === 'set-lang') { G.settings.lang = el.dataset.v; G.saveSettings(); setLang(el.dataset.v); this.render(); }
    else if (act === 'set-q') { G.settings.quality = el.dataset.v; G.saveSettings(); G.gfx.setQuality(el.dataset.v); this.render(); }
    else if (TOGGLES[act]) { G.settings[TOGGLES[act]] = el.dataset.v === 'on'; G.saveSettings(); if (act === 'set-fps') G.perf.apply(); this.render(); }
    else if (act === 'set-back') { G.ui.show('settings', false); G.ui.show(this.from === 'pause' ? 'pause' : 'title', true); }
  }
}

function applyFov(G) { G.camera.fov = G.settings.fov || 72; G.camera.updateProjectionMatrix(); }
