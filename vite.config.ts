import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  base: './',
  build: {
    target: 'es2022'
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
