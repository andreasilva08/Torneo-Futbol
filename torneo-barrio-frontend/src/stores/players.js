// stores/players.js — Estado y acciones exclusivas de jugadores
import { defineStore } from 'pinia'
import api from '@/services/api'

export const usePlayersStore = defineStore('players', {
  state: () => ({
    players: [],
    loading: false,
    error: null,
  }),

  getters: {
    totalPlayers: (state) => state.players.length,
  },

  actions: {
    async fetchPlayers() {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get('/players')
        this.players = data || []
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async createPlayer(payload) {
      const { data } = await api.post('/players', payload)
      this.players = [data, ...this.players]
      return data
    },

    async updatePlayer(playerId, payload) {
      const { data } = await api.put(`/players/${playerId}`, payload)
      this.players = this.players.map((player) => (player._id === playerId ? data : player))
      return data
    },

    async deletePlayer(playerId) {
      const { data } = await api.delete(`/players/${playerId}`)
      this.players = this.players.filter((player) => player._id !== playerId)
      return data
    },
  },
})
