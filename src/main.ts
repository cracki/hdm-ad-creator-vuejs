import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/vazirmatn/400.css'
import '@fontsource/vazirmatn/500.css'
import '@fontsource/vazirmatn/600.css'
import '@fontsource/vazirmatn/700.css'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './infrastructure/router'
import { registerServiceWorker } from './infrastructure/pwa'
import './styles.css'

declare const __APP_VERSION__: string
declare const __APP_COMMIT__: string

const appVersion = __APP_VERSION__
const appCommit = __APP_COMMIT__

console.log(
  `%c HDM Ad Creator %c v${appVersion} (${appCommit}) `,
  'background: #7c3aed; color: #fff; font-size: 14px; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
  'background: #1e1b4b; color: #a78bfa; font-size: 12px; padding: 4px 8px; border-radius: 0 4px 4px 0;',
)

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  },
})

app.mount('#app')

registerServiceWorker()
