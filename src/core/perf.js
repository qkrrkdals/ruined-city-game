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
  frame(dtMs, cpuMs) {
    this.frames++; this.acc += dtMs; this.worst = Math.max(this.worst, dtMs); this.cpu += cpuMs; this.cpuN++;
    if (dtMs > 50) this.long++;
    if (this.acc < 1000) return;
    if (this.G.settings.fps) this.el.textContent = t('hud.fps', { fps: Math.round((this.frames * 1000) / this.acc), max: Math.round(this.worst), cpu: (this.cpu / this.cpuN).toFixed(1), long: this.long });
    this.frames = 0; this.acc = 0; this.worst = 0; this.cpu = 0; this.cpuN = 0; this.long = 0;
  }
}
