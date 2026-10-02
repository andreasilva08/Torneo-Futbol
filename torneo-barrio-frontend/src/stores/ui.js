import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    theme: 'light',
    sidebarOpen: true,
  }),
  persist: {
    key: 'torneo-barrio-ui',
    paths: ['theme', 'sidebarOpen'],
  },
  actions: {
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
    },
  },
})
