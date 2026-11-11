import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  // Relative Pfade: funktioniert unter https://<user>.github.io/<repo>/
  // genauso wie lokal, egal wie das Repo heißt.
  base: './',
  define: {
    // Versionsnummer aus package.json, im Code als __APP_VERSION__ verfügbar.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // Phaser ist groß (~1,5 MB) – das ist normal, also Warnschwelle anheben.
    chunkSizeWarningLimit: 2000,
  },
});
