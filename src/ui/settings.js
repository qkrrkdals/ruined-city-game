// Settings screen: language (instant), mouse sensitivity, graphics quality (3 levels), volume. Saved to localStorage.
import { t, setLang, getLang } from '../i18n/i18n.js';

export class SettingsUI {
  constructor(G) {
    this.G = G; this.from = 'title';
    G.events.on('ui', (act, el) => this.ui(act, el));
    document.getElementById('settings').addEventListener('input', (e) => {
      const k = e.target.dataset.set; if (!k) return;
      G.settings[k] = +e.target.value; G.saveSettings();
      if (k === 'volume') G.events.emit('volume', G.settings.volume);
    });
  }
  open(from) {
    this.from = from;
    this.G.ui.show('title', false); this.G.ui.show('pause', false);
    this.render(); this.G.ui.show('settings', true);
  }
  render() {
    const s = this.G.settings, seg = (act, cur, items) => `<div class="seg">${items.map(([v, label]) => `<button data-act="${act}" data-v="${v}" class="${cur === v ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    document.getElementById('settings').innerHTML = `<h2>${t('settings.title')}</h2><div class="rows">
      <div class="row"><span>${t('settings.lang')}</span>${seg('set-lang', getLang(), [['ko', t('settings.ko')], ['en', t('settings.en')]])}</div>
      <div class="row"><span>${t('settings.sens')}</span><input type="range" min="0.3" max="2.5" step="0.05" value="${s.sens}" data-set="sens"></div>
      <div class="row"><span>${t('settings.quality')}</span>${seg('set-q', this.G.gfx.qName, [['low', t('settings.low')], ['medium', t('settings.medium')], ['high', t('settings.high')]])}</div>
      <div class="row"><span>${t('settings.volume')}</span><input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-set="volume"></div>
      <div class="row"><span>${t('settings.fps')}</span>${seg('set-fps', s.fps ? 'on' : 'off', [['off', t('settings.off')], ['on', t('settings.on')]])}</div>
      <div class="row" style="opacity:.6;font-size:13px"><span>${t('settings.note')}</span></div>
    </div><div class="menu" style="margin-top:26px"><button class="btn" data-act="set-back">${t('settings.back')}</button></div>`;
  }
  ui(act, el) {
    const G = this.G;
    if (act === 'settings') this.open(G.state === 'paused' ? 'pause' : 'title');
    else if (act === 'set-lang') { G.settings.lang = el.dataset.v; G.saveSettings(); setLang(el.dataset.v); this.render(); }
    else if (act === 'set-q') { G.settings.quality = el.dataset.v; G.saveSettings(); G.gfx.setQuality(el.dataset.v); this.render(); }
    else if (act === 'set-fps') { G.settings.fps = el.dataset.v === 'on'; G.saveSettings(); G.perf.apply(); this.render(); }
    else if (act === 'set-back') { G.ui.show('settings', false); G.ui.show(this.from === 'pause' ? 'pause' : 'title', true); }
  }
}
