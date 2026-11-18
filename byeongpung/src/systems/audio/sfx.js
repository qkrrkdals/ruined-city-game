// 효과음 표(이름 → 합성 함수). 전부 코드로 만든다. 연타는 음계를 타고 올라간다.
import { SCALE } from './engine.js';

const r = (a, b) => a + Math.random() * (b - a);
const note = (n) => SCALE[Math.max(0, Math.min(SCALE.length - 1, n))];

export const SFX = {
  // ── 주인공 ──
  swing(A, o, t) {
    const h = o.heavy || o.power >= 2, d = h ? 0.24 : 0.15;
    A.noise(d, h ? 0.2 : 0.15, { t, f0: h ? 260 : 420, f1: h ? 1500 : 2100, f2: 500, sweep: 0.45, q: 1.1 });
    A.noise(d * 0.7, 0.05, { t: t + 0.02, type: 'highpass', f0: 3500, q: 0.5 });
    if (o.kind === 'thrust') A.tone('sine', 300, 700, 0.1, 0.05, { t });
  },
  hit(A, o, t) {
    const p = o.power || 1, g = 0.5 + p * 0.16;
    A.tone('sine', 170 - p * 12, 48, 0.09 + p * 0.03, 0.7 * g, { t });                           // 묵직한 몸통
    A.noise(0.035 + p * 0.01, 0.16 * g, { t, f0: 2400, q: 0.8 });                                   // 딱 끊기는 타격
    A.noise(0.13, 0.1 * g, { t: t + 0.01, type: 'lowpass', f0: 1100, f1: 220 });                    // 젖은 먹
    A.pluck(note((o.note || 0) % 11), 0.36 + p * 0.06, { t, bright: 0.55 + p * 0.1, rev: 0.4 });
    if (p >= 3) { A.drum('buk', 0.6, { t }); A.pluck(note((o.note || 0) % 11) - 12, 0.3, { t, bright: 0.4 }); }
    if (o.crit) { A.bell(1760, 0.12, 0.5, { t }); A.pluck(note((o.note || 0) % 11) + 7, 0.24, { t: t + 0.04, bright: 0.8 }); }
    if (o.kill) SFX.tear(A, {}, t + 0.02);
  },
  tear(A, o, t) { // 종이 찢기는 소리
    for (let i = 0; i < 6; i++) A.noise(0.03, 0.12, { t: t + i * 0.022 + r(0, 0.01), type: 'highpass', f0: r(2500, 5200), q: 0.7 });
    A.tone('sine', 230, 70, 0.14, 0.2, { t });
  },
  clang(A, o, t) { A.bell(1250, 0.16, 0.3, { t, parts: [[1, 1], [1.47, 0.8], [2.09, 0.6], [2.56, 0.4]] }); A.noise(0.02, 0.25, { t, type: 'highpass', f0: 3000 }); A.drum('tak', 0.5, { t }); },
  dodge(A, o, t) { A.noise(0.14, 0.2, { t, type: 'highpass', f0: 1800, f1: 6000, q: 0.5 }); for (let i = 0; i < 4; i++) A.noise(0.025, 0.05, { t: t + 0.03 + i * 0.03, f0: r(2500, 4500), q: 1.5 }); },
  perfect(A, o, t) {
    A.tone('sine', 420, 1680, 0.28, 0.12, { t, rev: 0.6 }); A.bell(1318, 0.14, 1.4, { t: t + 0.05 }); A.bell(1976, 0.07, 1.2, { t: t + 0.12 });
    A.drum('jing', 0.35, { t }); A.tone('sine', 110, 104, 0.9, 0.16, { t, a: 0.05 });
  },
  boost(A, o, t) { [0, 7, 12].forEach((d, i) => A.pluck(69 + d, 0.2, { t: t + i * 0.03, bright: 0.8 })); },
  hurt(A, o, t) {
    const p = o.power || 1;
    A.tone('sine', 120, 42, 0.2, 0.6, { t }); A.noise(0.14, 0.34, { t, type: 'lowpass', f0: 700, f1: 200 });
    A.pluck(58, 0.26, { t, bright: 0.35 }); A.pluck(57, 0.22, { t: t + 0.015, bright: 0.35 });
    if (p >= 3) A.drum('buk', 0.7, { t });
  },
  death(A, o, t) { A.drum('jing', 0.8, { t }); [69, 67, 64, 60, 57].forEach((m, i) => A.pluck(m, 0.24, { t: t + 0.25 + i * 0.26, bright: 0.4, vib: 0.012 })); A.tone('sine', 82, 55, 2.2, 0.2, { t, a: 0.1 }); },
  step(A, o, t) {
    if (o.wet) { A.noise(0.09, 0.045, { t, f0: r(900, 1500), q: 0.8 }); A.tone('sine', r(300, 420), 160, 0.05, 0.04, { t }); return; }
    A.noise(0.05, o.fast ? 0.13 : 0.09, { t, type: 'lowpass', f0: r(380, 620), q: 0.7 });
  },
  charge(A, o, t) { A.noise(0.9, 0.035, { t, f0: 220, f1: 1000, q: 2, a: 0.2 }); },
  chargeLv(A, o, t) { const f = o.lv === 2 ? 1568 : 1046; A.bell(f, 0.14, 0.5, { t }); A.pluck(o.lv === 2 ? 76 : 69, 0.22, { t, bright: 0.8 }); },
  slam(A, o, t) {
    const s = Math.min(1.4, 0.5 + (o.size || 2) * 0.16);
    A.tone('sine', 95, 30, 0.42, 0.7 * s, { t }); A.noise(0.3, 0.12 * s, { t, type: 'lowpass', f0: 520, f1: 120 }); A.drum('buk', 0.7 * s, { t: t + 0.01 });
    A.noise(0.25, 0.06 * s, { t: t + 0.05, f0: 1800, f1: 600, q: 0.5 });
  },
  stagger(A, o, t) { A.drum('kkwaeng', o.boss ? 1 : 0.8, { t }); A.tone('sine', 1320, 990, 0.2, 0.1, { t, rev: 0.5 }); if (o.boss) A.drum('jing', 0.6, { t }); },
  finStart(A, o, t) { A.noise(0.3, 0.07, { t, f0: 400, f1: 2400, q: 1.5, a: 0.18 }); A.drum('kung', 0.5, { t }); A.drum('kung', 0.6, { t: t + 0.12 }); },
  finisher(A, o, t) {
    A.drum('buk', 1.2, { t }); A.tone('sine', 74, 32, 0.4, 0.7, { t }); A.noise(0.2, 0.1, { t, type: 'lowpass', f0: 600, f1: 150 }); A.drum('tak', 0.8, { t: t + 0.01 });
    [57, 64, 69, 76].forEach((m, i) => A.pluck(m, 0.26, { t: t + 0.02 + i * 0.018, bright: 0.7 }));
    SFX.tear(A, {}, t + 0.03); A.bell(880, 0.1, 1.2, { t: t + 0.05 });
    if (o.boss) { A.drum('jing', 1, { t }); A.drum('buk', 1, { t: t + 0.16 }); }
  },
  art(A, o, t) { A.noise(0.22, 0.1, { t, f0: 500, f1: 2600, q: 1.2 }); A.pluck(45, 0.3, { t, bright: 0.5 }); A.pluck(57, 0.22, { t: t + 0.03, bright: 0.6 }); },
  wave(A, o, t) { A.noise(0.5, 0.12, { t, f0: 900, f1: 300, q: 0.8 }); A.tone('sine', 500, 180, 0.4, 0.08, { t }); },
  heal(A, o, t) { [72, 76, 79, 84].forEach((m, i) => A.pluck(m, 0.16, { t: t + i * 0.07, bright: 0.7 })); A.bell(1046, 0.07, 1.2, { t }); A.bell(1568, 0.05, 1.2, { t: t + 0.15 }); },
  gourd(A, o, t) { A.tone('sine', 380, 760, 0.04, 0.16, { t }); for (let i = 0; i < 3; i++) A.tone('sine', r(280, 380), r(420, 520), 0.07, 0.1, { t: t + 0.18 + i * 0.13 }); },
  deny(A, o, t) { A.tone('triangle', 196, 170, 0.09, 0.3, { t }); },
  lockOn(A, o, t) { A.tone('sine', 1250, 1250, 0.035, 0.16, { t }); A.tone('sine', 1660, 1660, 0.05, 0.13, { t: t + 0.04 }); },
  lockOff(A, o, t) { A.tone('sine', 900, 700, 0.05, 0.14, { t }); },
  pickup(A, o, t) { A.pluck(note(4 + Math.min(9, o.n || 1)), 0.2, { t, bright: 0.85, rev: 0.25 }); },
  inkFull(A, o, t) { A.pluck(64, 0.16, { t, bright: 0.7 }); A.pluck(69, 0.16, { t: t + 0.06, bright: 0.7 }); A.noise(0.1, 0.05, { t, type: 'lowpass', f0: 500 }); },
  splat(A, o, t) { A.noise(0.14, 0.1, { t, type: 'lowpass', f0: 1000, f1: 200 }); A.tone('sine', 210, 70, 0.1, 0.3, { t }); },
  // ── 적 ──
  tell(A, o, t) { if (o.big) { A.tone('sine', 196, 185, 0.34, 0.3, { t }); A.tone('sine', 207, 196, 0.34, 0.24, { t }); A.drum('tak', 0.6, { t }); A.tone('sine', 1568, 1320, 0.14, 0.14, { t, rev: 0.3 }); } else { A.tone('sine', 1760, 1480, 0.14, 0.34, { t, rev: 0.3 }); A.tone('sine', 1320, 1180, 0.12, 0.2, { t: t + 0.03 }); } },
  eSwing(A, o, t) { A.noise(o.big ? 0.3 : 0.18, o.big ? 0.2 : 0.13, { t, f0: 180, f1: o.big ? 700 : 900, f2: 260, sweep: 0.5, q: 1 }); },
  eHurt(A, o, t) {
    if (o.kind === 'inkling') A.tone('sine', r(820, 980), 480, 0.09, 0.2, { t });
    else if (o.kind === 'crane') A.tone('square', 1100, 700, 0.08, 0.08, { t });
    else if (o.kind === 'boar' || o.kind === 'toad' || o.kind === 'tiger') A.tone('sawtooth', 110, 70, 0.14, 0.2, { t });
    else A.tone('sawtooth', r(130, 160), 85, 0.11, 0.15, { t });
  },
  eDie(A, o, t) { A.noise(0.34, o.big ? 0.2 : 0.13, { t, type: 'lowpass', f0: 1300, f1: 140 }); A.tone('sine', 220, 55, 0.24, 0.4, { t }); if (o.big) A.drum('buk', 0.8, { t }); },
  alert(A, o, t) { A.drum('tak', 0.45, { t }); A.drum('tak', 0.55, { t: t + 0.09 }); },
  rise(A, o, t) { for (let i = 0; i < 6; i++) A.tone('sine', r(90, 160), r(240, 380), 0.06, 0.1, { t: t + i * 0.06 + r(0, 0.03) }); A.noise(0.4, 0.04, { t, type: 'lowpass', f0: 300, f1: 900 }); },
  squawk(A, o, t) { for (let i = 0; i < (o.n || 2); i++) { A.tone('sawtooth', r(1500, 1900), r(1100, 1300), 0.07, 0.1, { t: t + i * 0.11 }); A.noise(0.06, 0.03, { t: t + i * 0.11, f0: 2800, q: 3 }); } },
  croak(A, o, t) { for (let i = 0; i < 9; i++) A.tone('sawtooth', 92, 80, 0.03, 0.12, { t: t + i * 0.04 }); A.tone('sine', 70, 55, 0.4, 0.2, { t }); },
  snort(A, o, t) { A.noise(0.16, 0.07, { t, type: 'lowpass', f0: 380, q: 2 }); A.noise(0.12, 0.06, { t: t + 0.2, type: 'lowpass', f0: 320, q: 2 }); A.tone('sawtooth', 80, 62, 0.3, 0.16, { t }); },
  gallop(A, o, t) { A.drum('kung', 0.34, { t }); A.drum('kung', 0.28, { t: t + 0.09 }); },
  roar(A, o, t) { // 범의 포효
    const c = A.ctx, d = o.short ? 0.7 : 1.5, os = c.createOscillator(), os2 = c.createOscillator(), g = c.createGain(), ws = c.createWaveShaper(), f = c.createBiquadFilter(), tr = c.createOscillator(), tg = c.createGain();
    const cv = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(x * 3.2); } ws.curve = cv;
    os.type = 'sawtooth'; os2.type = 'sawtooth'; os.frequency.setValueAtTime(74, t); os.frequency.linearRampToValueAtTime(104, t + d * 0.25); os.frequency.exponentialRampToValueAtTime(52, t + d);
    os2.frequency.setValueAtTime(111, t); os2.frequency.linearRampToValueAtTime(152, t + d * 0.25); os2.frequency.exponentialRampToValueAtTime(76, t + d);
    f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(260, t); f.frequency.linearRampToValueAtTime(760, t + d * 0.3); f.frequency.exponentialRampToValueAtTime(240, t + d);
    tr.frequency.value = 27; tg.gain.value = 0.22; tr.connect(tg); tg.connect(g.gain);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.34, t + 0.08); g.gain.setValueAtTime(0.34, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    os.connect(ws); os2.connect(ws); ws.connect(f); f.connect(g); A.out(g, { rev: 0.5 });
    os.start(t); os2.start(t); tr.start(t); os.stop(t + d + 0.1); os2.stop(t + d + 0.1); tr.stop(t + d + 0.1);
    A.noise(d * 0.9, 0.1, { t, f0: 500, f1: 1400, f2: 350, sweep: 0.3, q: 0.6, a: 0.06, rev: 0.4 });
  },
  // ── 세계·UI ──
  shrine(A, o, t) { // 연적이 깨어난다
    for (let i = 0; i < 3; i++) A.tone('sine', r(900, 1300), r(500, 700), 0.09, 0.12, { t: t + i * 0.22, rev: 0.6 });
    [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => A.pluck(m, 0.2, { t: t + 0.7 + i * 0.13, bright: 0.7, vib: i > 4 ? 0.01 : 0 }));
    A.bell(523, 0.14, 3, { t: t + 0.7 }); A.bell(784, 0.08, 3, { t: t + 1.2 }); A.noise(2.4, 0.03, { t: t + 0.6, f0: 600, f1: 3000, q: 0.5, a: 0.8, rev: 0.5 });
  },
  rest(A, o, t) { [64, 67, 72].forEach((m, i) => A.pluck(m, 0.18, { t: t + i * 0.12, bright: 0.6 })); A.bell(659, 0.06, 1.6, { t }); },
  chest(A, o, t) { A.tone('sawtooth', 160, 240, 0.22, 0.04, { t }); A.drum('tak', 0.5, { t: t + 0.24 }); [72, 76, 79].forEach((m, i) => A.pluck(m, 0.16, { t: t + 0.34 + i * 0.07, bright: 0.8 })); },
  item(A, o, t) { [69, 76, 81].forEach((m, i) => A.pluck(m, 0.18, { t: t + i * 0.08, bright: 0.8 })); A.bell(1320, 0.06, 1, { t: t + 0.1 }); },
  learn(A, o, t) { A.drum('jing', 0.5, { t }); [57, 64, 69, 72, 76].forEach((m, i) => A.pluck(m, 0.24, { t: t + 0.15 + i * 0.11, bright: 0.7, vib: 0.008 })); },
  gate(A, o, t) { A.noise(1.8, 0.07, { t, type: 'lowpass', f0: 160, f1: 90, a: 0.2 }); A.tone('sine', 60, 44, 1.8, 0.3, { t, a: 0.2 }); A.drum('buk', 0.7, { t: t + 1.7 }); },
  barrier(A, o, t) { A.noise(0.9, 0.06, { t, type: 'lowpass', f0: 200, f1: 1200, a: 0.3 }); A.drum('jing', 0.5, { t }); },
  bossIntro(A, o, t) { A.drum('jing', 1, { t }); for (let i = 0; i < 10; i++) A.drum('buk', 0.22 + i * 0.045, { t: t + 0.5 + i * (0.16 - i * 0.008) }); },
  wash(A, o, t) { A.noise(3, 0.04, { t, f0: 800, f1: 4000, q: 0.4, a: 1.2, rev: 0.6 }); [72, 79, 84, 88].forEach((m, i) => A.pluck(m, 0.12, { t: t + 0.4 + i * 0.35, bright: 0.8 })); },
  uiMove(A, o, t) { A.tone('sine', 880, 840, 0.05, 0.22, { t }); },
  uiOk(A, o, t) { A.drum('tak', 0.4, { t }); A.pluck(69, 0.14, { t, bright: 0.7 }); },
  uiBack(A, o, t) { A.drum('tak', 0.3, { t }); A.pluck(62, 0.1, { t, bright: 0.5 }); },
  page(A, o, t) { for (let i = 0; i < 5; i++) A.noise(0.03, 0.05, { t: t + i * 0.03 + r(0, 0.012), f0: r(2500, 4500), q: 1 }); },
  stampUi(A, o, t) { A.tone('sine', 110, 50, 0.16, 0.4, { t }); A.drum('tak', 0.6, { t }); A.noise(0.05, 0.07, { t, type: 'lowpass', f0: 800 }); },
  upgrade(A, o, t) { A.drum('kung', 0.5, { t }); [60, 67, 72, 76].forEach((m, i) => A.pluck(m, 0.2, { t: t + 0.05 + i * 0.06, bright: 0.75 })); A.noise(0.4, 0.04, { t, f0: 300, f1: 1500, q: 1 }); },
  blip(A, o, t) { A.noise(0.02, 0.05, { t, f0: (o.pitch || 1) * r(1700, 2300), q: 2.5 }); A.tone('sine', (o.pitch || 1) * 620, (o.pitch || 1) * 560, 0.03, 0.04, { t }); },
  magpie(A, o, t) { for (let i = 0; i < (o.n || 3); i++) { const tt = t + i * r(0.09, 0.13); A.tone('sawtooth', r(1700, 2300), r(1300, 1600), 0.05, 0.09, { t: tt }); A.noise(0.05, 0.03, { t: tt, f0: 3200, q: 4 }); } },
  drop(A, o, t) { A.tone('sine', r(900, 1300), r(480, 640), 0.08, 0.16, { t, rev: 0.7 }); },
};
