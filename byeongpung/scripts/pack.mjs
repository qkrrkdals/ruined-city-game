// 빌드 결과(dist/byeongpung)를 HTML 한 장으로 묶는다. 서버 없이 파일을 더블클릭해도 실행된다.
//   node byeongpung/scripts/pack.mjs [--release] [--artifact <경로>]
//   --release  : byeongpung/play.html 로도 복사(저장소에 넣는 실행 파일)
//   --artifact : 문서 뼈대(<html>·<head>·<body>) 없는 조각을 그 경로에 쓴다
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, '../../dist/byeongpung');
const built = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const src = fs.readFileSync(path.join(here, '../index.html'), 'utf8');

const cssFile = (built.match(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"/) || [])[1];
const jsFile = (built.match(/<script type="module"[^>]*src="\.\/([^"]+)"/) || [])[1];
if (!jsFile) { console.error('pack: 번들 스크립트를 찾지 못했습니다(이미 묶였나요?)'); process.exit(1); }
const css = cssFile ? fs.readFileSync(path.join(dist, cssFile), 'utf8') : '';
let js = fs.readFileSync(path.join(dist, jsFile), 'utf8');
if (/<\/script/i.test(js)) js = js.replace(/<\/script/gi, '<\\/script');
if (js.includes('<!--')) js = js.replace(/<!--/g, '<\\!--');
const title = (src.match(/<title>([^<]*)<\/title>/) || [])[1] || '마르지 않는 병풍';
const body = (src.match(/<body>([\s\S]*?)<script/) || [])[1].trim();

const standalone = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<style>${css}</style>
</head>
<body>
${body}
<script type="module">${js}</script>
</body>
</html>
`;
fs.rmSync(path.join(dist, 'assets'), { recursive: true, force: true });
fs.writeFileSync(path.join(dist, 'index.html'), standalone);
const kb = (s) => Math.round(Buffer.byteLength(s) / 1024) + 'KB';
console.log('pack: dist/byeongpung/index.html', kb(standalone));

const args = process.argv.slice(2);
if (args.includes('--release')) {
  fs.writeFileSync(path.join(here, '../play.html'), standalone);
  console.log('pack: byeongpung/play.html');
}
const ai = args.indexOf('--artifact');
if (ai >= 0 && args[ai + 1]) {
  const frag = `<title>${title}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>${css}</style>\n${body}\n<script type="module">${js}</script>\n`;
  fs.mkdirSync(path.dirname(args[ai + 1]), { recursive: true });
  fs.writeFileSync(args[ai + 1], frag);
  console.log('pack: artifact', args[ai + 1], kb(frag));
}
