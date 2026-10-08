import { createRouter, createWebHistory } from 'vue-router'

import DashboardView from '@/views/DashboardView.vue'
import TeamsView from '@/views/TeamsView.vue'
import TeamDetailView from '@/views/TeamDetailView.vue'
import PlayersView from '@/views/PlayersView.vue'
import StandingsView from '@/views/StandingsView.vue'
import ScorersView from '@/views/ScorersView.vue'
import AssistsView from '@/views/AssistsView.vue'
import GoalkeepersView from '@/views/GoalkeepersView.vue'
import MatchesView from '@/views/MatchesView.vue'
import MatchDetailView from '@/views/MatchDetailView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
  },
  {
    path: '/equipos',
    name: 'teams',
    component: TeamsView,
  },
  {
    path: '/equipos/:id',
    name: 'team-detail',
    component: TeamDetailView,
    props: true,
  },
  {
    path: '/jugadores',
    name: 'players',
    component: PlayersView,
  },
  {
    path: '/partidos',
    name: 'matches',
    component: MatchesView,
  },
  {
    path: '/partidos/:id',
    name: 'match-detail',
    component: MatchDetailView,
    props: true,
  },
  {
    path: '/tabla',
    name: 'standings',
    component: StandingsView,
  },
  {
    path: '/goleadores',
    name: 'scorers',
    component: ScorersView,
  },
  {
    path: '/asistencias',
    name: 'assists',
    component: AssistsView,
  },
  {
    path: '/porteros',
    name: 'goalkeepers',
    component: GoalkeepersView,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
