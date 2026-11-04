// Web Audio engine: buses, synthesized reverb, ambience loops (wind, rain, birds, drips), Remnant voices
// (3D PannerNode), tension + heartbeat, pad music, and the event -> named-sound wiring.
import * as THREE from 'three';
import { SOUNDS } from './sounds.js';
import { Music } from './music.js';

const _f = new THREE.Vector3(), _u = new THREE.Vector3();

export class AudioEngine {
  constructor(G) {
    this.G = G; this.ctx = null; this.voices = new Map(); this.sounds = { ...SOUNDS };
    this.heartT = 0; this.ambT = 2; this.wet = { room: 0, hall: 0 };
    const init = () => this.init();
    G.events.on('ui', (a) => { if (['new', 'continue', 'resume', 'settings', 'journal'].includes(a)) init(); });
    G.events.on('lock', init);
    this.wire();
  }
  register(name, fn) { this.sounds[name] = fn; }
  // replace a synthesized sound with a recorded file later: E.register('bell', E.fromFile('sounds/bell.ogg'))
  fromFile(url) {
    let buf = null; fetch(url).then((r) => r.arrayBuffer()).then((a) => this.ctx && this.ctx.decodeAudioData(a)).then((b) => { buf = b; }).catch(() => {});
    return (E) => { if (!buf) return; const s = E.ctx.createBufferSource(); s.buffer = buf; E.out(s, 0.2); s.start(); };
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC());
    const mk = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    this.master = mk(this.G.settings.volume ?? 0.8);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    const S = this.G.settings;
    this.sfx = mk(S.volSfx ?? 1); this.sfx.connect(this.master);
    this.musicBus = mk(0.9); this.musicBus.connect(this.master);
    this.ambLP = ctx.createBiquadFilter(); this.ambLP.type = 'lowpass'; this.ambLP.frequency.value = 16000;
    this.amb = mk(S.volAmb ?? 1); this.amb.connect(this.ambLP).connect(this.master);
    // two convolution reverbs (room / hall) cross-faded by zone
    this.send = mk(1);
    for (const [k, dur, decay] of [['room', 1.1, 3], ['hall', 2.8, 2.2]]) {
      const c = ctx.createConvolver(); c.buffer = this.ir(dur, decay); const g = mk(0); this.send.connect(c).connect(g).connect(this.master); this['wet_' + k] = g;
    }
    // noise buffers
    const len = ctx.sampleRate * 2; this.noise = {};
    for (const type of ['white', 'pink', 'brown']) {
      const b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0); let l = 0, b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (type === 'white') d[i] = w;
        else if (type === 'brown') { l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; }
        else { b0 = 0.997 * b0 + 0.029591 * w; b1 = 0.985 * b1 + 0.032534 * w; b2 = 0.95 * b2 + 0.048056 * w; d[i] = (b0 + b1 + b2 + w * 0.1) * 0.9; }
      }
      this.noise[type] = b;
    }
    // ambience loops
    const loop = (type, f1, f2, q) => { const s = ctx.createBufferSource(); s.buffer = this.noise[type]; s.loop = true; const a = ctx.createBiquadFilter(); a.type = f1[0]; a.frequency.value = f1[1]; a.Q.value = q; const b = ctx.createBiquadFilter(); b.type = f2[0]; b.frequency.value = f2[1]; const g = mk(0); s.connect(a).connect(b).connect(g).connect(this.amb); s.start(); return { g, a }; };
    this.wind = loop('brown', ['bandpass', 500], ['lowpass', 1800], 0.6);
    this.rain = loop('white', ['highpass', 900], ['lowpass', 7000], 0.5);
    // tension cluster + tremolo
    this.tens = mk(0); const trem = ctx.createOscillator(); trem.frequency.value = 5.3; const tg = mk(0.35); trem.connect(tg).connect(this.tens.gain); trem.start();
    for (const f of [233.08, 246.94, 311.13, 329.63]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = mk(0.25); o.connect(g).connect(this.tens); o.start(); }
    this.tens.connect(this.sfx);
    this.music = new Music(this);
  }
  ir(dur, decay) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  out(node, send = 0.15) { node.connect(this.sfx); if (send > 0) this.sendTo(node, send); }
  sendTo(node, amount) { const g = this.ctx.createGain(); g.gain.value = amount; node.connect(g).connect(this.send); }
  // hq = HRTF (expensive, used for Remnants); ambient one-shots use cheap equal-power panning
  panner(pos, send = 0.2, hq = true) {
    const p = this.ctx.createPanner(); p.panningModel = hq ? 'HRTF' : 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 2; p.rolloffFactor = 1.4; p.maxDistance = 60;
    p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z;
    this.out(p, send); return p;
  }
  play(name, o = {}) { if (!this.ctx || this.ctx.state !== 'running') return; const fn = this.sounds[name]; if (fn) try { fn(this, o); } catch (e) { console.warn(e); } }
  setVolume(v) { if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  wire() {
    const E = this.G.events, G = this.G, p = (n, o) => this.play(n, o);
    E.on('footstep', (mode, feet) => p('step', { surf: G.world.surfaceAt(feet), mode, wet: G.weather && G.weather.rain > 0.5 && !G.world.zoneAt(G.camera.position) }));
    E.on('land', (v) => p('land', { v })); E.on('jump', () => p('jump'));
    E.on('pickup', (pr) => p(pr.crate ? 'liftCrate' : 'pickup')); E.on('drop', () => p('drop')); E.on('throw', () => p('throw'));
    E.on('impact', (pr, v) => p(pr.crate ? 'crateLand' : pr.kind === 'fuse' ? 'clink' : 'drop', { v })); E.on('break', () => p('glass'));
    E.on('paper', () => p('paper')); E.on('noteRead', () => {});
    E.on('flashlightClick', (on) => p(on ? 'flashOn' : 'flashOff')); E.on('flashlightDead', () => p('flashDead'));
    E.on('battery', () => p('battery'));
    E.on('keypadPress', () => p('keyPress')); E.on('keypadOk', () => p('keyOk')); E.on('keypadFail', () => p('keyFail'));
    E.on('gateOpen', () => p('rumble', { dur: 4.5 })); E.on('doorOpen', () => p('door')); E.on('socket', () => p('socket'));
    E.on('shutterOpen', () => { p('socket'); p('rumble', { dur: 5 }); }); E.on('generatorOn', () => p('generator'));
    E.on('shelterEnter', (s, first) => { if (first) p('shelter'); });
    E.on('remnantNotice', (r) => p('notice', { pos: r.pos.clone().setY(r.floorY + 1.6) })); E.on('remnantChase', () => p('chase'));
    E.on('caught', () => p('caught')); E.on('respawned', () => p('respawn'));
    E.on('bell', () => p('bell'));
    E.on('volume', (v) => this.setVolume(v));
  }
  voice(r) {
    const ctx = this.ctx, v = { g: ctx.createGain(), lp: ctx.createBiquadFilter(), src: [], off: 0 };
    v.g.gain.value = 0; v.lp.type = 'lowpass'; v.lp.frequency.value = 260;
    for (const f of [51.9, 55.4]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(v.lp); o.start(); v.src.push(o); }
    const n = ctx.createBufferSource(); n.buffer = this.noise.pink; n.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 4;
    const wg = ctx.createGain(); wg.gain.value = 0.35; const lfo = ctx.createOscillator(); lfo.frequency.value = 0.4 + Math.random() * 0.5; const lg = ctx.createGain(); lg.gain.value = 0.3; lfo.connect(lg).connect(wg.gain); lfo.start();
    n.connect(bp).connect(wg).connect(v.g); n.start(); v.lp.connect(v.g); v.src.push(n, lfo);
    v.p = this.panner(r.pos, 0.25); v.g.connect(v.p);
    return v;
  }
  update(dt) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const G = this.G, t = this.ctx.currentTime, cam = G.camera, L = this.ctx.listener;
    _f.set(0, 0, -1).applyQuaternion(cam.quaternion); _u.set(0, 1, 0).applyQuaternion(cam.quaternion);
    if (L.positionX) { L.positionX.value = cam.position.x; L.positionY.value = cam.position.y; L.positionZ.value = cam.position.z; L.forwardX.value = _f.x; L.forwardY.value = _f.y; L.forwardZ.value = _f.z; L.upX.value = _u.x; L.upY.value = _u.y; L.upZ.value = _u.z; }
    else { L.setPosition(cam.position.x, cam.position.y, cam.position.z); L.setOrientation(_f.x, _f.y, _f.z, _u.x, _u.y, _u.z); }
    const zone = G.world.zoneAt(cam.position), kind = zone ? zone.kind : 'outdoor', inside = kind !== 'outdoor';
    const W = G.weather || { wind: 0.8, rain: 0 }, playing = G.state === 'playing' || G.state === 'cutscene';
    this.wind.g.gain.setTargetAtTime((inside ? 0.028 : 0.06) * W.wind * (G.state === 'title' ? 0.7 : 1), t, 0.4);
    this.wind.a.frequency.setTargetAtTime(380 + Math.sin(G.elapsed * 0.31) * 140 + Math.sin(G.elapsed * 1.7) * 60 + W.wind * 120, t, 0.3);
    this.rain.g.gain.setTargetAtTime(W.rain * (inside ? 0.022 : 0.08), t, 0.5);
    // ambience dips a little while you walk so your own footsteps stay audible
    const S = G.settings, duck = G.player && G.player.moving && playing ? 0.78 : 1;
    this.amb.gain.setTargetAtTime((S.volAmb ?? 1) * duck, t, 0.25); this.sfx.gain.setTargetAtTime(S.volSfx ?? 1, t, 0.05);
    this.ambLP.frequency.setTargetAtTime(inside ? 900 : 16000, t, 0.3);
    const room = kind === 'indoor' ? 0.35 : 0, hall = kind === 'underground' || kind === 'garage' || kind === 'dim' ? 0.55 : kind === 'outdoor' ? 0.07 : 0.1;
    this.wet_room.gain.setTargetAtTime(room, t, 0.4); this.wet_hall.gain.setTargetAtTime(hall, t, 0.4);
    // remnant voices
    const R = G.remnants;
    for (const r of R ? R.list : []) {
      const on = playing && r.enabled && r.dist < 42 && !R.disabled;
      let v = this.voices.get(r);
      if (on && !v) { v = this.voice(r); this.voices.set(r, v); }
      if (!v) continue;
      // silent voices are torn down after a few seconds so idle oscillators/HRTF panners don't load the audio thread
      if (!on) { v.off += dt; if (v.off > 3) { v.src.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } }); v.g.disconnect(); v.p.disconnect(); this.voices.delete(r); continue; } } else v.off = 0;
      const lv = on ? (r.state === 'chase' ? 0.85 : r.state === 'notice' ? 0.6 : r.state === 'investigate' ? 0.4 : 0.22) : 0;
      v.g.gain.setTargetAtTime(lv * 0.55, t, 0.3); v.lp.frequency.setTargetAtTime(r.state === 'chase' ? 520 : 260, t, 0.3);
      v.p.positionX.value = r.pos.x; v.p.positionY.value = r.floorY + 1.5; v.p.positionZ.value = r.pos.z;
    }
    const threat = R && playing ? R.threat : 0;
    this.tens.gain.setTargetAtTime(Math.pow(threat, 1.6) * 0.07, t, 0.3);
    const chasing = R && playing && R.list.some((r) => r.enabled && r.state === 'chase');
    if (chasing) { this.heartT -= dt; if (this.heartT <= 0) { this.heartT = 0.72; this.play('heart', { v: 0.8 }); } } else this.heartT = 0;
    // ambient details
    this.ambT -= dt;
    if (this.ambT <= 0 && playing) {
      this.ambT = 2.5 + Math.random() * 5;
      const p = G.player.feet, rnd = new THREE.Vector3(p.x + (Math.random() - 0.5) * 30, p.y + 2 + Math.random() * 6, p.z + (Math.random() - 0.5) * 30);
      if (kind === 'underground' || kind === 'garage') this.play('drip', { pos: rnd.setY(p.y + 3) });
      else if (!inside && G.time.night < 0.15 && W.rain < 0.2 && G.world.regionAt(p) !== 'r3') this.play('bird', { pos: rnd });
    }
    const mood = G.state === 'cutscene' ? 'ending' : G.state === 'title' ? 'r1' : kind === 'underground' ? 'under' : G.world.regionAt(G.player.feet);
    this.music.update(dt, mood);
    this.musicBus.gain.setTargetAtTime((G.state === 'cutscene' ? 1.4 : 0.9) * (1 - threat * 0.7) * (S.volMusic ?? 1), t, 0.6);
  }
}
