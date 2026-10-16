import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
const version = pkg.version
// QA5-تازه۶: the CI/CD-injected commit wins when present (the build machine
// may not have git history, e.g. a docker build context or a shallow clone);
// only then fall back to the local git rev-parse, "unknown" as the last resort.
const envCommit = process.env.VITE_GIT_COMMIT?.trim()
let commitHash = 'unknown'
if (envCommit) {
  commitHash = envCommit
} else {
  try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    commitHash = 'unknown'
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commitHash),
    __BUILD_INFO__: JSON.stringify({ commit: commitHash, builtAt: new Date().toISOString() }),
  },
  plugins: [
    vue(),
    tailwindcss(),
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
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/jspdf-autotable')) {
            return 'vendor-export-pdf'
          }
          if (id.includes('node_modules/pptxgenjs')) {
            return 'vendor-export-pptx'
          }
          if (id.includes('node_modules/exceljs')) {
            return 'vendor-export-xlsx'
          }
          if (id.includes('node_modules/lottie-web/')) {
            return 'vendor-ui'
          }
          if (id.includes('node_modules/')) {
            return 'vendor-other'
          }
        },
      },
    },
    target: 'esnext',
    sourcemap: true,
  },
})
