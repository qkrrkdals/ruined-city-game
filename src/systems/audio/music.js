// Slow synth-pad background music: a chord every ~9 s per region mood, with rare soft plucks.
const PROG = {
  r1: [[53, 60, 64, 69], [57, 60, 64, 67], [50, 57, 62, 65], [46, 53, 57, 62]],
  r2: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 67]],
  under: [[52, 59, 62, 66], [48, 55, 59, 64], [52, 55, 59, 62], [45, 52, 57, 60]],
  r3: [[50, 57, 60, 64], [46, 53, 57, 62], [43, 50, 53, 58], [45, 52, 57, 59]],
  ending: [[53, 60, 64, 67, 72], [52, 59, 64, 67, 71], [50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [48, 55, 60, 64, 67]],
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Music {
  constructor(E) { this.E = E; this.t = 1; this.i = 0; this.mood = 'r1'; this.pluckT = 6; }
  chord(notes, loud) {
    const E = this.E, ctx = E.ctx, t = ctx.currentTime, dur = 12, amp = (loud ? 0.07 : 0.045) / notes.length * 4;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(1300, t + 5); lp.frequency.linearRampToValueAtTime(800, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(amp, t + 3); g.gain.setValueAtTime(amp, t + 7.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g); g.connect(E.musicBus); E.sendTo(g, 0.5);
    for (const n of notes) for (const [type, det] of [['triangle', 0], ['sine', 6]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = mtof(n); o.detune.value = det + (Math.random() - 0.5) * 4;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.1);
    }
  }
  pluck(note) {
    const E = this.E, ctx = E.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = mtof(note);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(g); g.connect(E.musicBus); E.sendTo(g, 0.7); o.start(t); o.stop(t + 2.5);
  }
  update(dt, mood) {
    if (mood !== this.mood) { this.mood = mood; this.i = 0; this.t = Math.min(this.t, 1.5); }
    this.t -= dt; this.pluckT -= dt;
    const prog = PROG[this.mood] || PROG.r1;
    if (this.t <= 0) { this.t = this.mood === 'ending' ? 6 : 9; this.chord(prog[this.i++ % prog.length], this.mood === 'ending'); }
    if (this.pluckT <= 0 && (this.mood === 'r1' || this.mood === 'ending')) {
      this.pluckT = 2.5 + Math.random() * 5;
      const c = prog[(this.i + prog.length - 1) % prog.length];
      this.pluck(c[Math.floor(Math.random() * c.length)] + 12);
    }
  }
}
