// Named, synthesized sounds (Web Audio only). Each entry is fn(E, opts). Any entry can later be replaced
// by a recorded file via E.register(name, E.fromFile(url)) without touching the callers.
const R = Math.random;

export function env(p, t, a, peak, d, end = 0.0001) {
  p.cancelScheduledValues(t); p.setValueAtTime(0.0001, t);
  p.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  p.exponentialRampToValueAtTime(end, t + a + d);
}
function noise(E, type = 'white', dur = 0.5, t = E.ctx.currentTime) {
  const s = E.ctx.createBufferSource(); s.buffer = E.noise[type];
  s.start(t, R() * 1.5); s.stop(t + dur); return s;
}
function osc(E, type, f, t, dur) { const o = E.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur); return o; }
function filt(E, type, f, q = 1) { const b = E.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function gain(E, v = 1) { const g = E.ctx.createGain(); g.gain.value = v; return g; }
function thump(E, t, f0, f1, vol, d, send = 0.1) {
  const o = osc(E, 'sine', f0, t, d + 0.05), g = gain(E, 0); o.frequency.exponentialRampToValueAtTime(f1, t + d);
  env(g.gain, t, 0.004, vol, d); o.connect(g); E.out(g, send);
}
function burst(E, t, type, f, q, vol, a, d, send = 0.15, ntype = 'white') {
  const n = noise(E, ntype, a + d + 0.05, t), b = filt(E, type, f, q), g = gain(E, 0);
  env(g.gain, t, a, vol, d); n.connect(b).connect(g); E.out(g, send); return b;
}
function ping(E, t, f, vol, d, type = 'sine', send = 0.3) { const o = osc(E, type, f, t, d + 0.05), g = gain(E, 0); env(g.gain, t, 0.003, vol, d); o.connect(g); E.out(g, send); return o; }

export const SOUNDS = {
  step(E, { surf = 'concrete', mode = 'walk', wet }) {
    const t = E.ctx.currentTime, v = (mode === 'run' ? 0.5 : mode === 'crouch' ? 0.13 : 0.3) * (0.85 + R() * 0.3);
    if (wet && surf !== 'grass' && surf !== 'wood') surf = 'water';
    switch (surf) {
      case 'grass': burst(E, t, 'bandpass', 2200 + R() * 900, 0.7, v * 0.55, 0.01, 0.14); burst(E, t + 0.02, 'highpass', 5000, 0.7, v * 0.25, 0.005, 0.06); break;
      case 'wood': thump(E, t, 150, 90, v * 0.6, 0.12, 0.2); burst(E, t, 'bandpass', 900, 1.4, v * 0.35, 0.003, 0.08); break;
      case 'tile': burst(E, t, 'bandpass', 2600 + R() * 600, 1.4, v * 0.45, 0.002, 0.05, 0.5); thump(E, t, 110, 70, v * 0.35, 0.05, 0.4); break;
      case 'metal': burst(E, t, 'bandpass', 3200, 8, v * 0.5, 0.002, 0.1, 0.3); ping(E, t, 820 + R() * 200, v * 0.12, 0.25); break;
      case 'water': { const b = burst(E, t, 'bandpass', 600, 1.2, v * 0.5, 0.01, 0.16, 0.2); b.frequency.exponentialRampToValueAtTime(2200, t + 0.12); burst(E, t + 0.02, 'highpass', 4500, 0.7, v * 0.25, 0.01, 0.08); break; }
      default: burst(E, t, 'lowpass', 1500 + R() * 400, 0.7, v * 0.6, 0.002, 0.07); thump(E, t, 95, 60, v * 0.45, 0.06);
    }
  },
  land(E, { v = 6 }) { const t = E.ctx.currentTime, k = Math.min(1, v / 12); thump(E, t, 80, 45, 0.5 * k + 0.2, 0.16); burst(E, t, 'lowpass', 1200, 0.7, 0.35 * k + 0.1, 0.003, 0.12); },
  jump(E) { const t = E.ctx.currentTime; burst(E, t, 'bandpass', 1400, 0.8, 0.07, 0.03, 0.12, 0.05, 'pink'); },
  pickup(E) { const t = E.ctx.currentTime; burst(E, t, 'bandpass', 1800, 1, 0.12, 0.01, 0.08); ping(E, t + 0.03, 1320, 0.04, 0.12); },
  liftCrate(E) { const t = E.ctx.currentTime; thump(E, t, 130, 80, 0.3, 0.12); burst(E, t, 'bandpass', 700, 1.2, 0.18, 0.02, 0.15); },
  drop(E) { const t = E.ctx.currentTime; burst(E, t, 'bandpass', 1100, 1, 0.08, 0.01, 0.1); },
  crateLand(E, { v = 3 }) { const t = E.ctx.currentTime, k = Math.min(1, v / 8); thump(E, t, 120, 70, 0.3 + 0.4 * k, 0.16, 0.2); burst(E, t, 'bandpass', 800, 1.5, 0.25 + 0.3 * k, 0.003, 0.14); },
  throw(E) { const t = E.ctx.currentTime; const b = burst(E, t, 'bandpass', 600, 1.5, 0.12, 0.05, 0.2, 0.05, 'pink'); b.frequency.exponentialRampToValueAtTime(2400, t + 0.2); },
  clink(E) { const t = E.ctx.currentTime; ping(E, t, 2100 + R() * 400, 0.12, 0.25, 'triangle'); ping(E, t + 0.07, 3100 + R() * 300, 0.06, 0.2); },
  glass(E) { const t = E.ctx.currentTime; burst(E, t, 'highpass', 3000, 0.7, 0.5, 0.002, 0.25, 0.3); for (let i = 0; i < 7; i++) ping(E, t + 0.02 + R() * 0.25, 2500 + R() * 4000, 0.06 + R() * 0.05, 0.12 + R() * 0.2); },
  paper(E) { const t = E.ctx.currentTime; for (let i = 0; i < 3; i++) burst(E, t + i * 0.05 + R() * 0.03, 'bandpass', 2600 + R() * 1500, 0.9, 0.09, 0.02, 0.08, 0.05); },
  flashOn(E) { const t = E.ctx.currentTime; burst(E, t, 'bandpass', 3500, 3, 0.25, 0.001, 0.025, 0.05); ping(E, t, 1900, 0.05, 0.04, 'square', 0); },
  flashOff(E) { const t = E.ctx.currentTime; burst(E, t, 'bandpass', 2800, 3, 0.22, 0.001, 0.03, 0.05); },
  flashDead(E) { const t = E.ctx.currentTime; for (let i = 0; i < 5; i++) burst(E, t + i * 0.09 + R() * 0.04, 'bandpass', 5000, 2, 0.08, 0.002, 0.04, 0); },
  battery(E) { const t = E.ctx.currentTime; burst(E, t, 'bandpass', 3000, 3, 0.2, 0.001, 0.03); ping(E, t + 0.06, 880, 0.08, 0.3); ping(E, t + 0.16, 1318.5, 0.07, 0.4); },
  keyPress(E) { const t = E.ctx.currentTime; ping(E, t, 1046 + R() * 20, 0.07, 0.08, 'square', 0.1); },
  keyOk(E) { const t = E.ctx.currentTime; ping(E, t, 1046.5, 0.08, 0.25, 'triangle'); ping(E, t + 0.1, 1318.5, 0.08, 0.35, 'triangle'); ping(E, t + 0.2, 1568, 0.07, 0.5, 'triangle'); },
  keyFail(E) { const t = E.ctx.currentTime; ping(E, t, 140, 0.12, 0.35, 'square', 0.1); ping(E, t + 0.02, 147, 0.1, 0.35, 'square', 0.1); },
  rumble(E, { dur = 4, metal = true }) {
    const t = E.ctx.currentTime, n = noise(E, 'brown', dur + 0.5, t), b = filt(E, 'lowpass', 300, 0.7), g = gain(E, 0);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.3); g.gain.setValueAtTime(0.5, t + dur - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(b).connect(g); E.out(g, 0.3);
    if (metal) for (let i = 0; i < dur * 7; i++) burst(E, t + i / 7 + R() * 0.05, 'bandpass', 1800 + R() * 1500, 6, 0.05 + R() * 0.05, 0.002, 0.06, 0.3);
  },
  door(E) { const t = E.ctx.currentTime; const b = burst(E, t, 'bandpass', 400, 1, 0.25, 0.1, 0.9, 0.3, 'pink'); b.frequency.exponentialRampToValueAtTime(900, t + 1); thump(E, t + 1.1, 90, 60, 0.3, 0.15, 0.4); },
  socket(E) { const t = E.ctx.currentTime; thump(E, t, 160, 90, 0.35, 0.08); burst(E, t, 'bandpass', 4000, 4, 0.2, 0.001, 0.05); const o = osc(E, 'sawtooth', 120, t + 0.05, 1.2), g = gain(E, 0), f = filt(E, 'lowpass', 600); env(g.gain, t + 0.05, 0.05, 0.06, 1.0); o.connect(f).connect(g); E.out(g, 0.2); },
  generator(E) { const t = E.ctx.currentTime; const o = osc(E, 'sawtooth', 30, t, 3.2), g = gain(E, 0), f = filt(E, 'lowpass', 500); o.frequency.exponentialRampToValueAtTime(58, t + 2.5); env(g.gain, t, 0.6, 0.25, 2.4); o.connect(f).connect(g); E.out(g, 0.4); SOUNDS.socket(E); },
  shelter(E) { const t = E.ctx.currentTime; [523.25, 659.25, 783.99, 987.77].forEach((f, i) => ping(E, t + i * 0.09, f, 0.05, 1.6, 'sine', 0.5)); },
  saved(E) { const t = E.ctx.currentTime; ping(E, t, 1568, 0.035, 0.5, 'sine', 0.4); },
  notice(E, { pos }) {
    const t = E.ctx.currentTime, n = noise(E, 'pink', 1.3, t), b = filt(E, 'bandpass', 500, 3), g = gain(E, 0);
    b.frequency.exponentialRampToValueAtTime(2400, t + 0.9); env(g.gain, t, 0.5, 0.5, 0.6); n.connect(b).connect(g);
    const o = osc(E, 'sine', 180, t, 1.2), og = gain(E, 0); o.frequency.exponentialRampToValueAtTime(520, t + 0.9); env(og.gain, t, 0.4, 0.12, 0.6); o.connect(og);
    if (pos) { const p = E.panner(pos); g.connect(p); og.connect(p); } else { E.out(g, 0.3); E.out(og, 0.3); }
  },
  chase(E) { const t = E.ctx.currentTime; [110, 116.5, 155.6].forEach((f) => { const o = osc(E, 'sawtooth', f, t, 1.6), g = gain(E, 0), lp = filt(E, 'lowpass', 900); env(g.gain, t, 0.02, 0.09, 1.4); o.connect(lp).connect(g); E.out(g, 0.4); }); },
  caught(E) { const t = E.ctx.currentTime; const b = burst(E, t, 'bandpass', 300, 1, 0.6, 0.3, 1.2, 0.6, 'pink'); b.frequency.exponentialRampToValueAtTime(3000, t + 1.4); thump(E, t + 0.4, 60, 30, 0.7, 1.2, 0.5); },
  respawn(E) { const t = E.ctx.currentTime; [392, 493.88, 587.33].forEach((f, i) => ping(E, t + 0.3 + i * 0.15, f, 0.04, 2.2, 'sine', 0.6)); },
  heart(E, { v = 0.5 }) { const t = E.ctx.currentTime; thump(E, t, 62, 40, 0.55 * v, 0.12, 0); thump(E, t + 0.22, 58, 40, 0.38 * v, 0.12, 0); },
  bell(E) {
    const t = E.ctx.currentTime, base = 196;
    [[0.5, 0.5, 6], [1, 0.4, 5], [1.183, 0.25, 3.5], [1.506, 0.22, 3], [2, 0.18, 2.6], [2.514, 0.12, 2], [2.662, 0.1, 1.8], [3.011, 0.08, 1.5], [4.166, 0.05, 1.1]]
      .forEach(([r, a, d]) => ping(E, t, base * r, a, d, 'sine', 0.8));
    burst(E, t, 'bandpass', 2400, 2, 0.12, 0.001, 0.08, 0.6);
  },
  drip(E, { pos }) { const t = E.ctx.currentTime, o = osc(E, 'sine', 1400 + R() * 1200, t, 0.2), g = gain(E, 0); o.frequency.exponentialRampToValueAtTime(700 + R() * 300, t + 0.08); env(g.gain, t, 0.002, 0.07, 0.12); o.connect(g); if (pos) g.connect(E.panner(pos, 0.8)); else E.out(g, 0.7); },
  bird(E, { pos }) {
    const t = E.ctx.currentTime, n = 2 + Math.floor(R() * 4), f0 = 2600 + R() * 1600, out = pos ? E.panner(pos, 0.25) : null;
    for (let i = 0; i < n; i++) {
      const s = t + i * (0.09 + R() * 0.08), o = osc(E, 'sine', f0, s, 0.14), m = osc(E, 'sine', 40 + R() * 30, s, 0.14), mg = gain(E, 300 + R() * 400), g = gain(E, 0);
      m.connect(mg).connect(o.frequency); o.frequency.exponentialRampToValueAtTime(f0 * (0.7 + R() * 0.6), s + 0.1);
      env(g.gain, s, 0.01, 0.03 + R() * 0.03, 0.1); o.connect(g); if (out) g.connect(out); else E.out(g, 0.1);
    }
  },
};
