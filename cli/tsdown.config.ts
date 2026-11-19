import { defineConfig } from 'tsdown';

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  entry: ['src/bin/ga-app.ts'],
  outDir: 'dist/bin',
  format: ['esm'],
  target: 'node24',
  platform: 'node',
  clean: true,
  sourcemap: true,
  dts: false,
  fixedExtension: false
});
