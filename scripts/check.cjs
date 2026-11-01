// Headless check (run `npm run build` first). Starts `vite preview`, opens the game with ?debug, collects
// console errors and takes screenshots at teleport points. Rendering is frozen and done once per shot,
// because software WebGL (SwiftShader) is very slow.   Usage:
//   node scripts/check.cjs [name:teleport:hour:yaw:pitch ...]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const BASE = 'http://localhost:4173/ruined-city-game/';
const root = path.join(__dirname, '..');
const DEFAULT = ['house:start:14.2', 'street:street:14.6::0.05', 'gate:gate:16.2::0.12'];

async function waitUrl(url, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 400)); }
  throw new Error('preview server did not start');
}
(async () => {
  fs.mkdirSync(path.join(root, 'shots'), { recursive: true });
  const srv = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: root, stdio: 'ignore' });
  let code = 0;
  try {
    await waitUrl(BASE, 30000);
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [], warnings = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto(BASE + '?debug' + (process.env.Q ? '&q=' + process.env.Q : ''), { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 240000 });
    await page.evaluate(() => window.__game.freeze(true));
    const shot = async (name) => { const r = await page.evaluate(() => window.__game.renderOnce()); await page.waitForTimeout(800); await page.screenshot({ path: path.join(root, 'shots', name + '.png'), timeout: 120000 }); return r; };
    const perf = { title: await shot('title') };
    await page.evaluate(() => window.__game.start());
    const specs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;
    const infos = [];
    for (const spec of specs) {
      const [name, tp, hour, yaw, pitch] = spec.split(':');
      await page.evaluate(([tp, h, y, p]) => { const g = window.__game; g.tp(tp, h === '' || h === undefined ? undefined : +h, y === '' || y === undefined ? undefined : +y, p ? +p : 0); g.sim(20); }, [tp, hour, yaw, pitch]);
      perf[name] = await shot(name);
      infos.push(await page.evaluate(() => window.__game.info()));
    }
    console.log(JSON.stringify({ errors, warnings: [...new Set(warnings)].slice(0, 12), infos, perf }, null, 1));
    if (errors.length) code = 1;
    await browser.close();
  } catch (e) { console.error('CHECK FAILED', e); code = 2; }
  srv.kill();
  process.exit(code);
})();
