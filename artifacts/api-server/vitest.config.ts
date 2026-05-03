import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    // DATABASE_URL is read from real env; SESSION_SECRET must be set
    env: {
      SESSION_SECRET: 'test-session-secret-for-vitest-32chars!!',
      NODE_ENV: 'test',
      PORT: '0',
    },
    pool: 'forks',
    testTimeout: 15000,
    hookTimeout: 10000,
    // Run test files sequentially so DB writes from one file don't race with another
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@workspace/db': resolve(__dirname, '../../lib/db/src/index.ts'),
      '@workspace/api-zod': resolve(__dirname, '../../lib/api-zod/src/index.ts'),
    },
  },
});
