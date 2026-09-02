import { defineConfig } from 'vite';

// EXMOB build configuration.
// index.html at the repo root is the single entry point.
// `npm run dev` serves it over HTTP (required: ES modules + GLB assets cannot load over file://).
export default defineConfig({
  base: './',
  server: { port: 5173, open: false },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
