// Frame-time monitor. Optional overlay (Settings → FPS) shows fps, the worst frame of the last second and
// how much of a frame the game logic took, so stutter on a real PC can be told apart (GPU vs CPU).
import { t } from '../i18n/i18n.js';

export class Perf {
  constructor(G) {
    this.G = G; this.frames = 0; this.acc = 0; this.worst = 0; this.cpu = 0; this.cpuN = 0; this.long = 0;
    this.el = document.createElement('div'); this.el.id = 'fps'; this.el.className = 'hidden';
    document.getElementById('ui').appendChild(this.el);
    this.apply();
  }
  apply() { this.el.classList.toggle('hidden', !this.G.settings.fps); }
  // lower graphics quality one step when the game keeps running slowly (Settings: automatic quality)
  autoQuality(fps) {
    const G = this.G; this.slow = this.slow || 0; this.playT = (this.playT || 0) + 1;
    if (G.state !== 'playing' || G.freeze || G.settings.autoQuality === false || this.playT < 8) { this.slow = 0; return; }
    this.slow = fps < 34 ? this.slow + 1 : 0;
    if (this.slow < 6) return;
    this.slow = 0; this.playT = 0;
    const next = { high: 'medium', medium: 'low' }[G.gfx.qName]; if (!next) return;
    G.settings.quality = next; G.saveSettings(); G.gfx.setQuality(next);
    G.ui.toast(t('hud.autoQuality', { q: t('settings.' + next) }));
  }
  frame(dtMs, cpuMs) {
    this.frames++; this.acc += dtMs; this.worst = Math.max(this.worst, dtMs); this.cpu += cpuMs; this.cpuN++;
    if (dtMs > 50) this.long++;
    if (this.acc < 1000) return;
    this.autoQuality((this.frames * 1000) / this.acc);
    if (this.G.settings.fps) this.el.textContent = t('hud.fps', { fps: Math.round((this.frames * 1000) / this.acc), max: Math.round(this.worst), cpu: (this.cpu / this.cpuN).toFixed(1), long: this.long });
    this.frames = 0; this.acc = 0; this.worst = 0; this.cpu = 0; this.cpuN = 0; this.long = 0;
  }
}
