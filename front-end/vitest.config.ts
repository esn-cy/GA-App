import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@ionic/core/components': path.resolve(__dirname, 'node_modules/@ionic/core/components/index.js'),
      '@models': path.resolve(__dirname, '../back-end/src/models'),
      '@env': path.resolve(__dirname, 'src/environments/environment.ts'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@tabs': path.resolve(__dirname, 'src/app/tabs'),
      '@common': path.resolve(__dirname, 'src/app/common')
    }
  },
  test: {
    server: {
      deps: {
        inline: ['@ionic/angular', '@ionic/core', '@idea-ionic/common']
      }
    },
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/test-setup.ts'],
    include: ['tests/**/*.spec.ts'],
    exclude: ['node_modules/**', 'dist/**', 'www/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/app/**/*.ts'],
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
