// 헤드리스 점검. 먼저 `npm run bp:build`. 묶인 HTML 한 장을 file:// 로 열어 시나리오를 돌린다.
//   node byeongpung/scripts/check.cjs [시나리오.cjs] [인자...]
// 시나리오: module.exports = async (page, h, args) => { ... }   h.shot(이름), h.ev(fn, arg), h.log(...)
// 소프트웨어 WebGL(SwiftShader)이라 느리다 → 렌더링을 멈추고 필요한 때만 한 장씩 그린다. FPS는 의미 없음.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const file = path.join(root, '../dist/byeongpung/index.html');
const shots = path.join(root, '../shots');

(async () => {
  fs.mkdirSync(shots, { recursive: true });
  const W = +(process.env.W || 1280), H = +(process.env.H || 720);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [], warnings = [];
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error') errors.push(t); else if (m.type() === 'warning') warnings.push(t); else if (process.env.VERBOSE) console.log('[page]', t); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  let code = 0;
  try {
    await page.goto('file://' + file + '#debug', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 240000 });
    await page.evaluate(() => window.__game.freeze(true));
    const h = {
      async shot(name) {
        const ms = await page.evaluate(() => window.__game.renderOnce());
        await page.waitForTimeout(250);
        await page.screenshot({ path: path.join(shots, name + '.png'), timeout: 180000 });
        return ms;
      },
      ev: (fn, arg) => page.evaluate(fn, arg),
      log: (...a) => console.log(...a),
      shots,
    };
    const scen = process.argv[2] ? require(path.resolve(process.argv[2])) : require('./scenarios/smoke.cjs');
    const out = await scen(page, h, process.argv.slice(3));
    console.log(JSON.stringify({ errors, warnings: [...new Set(warnings)].slice(0, 10), out }, null, 1));
    if (errors.length) code = 1;
  } catch (e) { console.error('CHECK FAILED', e); console.log(JSON.stringify({ errors }, null, 1)); code = 2; }
  await browser.close();
  process.exit(code);
})();
