// Playthrough check (run `npm run build` first): new game -> ending through every puzzle with the real
// interactions (teleporting between places, stacking crates and climbing for real). Exit code 1 on failure.
//   node scripts/playthrough.cjs
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const BASE = 'http://localhost:4173/ruined-city-game/';
async function waitUrl(url, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 400)); } throw new Error('no server'); }
(async () => {
  const srv = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: require('path').join(__dirname, '..'), stdio: 'ignore' });
  const log = [];
  try {
    await waitUrl(BASE, 30000);
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    const errors = []; page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE + '?debug', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 240000 });
    const ev = (fn, arg) => page.evaluate(fn, arg);
    await ev(() => { const g = window.__game; g.freeze(true); g.start(); g.noRemnants(true); g.sim(5); });
    const step = () => ev(() => window.__game.G.story.cur.id);
    await ev(() => { const G = window.__game.G; G.story.read('n_r1_table'); G.panels.close(); });
    log.push(['after note', await step()]);
    // P1: two crates stacked under the balcony, climb (mantle) onto it
    log.push(['P1', await ev(() => {
      const g = window.__game, G = g.G, P = (id) => G.props.byId.get(id), V = G.camera.position.constructor;
      G.props.placeAt(P('crate_r1_a'), new V(-28.0, 0.45, 241)); G.props.placeAt(P('crate_r1_b'), new V(-28.0, 1.35, 241)); g.sim(40);
      g.tp([-28.0, 1.8, 241, -Math.PI / 2]); g.sim(10);
      G.input.down.add('KeyW'); G.input.hit.add('Space'); g.sim(1); for (let i = 0; i < 40; i++) g.sim(1); G.input.down.delete('KeyW'); g.sim(10);
      return { feet: G.player.feet.toArray().map((v) => +v.toFixed(2)), stack: P('crate_r1_b').pos.y.toFixed(2) };
    })]);
    await ev(() => { const G = window.__game.G; G.interact.find('flashlight').onUse(); });
    log.push(['flashlight', await step()]);
    await ev(() => { const g = window.__game; g.tp('gate'); g.sim(5); });
    log.push(['at gate', await step()]);
    await ev(() => { const g = window.__game, G = g.G, p = G.props.byId.get('fuse_g_b3'); G.props.pick(p); G.interact.find('gatebox').onInsert(p); g.sim(5); });
    log.push(['gate fuse', await step()]);
    await ev(() => { const g = window.__game; g.tp('concourse'); g.sim(5); });
    log.push(['underground', await step()]);
    await ev(() => { const G = window.__game.G; G.interact.find('keypad_office').onUse(); for (const d of '0314') G.panels.press(d); });
    await page.waitForTimeout(1200);
    log.push(['keypad', await step(), await ev(() => window.__game.G.story.flags.officeOpen)]);
    // P4: the shelf fuse needs a crate: stack one under the shelf and stand on it
    log.push(['shelf', await ev(() => {
      const g = window.__game, G = g.G, P = (id) => G.props.byId.get(id), V = G.camera.position.constructor;
      G.props.placeAt(P('crate_u_a'), new V(39.6, -6.55, 26.4)); g.sim(30);
      g.tp([39.6, -6.1, 26.4, -Math.PI / 2], 20.6, -Math.PI / 2, 0.75); g.sim(10);
      const f = P('fuse_u_b'), e = G.camera.position; const dx = f.pos.x - e.x, dy = f.pos.y - e.y, dz = f.pos.z - e.z;
      G.player.yaw = Math.atan2(-dx, -dz); G.player.pitch = Math.atan2(dy, Math.hypot(dx, dz)); g.sim(2);
      const t1 = g.target(); g.tp([40.3, -7, 26.4, -Math.PI / 2]); g.sim(5); const e2 = G.camera.position; const dx2 = f.pos.x - e2.x, dy2 = f.pos.y - e2.y, dz2 = f.pos.z - e2.z; G.player.yaw = Math.atan2(-dx2, -dz2); G.player.pitch = Math.atan2(dy2, Math.hypot(dx2, dz2)); g.sim(2);
      return { fromCrate: t1, fromFloor: g.target() };
    })]);
    await ev(() => { const g = window.__game, G = g.G, I = (id) => G.interact.find(id); g.tp('office'); g.sim(2); I('pull_a').onUse(); I('slot_b').onInsert(G.props.carrying); const f = G.props.byId.get('fuse_u_b'); G.props.pick(f); I('slot_c').onInsert(f); g.sim(5); });
    log.push(['shutter', await step()]);
    await ev(() => { const g = window.__game; g.tp('hall3'); g.sim(5); g.tp('plaza'); g.sim(5); });
    log.push(['plaza', await step()]);
    await ev(() => { const g = window.__game, G = g.G, I = (id) => G.interact.find(id); I('tower_door').onUse(); I('gen_valve').onUse(); I('gen_choke').onUse(); I('gen_start').onUse(); I('gen_switch').onUse(); g.sim(100); });
    log.push(['generator', await step(), await ev(() => window.__game.G.world.col.dyn.has('tower_door'))]);
    // tower: two crates under the broken flight
    log.push(['broken flight', await ev(() => {
      const g = window.__game, G = g.G, P = (id) => G.props.byId.get(id), V = G.camera.position.constructor;
      G.props.placeAt(P('crate_t_a'), new V(-4.85, 8.45, -165.5)); G.props.placeAt(P('crate_t_b'), new V(-4.85, 9.35, -165.5)); g.sim(40);
      g.tp([-4.85, 9.8, -165.4, 0]); g.sim(10);
      G.input.down.add('KeyW'); for (let i = 0; i < 15; i++) g.sim(1); const hint = G.player.mantleHint; G.input.hit.add('Space'); g.sim(1); for (let i = 0; i < 90; i++) g.sim(1); G.input.down.delete('KeyW'); g.sim(5);
      return { hint, feet: G.player.feet.toArray().map((v) => +v.toFixed(2)) };
    })]);
    await ev(() => { const g = window.__game; g.tp([0, 24, -164, Math.PI]); g.sim(10); });
    log.push(['top', await step()]);
    await ev(() => { const G = window.__game.G; G.interact.find('core').onUse(); });
    await page.waitForTimeout(300);
    await ev(() => { const G = window.__game.G; G.panels.close(); });
    await page.waitForTimeout(300);
    await ev(() => { const G = window.__game.G; for (const d of '2147') G.panels.press(d); });
    await page.waitForTimeout(1500);
    log.push(['ending', await ev(() => window.__game.G.state)]);
    log.push(['errors', errors]);
    await browser.close();
  } catch (e) { log.push(['FAIL', String(e)]); }
  srv.kill();
  const get = (k) => (log.find((e) => e[0] === k) || [])[1];
  const fails = [];
  const expect = [['after note', 'flashlight'], ['flashlight', 'gate'], ['at gate', 'fuse_r1'], ['gate fuse', 'cross'], ['underground', 'office'], ['keypad', 'fuses_u'], ['shutter', 'tunnel'], ['plaza', 'tower'], ['generator', 'climb'], ['top', 'core'], ['ending', 'cutscene']];
  for (const [k, v] of expect) if (get(k) !== v) fails.push(`${k}: expected ${v}, got ${get(k)}`);
  if (!get('P1') || get('P1').feet[1] < 2.6) fails.push('P1: could not climb onto the balcony with two crates');
  if (!get('shelf') || get('shelf').fromCrate !== 'prop_fuse_u_b' || get('shelf').fromFloor) fails.push('storeroom fuse: must need a crate');
  if (!get('broken flight') || get('broken flight').feet[1] < 11) fails.push('tower: could not climb the broken flight with two crates');
  if ((get('errors') || []).length) fails.push('console errors');
  console.log(JSON.stringify({ pass: !fails.length, fails, log }, null, 1));
  process.exit(fails.length ? 1 : 0);
})();
