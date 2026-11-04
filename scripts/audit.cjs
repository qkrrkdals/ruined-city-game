// World audit (run `npm run build` first): finds the kinds of bugs players hit in the first release.
//  - holes: walkable ground next to a spot with no floor (you would fall out of the world)
//  - see-through: floor collision at ground level where nothing is drawn (you see the void)
//  - edge: walking off every map edge must be stopped
//  - garage: crouching underground in r1 must not hide the world
//  - interact: every interactable must be usable from somewhere you can stand (aiming straight at it)
//  - stairs: walking down stairs must stay grounded (footsteps, E)
//  - shaders: no new shader programs may be compiled after loading (= hitches)
//  - cpu: per-frame logic time with Remnants chasing
// Usage: node scripts/audit.cjs            exit code 1 if anything fails
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const BASE = 'http://localhost:4173/ruined-city-game/';
const root = require('path').join(__dirname, '..');

async function waitUrl(url, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 400)); } throw new Error('preview server did not start'); }

function floodHoles(g, sx, sz) {
  const { nx, nz, X0, Z0, S, vis, colH, blocked } = g, N = nx * nz, idx = (i, j) => i + j * nx;
  const xy = (k) => [X0 + ((k % nx) + 0.5) * S, Z0 + (Math.floor(k / nx) + 0.5) * S];
  const seen = new Uint8Array(N), q = [idx(Math.floor((sx - X0) / S), Math.floor((sz - Z0) / S))], holes = [], see = [];
  seen[q[0]] = 1;
  while (q.length) {
    const k = q.pop(), i = k % nx, j = Math.floor(k / nx);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const n = idx(a, b); if (seen[n] || blocked[n]) continue;
      if (colH[n] <= -9) { holes.push(xy(n)); seen[n] = 1; continue; }
      if (Math.abs(colH[n] - colH[k]) > 0.6) continue;
      seen[n] = 1; q.push(n);
    }
  }
  for (let k = 0; k < N; k++) if (seen[k] && colH[k] > -0.7 && colH[k] < 0.7 && !vis[k]) see.push(xy(k));
  return { holes, see };
}
const box = (pts) => pts.length ? { n: pts.length, x: [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))], z: [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))] } : null;

