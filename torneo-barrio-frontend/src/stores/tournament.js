import { defineStore } from 'pinia'
import api from '@/services/api'
import { normalizeMatchStatus } from '@/utils/matchFormatting'

const getErrorMessage = (error) => {
  return error?.response?.data?.message || 'No se pudo completar la operación.'
}

export const getApiErrorMessage = getErrorMessage

const normalizeMatch = (match) => ({
  ...match,
  status: normalizeMatchStatus(match?.status),
  events: match.events || [],
  goals: match.goals || [],
})

export const useTournamentStore = defineStore('tournament', {
  state: () => ({
    teams: [],
    players: [],
    matches: [],
    standings: [],
    scorers: [],
    assists: [],
    goalkeepers: [],
    teamDetail: null,
    matchDetail: null,
    loading: false,
    dashboardLoading: false,
    matchesLoading: false,
    matchLoading: false,
    error: null,
    matchesError: null,
    matchError: null,
  }),
  getters: {
    totalTeams: (state) => state.teams.length,
    totalPlayers: (state) => state.players.length,
    totalMatches: (state) => state.matches.length,
    scheduledMatches: (state) => state.matches.filter((match) => normalizeMatchStatus(match.status) === 'SCHEDULED'),
    liveMatches: (state) => state.matches.filter((match) => normalizeMatchStatus(match.status) === 'IN_PROGRESS'),
    finishedMatches: (state) => state.matches.filter((match) => normalizeMatchStatus(match.status) === 'FINISHED'),
    totalGoals: (state) => state.matches.reduce((total, match) => total + (match.goals?.length || 0), 0),
  },
  actions: {
    async fetchDashboard() {
      this.dashboardLoading = true
      this.error = null

      try {
        const [teamsResponse, playersResponse, matchesResponse] = await Promise.all([
          api.get('/teams'),
          api.get('/players'),
          api.get('/matches'),
        ])

        this.teams = teamsResponse.data || []
        this.players = playersResponse.data || []
        this.matches = (matchesResponse.data || []).map(normalizeMatch)
      } catch (error) {
        this.error = getErrorMessage(error)
      } finally {
        this.dashboardLoading = false
      }
    },

    async fetchTeams() {
      this.loading = true
      this.error = null

      try {
        const { data } = await api.get('/teams')
        this.teams = data || []
      } catch (error) {
        this.error = getErrorMessage(error)
      } finally {
        this.loading = false
      }
    },

    async fetchPlayers() {
      this.loading = true
      this.error = null

      try {
        const { data } = await api.get('/players')
        this.players = data || []
      } catch (error) {
        this.error = getErrorMessage(error)
      } finally {
        this.loading = false
      }
    },

    async fetchMatches() {
      if (this.matchesLoading) {
        return
      }

      this.matchesLoading = true
      this.matchesError = null

      try {
        const { data } = await api.get('/matches')
        this.matches = (data || []).map(normalizeMatch)
      } catch (error) {
        this.matchesError = getErrorMessage(error)
      } finally {
        this.matchesLoading = false
      }
    },

    async fetchStandings() {
      this.loading = true
      this.error = null

      try {
        const { data } = await api.get('/standings')
        this.standings = data || []
      } catch (error) {
        this.error = getErrorMessage(error)
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
        this.error = getErrorMessage(error)
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
        this.error = getErrorMessage(error)
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
        this.error = getErrorMessage(error)
      } finally {
        this.loading = false
      }
    },

    async fetchMatch(matchId) {
      this.matchLoading = true
      this.matchError = null

      try {
        const { data } = await api.get(`/matches/${matchId}`)
        this.matchDetail = normalizeMatch(data)
        return this.matchDetail
      } catch (error) {
        this.matchError = getErrorMessage(error)
        this.matchDetail = null
        return null
      } finally {
        this.matchLoading = false
      }
    },

    async fetchTeamDetail(teamId) {
      this.loading = true
      this.error = null

      try {
        const { data } = await api.get(`/teams/${teamId}/players`)
        this.teamDetail = data
      } catch (error) {
        this.error = getErrorMessage(error)
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

    async createMatch(payload) {
      const { data } = await api.post('/matches', payload)
      await this.fetchMatches()
      return data
    },

    async updateMatchResult(matchId, payload) {
      const { data } = await api.put(`/matches/${matchId}/result`, payload)
      const updated = normalizeMatch({
        ...data,
        events: this.matchDetail?.events || data.events || [],
      })
      this.matchDetail = updated
      this.matches = this.matches.map((match) => (match._id === matchId ? { ...match, ...updated } : match))
      return updated
    },

    async updateMatchEvents(matchId, events) {
      const { data } = await api.put(`/matches/${matchId}/events`, { events })
      const updated = normalizeMatch(data)
      this.matchDetail = updated
      this.matches = this.matches.map((match) => (match._id === matchId ? { ...match, ...updated } : match))
      return updated
    },

  },
})
