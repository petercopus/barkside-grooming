import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '~~': root,
      '@@': root,
      '~': resolve(root, 'app'),
      '@': resolve(root, 'app'),
    },
  },
  test: {
    setupFiles: ['./tests/setup.ts'],
    environment: 'node',
  },
});
