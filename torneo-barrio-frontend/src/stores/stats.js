// stores/stats.js — Estado y acciones exclusivas de estadísticas
import { defineStore } from 'pinia'
import api from '@/services/api'

export const useStatsStore = defineStore('stats', {
  state: () => ({
    standings: [],
    scorers: [],
    assists: [],
    goalkeepers: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchStandings() {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get('/standings')
        this.standings = data || []
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchTopScorers() {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get('/stats/top-scorers')
        this.scorers = data || []
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchTopAssists() {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get('/stats/top-assists')
        this.assists = data || []
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchGoalkeepersStats() {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get('/stats/goalkeepers')
        this.goalkeepers = data || []
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
  },
})
