// 음악: 즉흥으로 이어지는 국악풍 반주. 탐험은 느린 산조풍(가야금·대금), 전투는 자진모리, 보스는 휘모리.
import { SCALE, SCALE_MAJ, midi } from './engine.js';

const r = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];

// 분위기별 설정. layer: exp(탐험) / cmb(전투)
const MOODS = {
  none: { exp: 0, cmb: 0 },
  margin: { exp: 0.5, cmb: 0, tempo: 40, rest: [5, 9], phrase: [1, 2], lo: 3, hi: 7, drone: 0 },
  pine: { exp: 0.85, cmb: 0, tempo: 52, rest: [2.5, 5], phrase: [2, 5], lo: 1, hi: 8, drone: 1 },
  village: { exp: 0.9, cmb: 0, tempo: 66, rest: [1.5, 3], phrase: [3, 6], lo: 2, hi: 9, drone: 0, maj: 1, flute: 0.6 },
  bamboo: { exp: 0.85, cmb: 0, tempo: 56, rest: [2.5, 5], phrase: [2, 4], lo: 2, hi: 9, drone: 0.6, flute: 0.5, tak: 1 },
  marsh: { exp: 0.85, cmb: 0, tempo: 46, rest: [3, 6], phrase: [2, 4], lo: 0, hi: 6, drone: 1, drops: 1 },
  north: { exp: 0.85, cmb: 0, tempo: 44, rest: [3, 6], phrase: [1, 3], lo: 0, hi: 5, drone: 1.4, heart: 1 },
  calm: { exp: 1, cmb: 0, tempo: 60, rest: [1.5, 3], phrase: [3, 6], lo: 2, hi: 10, drone: 0, maj: 1, flute: 0.8 },
  combat: { exp: 0, cmb: 0.75, bpm: 100, pat: 'jajin' },
  miniboss: { exp: 0, cmb: 0.8, bpm: 108, pat: 'jajin', jing: 1 },
  boss: { exp: 0, cmb: 0.7, bpm: 150, pat: 'hwi', jing: 1 },
};
const PAT = {
  // [박, 악기, 세기]  자진모리 12박 / 휘모리 8박
  jajin: { n: 12, div: 3, hits: [[0, 'buk', 1], [0, 'deok', 0.5], [3, 'kung', 0.65], [5, 'deok', 0.5], [6, 'kung', 0.8], [8, 'deok', 0.55], [9, 'kung', 0.6], [10, 'deok', 0.45]], alt: [[11, 'deok', 0.4], [2, 'deok', 0.3]] },
  hwi: { n: 8, div: 2, hits: [[0, 'buk', 1], [0, 'kkwaeng', 0.22], [2, 'deok', 0.55], [3, 'kung', 0.6], [4, 'buk', 0.8], [5, 'deok', 0.5], [6, 'kung', 0.65], [7, 'deok', 0.6]], alt: [[1, 'deok', 0.35], [4, 'kkwaeng', 0.18]] },
};

