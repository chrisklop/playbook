import { defineConfig } from 'vitest/config';

// Pure unit tests — do not load the Svelte plugin.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
