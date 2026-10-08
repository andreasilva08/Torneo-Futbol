import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: true,
  }),
  persist: {
    key: 'torneo-barrio-ui',
    paths: ['sidebarOpen'],
  },
})