export function createMusic(A) {
  const c = A.ctx;
  const mk = () => { const g = c.createGain(); g.gain.value = 0; g.connect(A.mus); return g; };
  const exp = mk(), cmb = mk();
  let mood = 'none', cfg = MOODS.none, bright = false;
  let nextE = 0, phraseLeft = 0, idx = 4, droneT = 0, extraT = 0;   // 탐험
  let nextC = 0, pulse = 0, bar = 0;                                  // 전투

  function flute(m, t, dur, gain) {
    const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(), f = midi(m);
    o.type = 'sine'; o.frequency.value = f; l.frequency.value = 5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.6); l.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.14); g.gain.setValueAtTime(gain, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); A.out(g, { dest: exp, rev: 0.7 }); o.start(t); l.start(t); o.stop(t + dur + 0.05); l.stop(t + dur + 0.05);
    A.tone('triangle', f * 2, f * 2, dur * 0.8, gain * 0.12, { t, a: 0.15, dest: exp });
    A.noise(dur * 0.8, gain * 0.08, { t, f0: f * 2.2, q: 2.5, a: 0.1, dest: exp, rev: 0.5 });
  }
  function scheduleExplore(now) {
    const sc = cfg.maj || bright ? SCALE_MAJ : SCALE, beat = 60 / cfg.tempo;
    while (nextE < now + 0.35) {
      if (phraseLeft > 0) {
        idx = Math.max(cfg.lo, Math.min(Math.min(cfg.hi, sc.length - 1), idx + pick([-2, -1, -1, 1, 1, 2, 0])));
        const dur = pick([1, 1, 0.5, 1.5, 2]) * beat, m = sc[idx];
        if (Math.random() < 0.22) A.pluck(sc[Math.max(0, idx - 1)], 0.09, { t: nextE - 0.08, dest: exp, bright: 0.45 });
        A.pluck(m, r(0.15, 0.22), { t: nextE, dest: exp, bright: 0.45, vib: dur > beat ? 0.013 : 0, rev: 0.55 });
        if (phraseLeft === cfg._len && Math.random() < 0.6) A.pluck(sc[0] - 12, 0.16, { t: nextE, dest: exp, bright: 0.35, rev: 0.5 });
        nextE += dur; phraseLeft--;
      } else {
        const rest = r(cfg.rest[0], cfg.rest[1]) * beat;
        if ((cfg.flute || bright) && Math.random() < (cfg.flute || 0.4)) { // 쉬는 사이 대금 한 가락
          let t = nextE + beat * 0.5, k = Math.min(sc.length - 1, idx + 2);
          for (let i = 0, n = 2 + ((Math.random() * 3) | 0); i < n; i++) { const d = pick([1, 1.5, 2]) * beat; flute(sc[k] + 12 > 91 ? sc[k] : sc[k] + 12, t, d * 0.95, 0.045); t += d; k = Math.max(2, Math.min(sc.length - 1, k + pick([-1, 1, -2, 1]))); }
          nextE = Math.max(nextE + rest, t + beat);
        } else nextE += rest;
        cfg._len = phraseLeft = (cfg.phrase[0] + Math.random() * (cfg.phrase[1] - cfg.phrase[0] + 1)) | 0;
      }
    }
    if (cfg.drone && now > droneT) { // 낮게 깔리는 소리
      droneT = now + r(9, 13); const g = 0.05 * cfg.drone;
      A.tone('sine', 55, 55, 8, g, { t: now + 0.1, a: 3, dest: exp }); A.tone('triangle', 110, 110, 7, g * 0.4, { t: now + 0.1, a: 3.5, dest: exp }); A.tone('triangle', 164.8, 164.8, 6, g * 0.16, { t: now + 0.1, a: 4, dest: exp });
    }
    if (now > extraT) {
      extraT = now + r(1.2, 4);
      if (cfg.tak && Math.random() < 0.5) A.drum('tak', 0.12, { t: now + 0.1, dest: exp, rev: 0.6 });   // 대나무 부딪는 소리
      if (cfg.drops && Math.random() < 0.7) A.tone('sine', r(900, 1400), r(450, 650), 0.09, 0.03, { t: now + 0.1, dest: exp, rev: 0.8 });
      if (cfg.heart) { A.drum('buk', 0.16, { t: now + 0.1, dest: exp }); A.drum('buk', 0.1, { t: now + 0.42, dest: exp }); extraT = now + 2.6; }
    }
  }
  function scheduleCombat(now) {
    const p = PAT[cfg.pat], dt = 60 / cfg.bpm / p.div;
    while (nextC < now + 0.3) {
      const t = nextC;
      for (const [k, d, g] of p.hits) if (k === pulse) A.drum(d, g * 0.3, { t, dest: cmb });
      if (bar % 2 === 1) for (const [k, d, g] of p.alt) if (k === pulse) A.drum(d, g * 0.3, { t, dest: cmb });
      if (cfg.jing && pulse === 0 && bar % 4 === 0) A.drum('jing', 0.22, { t, dest: cmb });
      // 낮은 줄 반복 + 가끔 높은 가락
      if (cfg.pat === 'hwi') { if (pulse % 2 === 0) A.pluck([45, 45, 52, 45][(pulse / 2) | 0] + (bar % 4 === 3 ? 3 : 0), 0.2, { t, dest: cmb, bright: 0.5, dur: 0.22 }); }
      else if (pulse % 3 === 0) A.pluck([45, 52, 45, 50][(pulse / 3) | 0], 0.2, { t, dest: cmb, bright: 0.45, dur: 0.4 });
      if (bar % 2 === 1 && pulse >= p.n - 4 && Math.random() < 0.75) A.pluck(SCALE[(5 + Math.random() * 6) | 0], 0.13, { t, dest: cmb, bright: 0.7 });
      nextC += dt; pulse++; if (pulse >= p.n) { pulse = 0; bar++; }
    }
  }
  return {
    get mood() { return mood; },
    setBright(b) { bright = !!b; },
    setMood(m) {
      if (!MOODS[m] || m === mood) return;
      const prev = cfg; mood = m; cfg = MOODS[m];
      const now = c.currentTime;
      exp.gain.setTargetAtTime(cfg.exp, now, cfg.exp > prev.exp ? 0.9 : 0.35);
      cmb.gain.setTargetAtTime(cfg.cmb, now, cfg.cmb > prev.cmb ? 0.12 : 0.7);
      if (cfg.exp && !prev.exp) { nextE = now + 0.6; phraseLeft = 0; }
      if (cfg.cmb && (!prev.cmb || prev.pat !== cfg.pat)) { nextC = now + 0.08; pulse = 0; bar = 0; }
    },
    update(rdt, nowArg) {
      const now = nowArg ?? c.currentTime;
      if (nowArg === undefined && c.state !== 'running') return;
      if (cfg.exp) scheduleExplore(now);
      if (cfg.cmb) scheduleCombat(now);
    },
  };
}
