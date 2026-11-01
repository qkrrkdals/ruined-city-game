// window.__game test hook: always in dev, in production only with ?debug in the URL.
import { TP } from '../world/layout.js';
import { tick } from './game.js';

export const DEBUG = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');

export function installDebug(G) {
  window.__game = {
    G,
    get ready() { return G.state !== 'loading'; },
    start() { G.newGame({ skipLock: true }); },
    tp(name, hour, yaw, pitch = 0) {
      const p = typeof name === 'string' ? TP[name] : name;
      if (!p) return false;
      G.player.spawn(p[0], p[1], p[2], yaw ?? p[3] ?? 0); G.player.pitch = pitch;
      if (hour !== undefined && hour !== null) G.time.set(hour, true);
      return true;
    },
    setHour(h) { G.time.set(h, true); },
    info() {
      const p = G.player.feet;
      return { state: G.state, pos: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)], yaw: +G.player.yaw.toFixed(2), hour: +G.time.hour.toFixed(2), region: G.world.regionAt(p), zone: G.world.zoneAt(p)?.id ?? null, onFloor: G.player.onFloor, story: G.story?.debugState?.() };
    },
    teleports: Object.keys(TP),
    props() { return G.props.list.map((p) => ({ id: p.id, state: p.state, pos: p.pos.toArray().map((v) => +v.toFixed(2)) })); },
    press(code) { G.input.hit.add(code); },
    target() { return G.interact.target?.id ?? null; },
    // headless helpers: stop per-frame rendering, simulate n frames, render exactly once
    freeze(on = true) { G.freeze = on; },
    sim(n = 10, dt = 1 / 30) { const f = G.freeze; G.freeze = true; for (let i = 0; i < n; i++) tick(G, dt); G.freeze = f; },
    renderOnce() {
      const r = G.renderer; r.info.autoReset = false; r.info.reset();
      const t0 = performance.now(); G.gfx.render(); r.getContext().finish();
      const out = { ms: Math.round(performance.now() - t0), calls: r.info.render.calls, tris: r.info.render.triangles };
      r.info.autoReset = true; return out;
    },
  };
}
