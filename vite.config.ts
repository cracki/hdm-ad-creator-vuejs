import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      tailwindcss(),
      {
        name: 'html-csp',
        transformIndexHtml(html) {
          const apiUrl = env.VITE_API_URL || 'http://localhost:8000'
          return html.replace(/%VITE_API_URL%/g, apiUrl)
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/vue/') || id.includes('node_modules/vue-router/') || id.includes('node_modules/pinia/')) {
              return 'vendor-vue'
            }
            if (id.includes('node_modules/@tanstack/') || id.includes('node_modules/axios/')) {
              return 'vendor-query'
            }
            if (id.includes('node_modules/@vueuse/core/')) {
              return 'vendor-vueuse'
            }
            if (id.includes('node_modules/lucide-vue-next/') || id.includes('node_modules/dompurify/') || id.includes('node_modules/zod/')) {
              return 'vendor-ui'
            }
            if (id.includes('node_modules/tw-animate-css/')) {
              return 'vendor-ui'
            }
            if (id.includes('node_modules/')) {
              return 'vendor-other'
            }
          },
        },
      },
      target: 'esnext',
      sourcemap: false,
    },
  }
})
