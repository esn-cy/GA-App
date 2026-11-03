import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [
      {
        find: /^@ionic\/core\/components$/,
        replacement: path.resolve(__dirname, 'node_modules/@ionic/core/components/index.js')
      },
      { find: '@models', replacement: path.resolve(__dirname, '../back-end/src/models') },
      { find: '@env', replacement: path.resolve(__dirname, 'src/environments/environment.ts') },
      { find: '@app', replacement: path.resolve(__dirname, 'src/app') },
      { find: '@tabs', replacement: path.resolve(__dirname, 'src/app/tabs') },
      { find: '@common', replacement: path.resolve(__dirname, 'src/app/common') }
    ]
  },
  test: {
    testTimeout: 15000,
    server: {
      deps: {
        inline: ['@ionic/angular', '@ionic/core', '@idea-ionic/common']
      }
    },
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        '**/*.spec.ts',
        '**/*.module.ts',
        '**/*.routing.module.ts',
        'src/app/icons.ts',
        'src/main.ts',
        'src/polyfills.ts',
        'src/zone-flags.ts',
        'tests/**'
      ]
    }
  }
});
