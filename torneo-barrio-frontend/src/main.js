import { createApp } from 'vue'
import { Quasar, Notify, Dialog } from 'quasar'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'

import App from './App.vue'
import router from './router'
import './styles/app.scss'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(Quasar, {
  plugins: {
    Notify,
    Dialog,
  },
  config: {
    dark: true,
    brand: {
      primary: '#10b981',
      secondary: '#3b82f6',
      accent: '#eab308',
      dark: '#0b111e',
      positive: '#22c55e',
      negative: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b',
    },
  },
})

app.mount('#app')
