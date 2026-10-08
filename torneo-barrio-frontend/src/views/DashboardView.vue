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
  normalizeMatchStatus,
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
    label: 'Partidos registrados',
    value: store.totalMatches,
    icon: 'event',
    color: 'info',
  },
  {
    label: 'Jornadas jugadas',
    value: new Set(store.matches.map((match) => Number(match.matchday)).filter((matchday) => matchday > 0)).size,
    icon: 'calendar_month',
    color: 'accent',
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
  .filter((match) => normalizeMatchStatus(match.status) === 'SCHEDULED' && new Date(match.date).getTime() >= Date.now())
  .sort((first, second) => {
    const matchdayDifference = (Number(first.matchday || 0) || 0) - (Number(second.matchday || 0) || 0)
    if (matchdayDifference !== 0) {
      return matchdayDifference
    }

    return new Date(first.date) - new Date(second.date)
  })
  .slice(0, 4))
const liveMatches = computed(() => store.liveMatches)
const recentResults = computed(() => [...store.finishedMatches]
  .sort((first, second) => {
    const matchdayDifference = (Number(second.matchday || 0) || 0) - (Number(first.matchday || 0) || 0)
    if (matchdayDifference !== 0) {
      return matchdayDifference
    }

    return new Date(second.date) - new Date(first.date)
  })
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
      <div v-for="item in summaryCards" :key="item.label" class="col-12 col-sm-6 col-md-4 col-xl-3">
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

            <div v-if="topTeams.length" class="team-table-wrapper">
              <q-table
                :rows="topTeams"
                :columns="[
                  { name: 'logo', label: 'Escudo', field: 'logo', align: 'center' },
                  { name: 'name', label: 'Equipo', field: 'name', sortable: true },
                  { name: 'stadium', label: 'Estadio', field: 'stadium', sortable: true },
                  { name: 'shortName', label: 'Siglas', field: 'shortName', align: 'center' },
                ]"
                row-key="_id"
                flat
                bordered
                hide-pagination
                class="team-table"
              >
                <template #body-cell-logo="props">
                  <q-td :props="props" class="text-center">
                    <ImagePreview
                      :src="props.row.logoUrl"
                      :fallback="`/images/default-team-${(props.row.name || props.row._id || 'default').length % 6 + 1}.svg`"
                      :alt="`Escudo de ${props.row.name}`"
                      width="36px"
                      height="36px"
                      class="team-table__crest"
                    />
                  </q-td>
                </template>

                <template #body-cell-name="props">
                  <q-td :props="props">
                    <div class="text-weight-medium">{{ props.row.name }}</div>
                  </q-td>
                </template>

                <template #body-cell-stadium="props">
                  <q-td :props="props">
                    <span class="text-grey-7">{{ props.row.stadium || 'Sin estadio registrado' }}</span>
                  </q-td>
                </template>

                <template #body-cell-shortName="props">
                  <q-td :props="props" class="text-center">
                    <q-badge color="secondary" rounded>{{ props.row.shortName }}</q-badge>
                  </q-td>
                </template>
              </q-table>
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
  box-shadow: 0 8px 18px rgba(17, 24, 39, 0.04);
}

.metric-card :deep(.q-card__section) {
  padding: 18px 18px 16px;
}

.metric-card :deep(.text-caption) {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.metric-card :deep(.text-h4) {
  font-size: clamp(1.8rem, 2vw, 2.3rem);
  line-height: 1.1;
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

.team-table-wrapper {
  overflow-x: auto;
}

.team-table {
  min-width: 520px;
}

.team-table :deep(.q-table__top),
.team-table :deep(.q-table__bottom) {
  display: none;
}

.team-table :deep(th) {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #52605a;
}

.team-table :deep(td),
.team-table :deep(th) {
  border-color: rgba(0, 0, 0, 0.07);
}

.team-table :deep(tr:hover td) {
  background: rgba(31, 157, 104, 0.03);
}

.team-table__crest {
  display: inline-flex;
}
</style>
