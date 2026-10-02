<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { RouterLink } from 'vue-router'
import { useTournamentStore } from '@/stores/tournament'
import ImagePreview from '@/components/ImagePreview.vue'
import MatchSummaryCard from '@/components/MatchSummaryCard.vue'
import {
  eventTypeLabel,
  formatMatchDate,
  getId,
} from '@/utils/matchFormatting'

const store = useTournamentStore()
const $q = useQuasar()
const matchPollInterval = 30000
let pollTimer
let lastMatchError = ''

const summaryCards = computed(() => [
  {
    label: 'Total de equipos',
    value: store.totalTeams,
    icon: 'groups',
    color: 'primary',
  },
  {
    label: 'Total de jugadores',
    value: store.totalPlayers,
    icon: 'sports_soccer',
    color: 'secondary',
  },
  {
    label: 'Partidos programados',
    value: store.scheduledMatches.length,
    icon: 'event',
    color: 'blue-grey',
  },
  {
    label: 'Partidos en curso',
    value: store.liveMatches.length,
    icon: 'sports',
    color: 'positive',
  },
  {
    label: 'Partidos finalizados',
    value: store.finishedMatches.length,
    icon: 'flag',
    color: 'dark',
  },
  {
    label: 'Goles registrados',
    value: store.totalGoals,
    icon: 'sports_soccer',
    color: 'accent',
  },
])

const topTeams = computed(() => [...store.teams].slice(0, 5))
const upcomingMatches = computed(() => store.matches
  .filter((match) => match.status === 'SCHEDULED' && new Date(match.date).getTime() >= Date.now())
  .sort((first, second) => new Date(first.date) - new Date(second.date))
  .slice(0, 4))
const liveMatches = computed(() => store.liveMatches)
const recentResults = computed(() => [...store.finishedMatches]
  .sort((first, second) => new Date(second.date) - new Date(first.date))
  .slice(0, 4))

const playerLabel = (playerId) => {
  const player = store.players.find((item) => item._id === getId(playerId))
  return player?.name || 'Jugador'
}

const teamLabel = (teamId) => {
  const team = store.teams.find((item) => item._id === getId(teamId))
  return team?.name || 'Equipo'
}

const recentEvents = computed(() => store.matches.flatMap((match) => {
  const events = [
    ...(match.goals || []).map((goal) => ({ ...goal, type: 'GOAL' })),
    ...(match.events || []),
  ]

  return events.map((event) => ({
    ...event,
    typeLabel: eventTypeLabel(event.type),
    playerLabel: playerLabel(event.player),
    teamLabel: teamLabel(event.team),
    match,
  }))
}).sort((first, second) => {
  const updatedTime = new Date(second.match.updatedAt || second.match.date).getTime()
    - new Date(first.match.updatedAt || first.match.date).getTime()
  return updatedTime || Number(second.minute) - Number(first.minute)
}).slice(0, 8))

const liveEventSummary = (match) => {
  const events = [
    ...(match.goals || []).map((goal) => ({ ...goal, type: 'GOAL' })),
    ...(match.events || []),
  ].sort((first, second) => Number(second.minute) - Number(first.minute))

  if (!events.length) {
    return 'Sin eventos registrados todavía.'
  }

  const latest = events[0]
  return `Último evento: ${eventTypeLabel(latest.type).toLowerCase()} de ${playerLabel(latest.player)} al ${latest.minute}'.`
}

watch(() => store.matchesError, (error) => {
  if (!error) {
    lastMatchError = ''
  } else if (error !== lastMatchError) {
    lastMatchError = error
    $q.notify({ type: 'negative', message: `No se pudieron actualizar los partidos: ${error}` })
  }
})

onMounted(async () => {
  pollTimer = window.setInterval(() => {
    store.fetchMatches()
  }, matchPollInterval)
  await store.fetchDashboard()
})

onUnmounted(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
  }
})
</script>

