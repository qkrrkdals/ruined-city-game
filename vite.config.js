import { defineConfig } from 'vite';

// GitHub Pages serves the site at /<repo-name>/
export default defineConfig({
  base: '/ruined-city-game/',
  build: { chunkSizeWarningLimit: 2000 },
});