(async () => {
  const srv = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: root, stdio: 'ignore' });
  const fails = [], info = {};
  try {
    await waitUrl(BASE, 30000);
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto(BASE + '?debug', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 240000 });
    const progs0 = await page.evaluate(() => window.__game.G.renderer.info.programs.map((p) => p.cacheKey));
    await page.evaluate(() => { const g = window.__game; g.freeze(true); g.start(); g.noRemnants(true); g.sim(5); });

    // shaders compiled after loading + CPU with Remnants
    const c = await page.evaluate(() => {
      const g = window.__game, G = g.G; g.noRemnants(false); G.flashlight.give(); G.flashlight.on = true;
      const res = {};
      for (const [tp, h] of [['plaza', 25.2], ['arcade', 20.8], ['ceremony', 20.5]]) {
        g.tp(tp, h); g.sim(10); g.renderOnce();
        const ticks = []; G.input.down.add('KeyW'); G.input.down.add('ShiftLeft');
        for (let i = 0; i < 300; i++) { G.player.yaw += 0.012; const t0 = performance.now(); g.sim(1); ticks.push(performance.now() - t0); if (G.remnants.catching) { G.remnants.catching = false; G.player.enabled = true; G.player.lookEnabled = true; } }
        G.input.down.clear(); ticks.sort((a, b) => a - b);
        res[tp] = { avg: +(ticks.reduce((a, b) => a + b, 0) / ticks.length).toFixed(2), p99: +ticks[Math.floor(ticks.length * 0.99)].toFixed(1), max: +ticks[ticks.length - 1].toFixed(1) };
      }
      G.weather.rain = 1; G.weather.dust = 1; g.renderOnce();
      g.noRemnants(true); G.weather.rain = 0; G.weather.dust = 0; G.flashlight.on = false;
      return { cpu: res, keys: G.renderer.info.programs.map((p) => p.cacheKey) };
    });
    info.cpu = c.cpu;
    const nw = c.keys.filter((k) => !progs0.includes(k));
    if (nw.length) fails.push(`shaders: ${nw.length} program(s) compiled after loading: ` + nw.map((k) => k.slice(0, 60)).join(' / '));
    // ground maps
    const g = await page.evaluate(() => {
      const G = window.__game.G, col = G.world.col, V3 = G.camera.position.constructor;
      const X0 = -82, X1 = 82, Z0 = -192, Z1 = 268, S = 0.5, nx = (X1 - X0) / S, nz = (Z1 - Z0) / S;
      let Ortho = null; G.scene.traverse((o) => { if (o.isDirectionalLight && !Ortho) Ortho = o.shadow.camera.constructor; });
      const cam = new Ortho(X0, X1, -Z0, -Z1, 0, 80); cam.position.set(0, 0.35, 0); cam.up.set(0, 0, -1); cam.lookAt(0, -10, 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      const rt = new (G.gfx.composer.renderTarget1.constructor)(nx, nz), white = new (G.props.glowMat.constructor)({ color: 0xffffff, fog: false });
      const saved = [], hide = (o) => { if (o) { saved.push([o, o.visible]); o.visible = false; } };
      Object.values(G.world.details).forEach(hide); hide(G.world.groups.under); hide(G.world.far);
      for (const [n, gr] of Object.entries(G.world.groups)) if (n !== 'under') { saved.push([gr, gr.visible]); gr.visible = true; }
      const r = G.renderer, bg = G.scene.background, fog = G.scene.fog, sh = r.shadowMap.enabled;
      G.scene.background = null; G.scene.fog = null; G.scene.overrideMaterial = white; r.shadowMap.enabled = false;
      r.setRenderTarget(rt); r.setClearColor(0x000000, 1); r.clear(); r.render(G.scene, cam); r.setRenderTarget(null);
      const px = new Uint8Array(nx * nz * 4); r.readRenderTargetPixels(rt, 0, 0, nx, nz, px);
      G.scene.overrideMaterial = null; G.scene.background = bg; G.scene.fog = fog; r.shadowMap.enabled = sh; saved.reverse().forEach(([o, v]) => { o.visible = v; });
      const vis = new Uint8Array(nx * nz);
      for (let row = 0; row < nz; row++) for (let c = 0; c < nx; c++) { const z = Z1 - (row + 0.5) * S; vis[c + Math.floor((z - Z0) / S) * nx] = px[(row * nx + c) * 4] > 20 ? 1 : 0; }
      const o = new V3(), dn = new V3(0, -1, 0), sph = G.world.groups.r1.children[0].geometry.boundingSphere.clone(); sph.radius = 0.3;
      const colH = new Float32Array(nx * nz), blocked = new Uint8Array(nx * nz);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const x = X0 + (i + 0.5) * S, z = Z0 + (j + 0.5) * S, k = i + j * nx;
        o.set(x, 0.9, z); const h = col.ray(o, dn, 60, false); colH[k] = h ? 0.9 - h.distance : -999;
        sph.center.set(x, 1.0, z); blocked[k] = col.octree.sphereIntersect(sph) ? 1 : 0;
      }
      return { nx, nz, X0, Z0, S, vis: Array.from(vis), colH: Array.from(colH), blocked: Array.from(blocked) };
    });
    for (const [name, sx, sz] of [['r1', -19.9, 243.6], ['r3', 0, -64]]) {
      const r = floodHoles(g, sx, sz);
      if (r.holes.length) fails.push(`holes(${name}) ${JSON.stringify(box(r.holes))}`);
      if (r.see.length > 4) fails.push(`see-through(${name}) ${JSON.stringify(box(r.see))}`);
    }

    // edges, garage, stairs, interactables
    const w = await page.evaluate(() => {
      const g = window.__game, G = g.G, out = { edges: {}, stairs: {} };
      let fell = false; G.events.on('fellOut', () => { fell = true; });
      for (const [name, tp] of [['west', [-76, 0, 226, Math.PI / 2]], ['east', [76, 0, 226, -Math.PI / 2]], ['north', [0, 0, 262, 0 + Math.PI]], ['south', [60, 0, -186, 0]], ['r2west', [-76, 0, 75, Math.PI / 2]], ['r3east', [76, 0, -52, -Math.PI / 2]]]) {
        g.tp(tp); g.sim(5); fell = false; G.input.down.add('KeyW');
        for (let i = 0; i < 150 && !fell; i++) g.sim(1);
        G.input.down.delete('KeyW'); out.edges[name] = fell ? 'FELL' : 'ok';
      }
      g.tp([40, -3.8, 140, Math.PI / 2], 15); g.sim(10); G.player.setCrouch(true); g.sim(20);
      out.garageCrouch = G.world.groups.r1.visible; G.player.setCrouch(false); g.sim(10);
      let steps = 0; G.events.on('footstep', () => steps++);
      for (const [name, tp] of [['station', [-10, 0, 40, 1.57]], ['garageRamp', [18, 0, 159.5, 0]], ['tower', [4.85, 4, -169.5, Math.PI]]]) {
        g.tp(tp); g.sim(10); steps = 0; let air = 0; G.input.down.add('KeyW');
        for (let i = 0; i < 80; i++) { g.sim(1); if (G.player.airTime > 0.15) air++; }
        G.input.down.delete('KeyW'); out.stairs[name] = { air, steps };
      }
      const col = G.world.col, V3 = G.camera.position.constructor, sph = G.world.groups.r1.children[0].geometry.boundingSphere.clone();
      const dn = new V3(0, -1, 0), o = new V3(), e = new V3(), d = new V3(), p = new V3();
      out.items = [];
      for (const it of G.interact.items) {
        if (it.id.startsWith('prop_crate')) continue;
        const pos = it.getPos ? it.getPos(p) : it.pos, r = it.r ?? 0.3, range = (it.range ?? 2.3) + r * 0.5;
        let stand = 0, ok = 0;
        for (let rad = 0.5; rad <= 2.6; rad += 0.25) for (let a = 0; a < 24; a++) {
          const ang = (a / 24) * Math.PI * 2, x = pos.x + Math.cos(ang) * rad, z = pos.z + Math.sin(ang) * rad;
          o.set(x, pos.y + 1.2, z); const h = col.ray(o, dn, 4, true); if (!h) continue;
          const fy = o.y - h.distance; if (fy > pos.y + 0.3 || fy < pos.y - 2.6) continue;
          sph.radius = 0.32; sph.center.set(x, fy + 0.7, z); if (col.sphere(sph)) continue; sph.center.set(x, fy + 1.4, z); if (col.sphere(sph)) continue;
          stand++; e.set(x, fy + 1.64, z); const dist = pos.distanceTo(e); if (dist > range) continue;
          d.subVectors(pos, e).normalize(); if (col.ray(e, d, Math.max(0.01, dist - r - 0.06), !it.ignoreDyn)) continue;
          ok++;
        }
        out.items.push({ id: it.id, stand, ok });
      }
      return out;
    });
    for (const [k, v] of Object.entries(w.edges)) if (v !== 'ok') fails.push(`edge ${k}: player fell out`);
    if (!w.garageCrouch) fails.push('garage: crouching hides the residential district');
    for (const [k, v] of Object.entries(w.stairs)) if (v.air > 8) fails.push(`stairs ${k}: airborne ${v.air}/80 frames (steps ${v.steps})`);
    info.stairs = w.stairs;
    info.needsClimb = w.items.filter((i) => i.stand === 0).map((i) => i.id);
    for (const i of w.items) if (i.stand > 0 && (i.ok === 0 || i.ok / i.stand < 0.3)) fails.push(`interact ${i.id}: usable from ${i.ok}/${i.stand} spots`);

    if (errors.length) fails.push('console errors: ' + errors.slice(0, 3).join(' | '));
    await browser.close();
  } catch (e) { fails.push('AUDIT CRASHED ' + e); }
  srv.kill();
  console.log(JSON.stringify({ pass: fails.length === 0, fails, info }, null, 1));
  process.exit(fails.length ? 1 : 0);
})();