<template>
  <div>
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <p class="text-caption text-uppercase text-grey-7 q-mb-xs">Panel principal</p>
        <h1 class="text-h4 text-weight-bold q-ma-none">Dashboard del torneo</h1>
      </div>
    </div>

    <q-banner v-if="store.error" rounded class="bg-negative text-white q-mb-md">
      No se pudo cargar el resumen del torneo: {{ store.error }}
    </q-banner>

    <q-banner v-if="store.matchesError" rounded class="bg-warning text-dark q-mb-md">
      La información de partidos puede estar desactualizada. Se reintentará automáticamente.
    </q-banner>

    <div v-if="store.dashboardLoading && !store.teams.length && !store.players.length" class="row q-col-gutter-md">
      <div v-for="n in 6" :key="n" class="col-12 col-sm-6 col-md-2">
        <q-card flat class="metric-card">
          <q-skeleton type="rect" height="120px" />
        </q-card>
      </div>
    </div>

    <div v-else class="row q-col-gutter-md q-mb-lg">
      <div v-for="item in summaryCards" :key="item.label" class="col-12 col-sm-6 col-md-4 col-xl-2">
        <q-card flat bordered class="metric-card">
          <q-card-section class="row items-center justify-between">
            <div>
              <div class="text-caption text-grey-7">{{ item.label }}</div>
              <div class="text-h4 text-weight-bold q-mt-sm">{{ store.error ? '—' : item.value }}</div>
            </div>
            <q-icon :name="item.icon" size="2rem" :color="item.color" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-md">Equipos del torneo</div>

            <div v-if="topTeams.length">
              <div v-for="team in topTeams" :key="team._id" class="row items-center justify-between q-py-sm border-bottom">
                <div class="row items-center no-wrap">
                  <ImagePreview
                    :src="team.logoUrl"
                    fallback="/images/default-team.svg"
                    :alt="`Escudo de ${team.name}`"
                    width="36px"
                    height="36px"
                    show-error
                    class="q-mr-sm"
                  />
                  <div>
                    <div class="text-body1 text-weight-medium">{{ team.name }}</div>
                    <div class="text-caption text-grey-7">{{ team.stadium || 'Sin estadio registrado' }}</div>
                  </div>
                </div>
                <q-badge color="secondary" rounded>{{ team.shortName }}</q-badge>
              </div>
            </div>

            <div v-else class="text-grey-7">Aún no hay equipos registrados.</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-md">Accesos rápidos</div>

            <div class="column q-gutter-sm">
              <q-btn color="primary" unelevated to="/equipos" icon="groups">Ver equipos</q-btn>
              <q-btn color="secondary" unelevated to="/jugadores" icon="sports_soccer">Ver jugadores</q-btn>
              <q-btn color="accent" text-color="dark" unelevated to="/goleadores" icon="emoji_events">Estadísticas</q-btn>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row items-center justify-between q-mb-sm">
      <h2 class="text-h5 text-weight-bold q-my-sm">Próximos partidos</h2>
      <q-btn flat color="primary" to="/partidos" label="Ver calendario" icon-right="arrow_forward" />
    </div>
    <div v-if="upcomingMatches.length" class="row q-col-gutter-md q-mb-lg">
      <div v-for="match in upcomingMatches" :key="match._id" class="col-12 col-lg-6">
        <MatchSummaryCard :match="match" />
      </div>
    </div>
    <q-card v-else flat bordered class="q-pa-md q-mb-lg text-grey-7">
      No hay partidos programados para fechas futuras.
    </q-card>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-lg-6">
        <q-card flat bordered class="full-height">
          <q-card-section>
            <div class="row items-center justify-between q-mb-md">
              <div class="text-subtitle1 text-weight-bold">Partidos en curso</div>
              <q-badge color="positive" rounded>{{ liveMatches.length }}</q-badge>
            </div>
            <div v-if="liveMatches.length" class="q-gutter-sm">
              <div v-for="match in liveMatches" :key="match._id">
                <MatchSummaryCard :match="match" />
                <div class="text-caption text-grey-7 q-mt-xs">{{ liveEventSummary(match) }}</div>
              </div>
            </div>
            <div v-else class="text-grey-7">No hay encuentros en curso.</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-lg-6">
        <q-card flat bordered class="full-height">
          <q-card-section>
            <div class="row items-center justify-between q-mb-md">
              <div class="text-subtitle1 text-weight-bold">Últimos resultados</div>
              <q-btn flat dense color="primary" to="/partidos" label="Todos" />
            </div>
            <div v-if="recentResults.length" class="q-gutter-sm">
              <MatchSummaryCard v-for="match in recentResults" :key="match._id" :match="match" />
            </div>
            <div v-else class="text-grey-7">Aún no hay partidos finalizados.</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-md">Actividad reciente</div>
        <div v-if="recentEvents.length" class="column q-gutter-sm">
          <RouterLink
            v-for="(event, index) in recentEvents"
            :key="`${event.match._id}-${event.type}-${event.minute}-${index}`"
            :to="{ name: 'match-detail', params: { id: event.match._id } }"
            class="activity-row"
          >
            <q-avatar
              :icon="event.type === 'GOAL' ? 'sports_soccer' : event.type === 'ASSIST' ? 'assistant' : 'style'"
              :color="event.type === 'RED_CARD' ? 'negative' : event.type === 'YELLOW_CARD' ? 'warning' : 'primary'"
              text-color="white"
              size="36px"
            />
            <div class="col">
              <div class="text-weight-medium">{{ event.typeLabel }} · {{ event.playerLabel }}</div>
              <div class="text-caption text-grey-7">
                {{ event.teamLabel }} · {{ event.match.homeTeam?.name }} vs {{ event.match.awayTeam?.name }}
                · minuto {{ event.minute }} · {{ formatMatchDate(event.match.date) }}
              </div>
            </div>
            <q-icon name="chevron_right" color="grey-6" />
          </RouterLink>
        </div>
        <div v-else class="text-grey-7">
          No hay goles ni otros eventos registrados. Al registrarlos desde el detalle de un partido aparecerán aquí.
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<style scoped>
.metric-card {
  min-height: 130px;
}

.border-bottom {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.activity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.07);
}

.activity-row:last-child {
  border-bottom: 0;
}
</style>
