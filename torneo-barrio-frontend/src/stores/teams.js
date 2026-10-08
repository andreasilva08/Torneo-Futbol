// stores/teams.js — Estado y acciones exclusivas de equipos
import { defineStore } from 'pinia'
import api from '@/services/api'

export const useTeamsStore = defineStore('teams', {
  state: () => ({
    teams: [],
    teamDetail: null,
    loading: false,
    error: null,
  }),

  getters: {
    totalTeams: (state) => state.teams.length,
  },

  actions: {
    async fetchTeams() {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get('/teams')
        this.teams = data || []
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchTeamDetail(teamId) {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get(`/teams/${teamId}/players`)
        this.teamDetail = data
      } catch (error) {
        this.error = error.message
        this.teamDetail = null
      } finally {
        this.loading = false
      }
    },

    async createTeam(payload) {
      const { data } = await api.post('/teams', payload)
      this.teams = [data, ...this.teams]
      return data
    },

    async updateTeam(teamId, payload) {
      const { data } = await api.put(`/teams/${teamId}`, payload)
      this.teams = this.teams.map((team) => (team._id === teamId ? data : team))
      return data
    },

    async deleteTeam(teamId) {
      const { data } = await api.delete(`/teams/${teamId}`)
      this.teams = this.teams.filter((team) => team._id !== teamId)
      return data
    },
  },
})
