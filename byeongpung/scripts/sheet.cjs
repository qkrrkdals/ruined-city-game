// 스크린샷 여러 장을 한 장으로 모은다:  node sheet.cjs out.png cols 접두어 [폭]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const [out, cols, prefix, w] = process.argv.slice(2);
  const dir = path.join(__dirname, '../../shots');
  const files = fs.readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith('.png')).sort((a, b) => fs.statSync(path.join(dir, a)).mtimeMs - fs.statSync(path.join(dir, b)).mtimeMs);
  const cw = +(w || 320);
  const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:2px">` + files.map((f) => `<div style="position:relative"><img src="${f}" style="width:${cw}px;display:block"><span style="position:absolute;left:2px;top:0;font:11px monospace;color:#f33;background:#fff8">${f.replace(prefix, '').replace('.png', '')}</span></div>`).join('') + '</body>';
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: cols * (cw + 2), height: 100 } });
  const hp = path.join(dir, '_sheet.html'); fs.writeFileSync(hp, '<meta charset="utf-8">' + html); await p.goto('file://' + hp); await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(dir, out), fullPage: true }); await b.close();
})();
