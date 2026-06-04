import { defineConfig } from 'vitest/config';

// Self-contained config so `npm test` here doesn't climb up and inherit the
// website's root vite.config.ts (which pulls in deps not installed in this package).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
