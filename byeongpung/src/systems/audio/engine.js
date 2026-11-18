// 소리 엔진: Web Audio 합성 기본기(음·잡음·뜯는 줄·종·북)와 버스(효과음/음악/잔향).
import { SFX } from './sfx.js';
import { createMusic } from './music.js';

export const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
// 계면조에 가까운 5음(라·도·레·미·솔). 연타가 이어질수록 올라간다.
export const SCALE = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88];
export const SCALE_MAJ = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84];

export function createAudio() {
  const A = {
    ctx: null, ready: false, vol: { master: 0.8, sfx: 1, music: 0.7 }, last: {}, ks: {},
    // 첫 사용자 입력 때 부른다. (점검용으로 OfflineAudioContext 를 넘길 수 있다)
    init(ctx) {
      if (A.ready) { A.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!ctx && !AC) return;
      try { A.ctx = ctx || new AC({ latencyHint: 'interactive' }); } catch (e) { return; }
      const c = A.ctx;
      A.master = c.createGain(); A.master.gain.value = A.vol.master;
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.18;
      A.master.connect(comp); comp.connect(c.destination);
      A.sfx = c.createGain(); A.sfx.gain.value = A.vol.sfx; A.sfx.connect(A.master);
      A.mus = c.createGain(); A.mus.gain.value = A.vol.music; A.mus.connect(A.master);
      // 잔향: 잡음을 지수 감쇠시킨 임펄스
      const len = Math.floor(c.sampleRate * 2.1), ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < 400 ? i / 400 : 1); }
      A.rev = c.createConvolver(); A.rev.buffer = ir;
      A.revIn = c.createGain(); A.revIn.gain.value = 0.5; A.revIn.connect(A.rev); A.rev.connect(A.master);
      const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      A.noiseBuf = nb;
      A.music = createMusic(A);
      A.ready = true;
    },
    resume() { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume().catch(() => {}); },
    suspend() { if (A.ctx && A.ctx.state === 'running' && A.ctx.suspend) A.ctx.suspend().catch(() => {}); },
    setVol(k, v) { A.vol[k] = v; if (!A.ready) return; const n = k === 'master' ? A.master : k === 'sfx' ? A.sfx : A.mus; n.gain.setTargetAtTime(v, A.ctx.currentTime, 0.05); },
    play(name, o) {
      if (!A.ready) return;
      const f = SFX[name]; if (!f) return;
      const t = A.ctx.currentTime; if (A.last[name] !== undefined && t - A.last[name] < 0.028) return; A.last[name] = t;
      try { f(A, o || {}, t); } catch (e) { /* 소리 때문에 게임이 멈추면 안 된다 */ }
    },
    setMood(m) { if (A.ready) A.music.setMood(m); else A.pendingMood = m; },
    update(rdt) { if (A.ready) { if (A.pendingMood) { A.music.setMood(A.pendingMood); A.pendingMood = null; } A.music.update(rdt); } },

    // ── 합성 기본기 ── (o.dest: 연결할 곳, o.rev: 잔향 보내는 양)
    out(node, o) { node.connect(o.dest || A.sfx); if (o.rev) { const s = A.ctx.createGain(); s.gain.value = o.rev; node.connect(s); s.connect(A.revIn); } },
    tone(type, f0, f1, dur, gain, o = {}) {
      const c = A.ctx, t = o.t ?? c.currentTime, os = c.createOscillator(), g = c.createGain(), a = o.a ?? 0.004;
      os.type = type; os.frequency.setValueAtTime(f0, t); if (f1 !== f0) os.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      if (o.detune) os.detune.value = o.detune;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + a); g.gain.exponentialRampToValueAtTime(gain * 0.03, t + a + dur); g.gain.linearRampToValueAtTime(0, t + a + dur + 0.02);
      os.connect(g); A.out(g, o); os.start(t); os.stop(t + a + dur + 0.05);
      return os;
    },
    noise(dur, gain, o = {}) {
      const c = A.ctx, t = o.t ?? c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), a = o.a ?? 0.003;
      s.buffer = A.noiseBuf; s.loop = true; s.playbackRate.value = o.rate || 1;
      f.type = o.type || 'bandpass'; f.Q.value = o.q ?? 0.9; f.frequency.setValueAtTime(o.f0 || 1000, t);
      if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur * (o.sweep ?? 1));
      if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
      // 걸러 낸 잡음은 대역이 좁을수록 작아진다 → 대역폭에 맞춰 키워 준다
      const nyq = c.sampleRate / 2, fc = o.f0 || 1000, bw = f.type === 'lowpass' ? fc : f.type === 'highpass' ? nyq - fc : fc / (o.q ?? 0.9);
      gain *= Math.min(7, Math.max(1, Math.sqrt(nyq / Math.max(50, bw)))) * 1.2;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + a);
      if (o.hold) g.gain.setValueAtTime(gain, t + a + o.hold);
      g.gain.exponentialRampToValueAtTime(gain * 0.03, t + a + (o.hold || 0) + dur); g.gain.linearRampToValueAtTime(0, t + a + (o.hold || 0) + dur + 0.02);
      s.connect(f); f.connect(g); A.out(g, o); s.start(t, Math.random() * 1.5); s.stop(t + a + (o.hold || 0) + dur + 0.05);
      return g;
    },
    // 뜯는 줄(가야금): Karplus–Strong 을 미리 구워 두고 튼다. vib=농현
    pluck(m, gain, o = {}) {
      const c = A.ctx, t = o.t ?? c.currentTime, bright = o.bright ?? 0.5, key = m + ':' + bright;
      let buf = A.ks[key];
      if (!buf) {
        const sr = c.sampleRate, f = midi(m), N = Math.max(2, Math.round(sr / f)), dur = Math.min(3.2, 1.2 + 260 / f), n = Math.floor(sr * dur);
        buf = c.createBuffer(1, n, sr); const d = buf.getChannelData(0), ring = new Float32Array(N);
        let pv = 0, mx = 0; for (let i = 0; i < N; i++) { pv += ((Math.random() * 2 - 1) - pv) * bright; ring[i] = pv; mx = Math.max(mx, Math.abs(pv)); }
        for (let i = 0; i < N; i++) ring[i] /= mx || 1;
        const decay = Math.pow(0.001, 1 / (f * dur * 0.9)); let k = 0;
        for (let i = 0; i < n; i++) { const a = ring[k], b = ring[(k + 1) % N]; d[i] = a * Math.min(1, (n - i) / 2000); ring[k] = (a + b) * 0.5 * decay; k = (k + 1) % N; }
        A.ks[key] = buf;
      }
      const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; g.gain.value = gain;
      if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vibRate || 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(o.vib, t + 0.35); l.connect(lg); lg.connect(s.playbackRate); l.start(t); l.stop(t + 3.4); }
      if (o.bend) { s.playbackRate.setValueAtTime(o.bend, t); s.playbackRate.exponentialRampToValueAtTime(1, t + 0.09); }
      if (o.dur) { g.gain.setValueAtTime(gain, t + o.dur); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur + 0.12); }
      s.connect(g); A.out(g, { rev: 0.35, ...o }); s.start(t);
      return s;
    },
    // 종·징: 어긋난 배음들의 합
    bell(f, gain, dur, o = {}) {
      const parts = o.parts || [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]];
      for (const [r, a] of parts) A.tone('sine', f * r, f * r, dur * (1 - 0.12 * r * 0.2), gain * a, { rev: 0.4, a: o.a ?? 0.002, ...o });
    },
    // 북·장구·목탁
    drum(kind, gain = 1, o = {}) {
      const t = o.t ?? A.ctx.currentTime, p = { ...o, t };
      if (kind === 'buk') { A.tone('sine', 150, 46, 0.34, 0.9 * gain, p); A.noise(0.05, 0.12 * gain, { ...p, type: 'lowpass', f0: 900 }); }
      else if (kind === 'kung') { A.tone('sine', 190, 72, 0.2, 0.6 * gain, p); A.noise(0.03, 0.06 * gain, { ...p, type: 'lowpass', f0: 700 }); }
      else if (kind === 'deok') { A.noise(0.045, 0.14 * gain, { ...p, f0: 2600, q: 1.6 }); A.tone('triangle', 620, 520, 0.05, 0.2 * gain, p); }
      else if (kind === 'tak') { A.tone('sine', 880, 820, 0.07, 0.4 * gain, p); A.tone('sine', 1320, 1300, 0.04, 0.16 * gain, p); A.noise(0.012, 0.1 * gain, { ...p, f0: 3000 }); }
      else if (kind === 'jing') { A.bell(118, 0.34 * gain, 3.2, { ...p, a: 0.012, parts: [[1, 1], [1.5, 0.5], [2.02, 0.55], [2.74, 0.3], [3.9, 0.16]] }); A.noise(0.5, 0.02 * gain, { ...p, f0: 500, q: 0.6 }); }
      else if (kind === 'kkwaeng') { A.bell(830, 0.2 * gain, 0.5, { ...p, parts: [[1, 1], [1.48, 0.8], [2.15, 0.6], [2.9, 0.45], [3.7, 0.3]] }); A.noise(0.03, 0.09 * gain, { ...p, type: 'highpass', f0: 4000 }); }
    },
  };
  return A;
}
