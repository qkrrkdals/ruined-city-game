// 글꼴 자르기: 게임 문장(src/data/*.json)에 실제로 쓰인 글자만 남겨 woff2 로 만든다(HTML 한 장에 넣기 위해).
// 글꼴: 동해독도(제목) · 연성(이름·단추) · 송명(본문) — 모두 SIL OFL.
import subsetFont from 'subset-font';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const dataDir = path.join(here, '../src/data'), outDir = path.join(here, '../src/assets/fonts');
let text = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~·…—–「」『』〈〉→←↑↓×÷±%°';
for (const f of fs.readdirSync(dataDir)) if (f.endsWith('.json')) text += fs.readFileSync(path.join(dataDir, f), 'utf8');
const chars = [...new Set(text)].join('');
const FONTS = [
  ['title', '@expo-google-fonts/east-sea-dokdo/400Regular/EastSeaDokdo_400Regular.ttf'],
  ['brush', '@expo-google-fonts/yeon-sung/400Regular/YeonSung_400Regular.ttf'],
  ['body', '@expo-google-fonts/song-myung/400Regular/SongMyung_400Regular.ttf'],
];
fs.mkdirSync(outDir, { recursive: true });
for (const [name, mod] of FONTS) {
  const buf = await subsetFont(fs.readFileSync(require.resolve(mod)), chars, { targetFormat: 'woff2' });
  fs.writeFileSync(path.join(outDir, name + '.woff2'), buf);
  console.log(`fonts: ${name}.woff2 ${Math.round(buf.length / 1024)}KB (${chars.length}자)`);
}
