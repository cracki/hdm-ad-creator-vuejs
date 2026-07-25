import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

// Standalone test config (intentionally separate from vite.config.ts so the
// production build is unaffected). Re-declares only what tests need: the Vue
// SFC plugin, the `@` path alias, and the compile-time globals referenced from
// src. CSS / Tailwind / rollup chunking from the app config are not needed when
// running unit tests.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify('test'),
    __APP_COMMIT__: JSON.stringify('test'),
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
