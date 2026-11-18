// 마르지 않는 병풍 — 별도 Vite 루트. 결과물은 dist/byeongpung (GitHub Pages에서 /ruined-city-game/byeongpung/).
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  base: './',
  build: {
    outDir: path.join(root, '../dist/byeongpung'),
    emptyOutDir: true,
    assetsInlineLimit: 1e8, // 글꼴까지 전부 한 파일에 넣는다
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 6000,
  },
});
