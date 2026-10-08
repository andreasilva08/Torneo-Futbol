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

const matchTab = ref('upcoming') // 'upcoming' | 'recent'

const playedMatchdaysCount = computed(() => {
  const matchdays = store.matches
    .filter((m) => normalizeMatchStatus(m.status) === 'FINISHED')
    .map((m) => Number(m.matchday))
    .filter((md) => md > 0)
  return new Set(matchdays).size
})

const kpiMetrics = computed(() => [
  {
    label: 'Equipos Registrados',
    value: store.totalTeams,
    subtext: 'En competencia oficial',
    icon: 'groups',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
  },
  {
    label: 'Partidos Totales',
    value: store.totalMatches,
    subtext: `${store.finishedMatches.length} finalizados · ${store.scheduledMatches.length} pendientes`,
    icon: 'event',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
  {
    label: 'Goles Anotados',
    value: store.totalGoals,
    subtext: 'Promedio de gol activo',
    icon: 'sports_soccer',
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
  },
  {
    label: 'Jornadas Disputadas',
    value: `${playedMatchdaysCount.value} / 38`,
    subtext: 'Avance del torneo',
    icon: 'calendar_month',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
  },
])

const liveMatches = computed(() => store.liveMatches)

const upcomingMatches = computed(() => store.matches
  .filter((match) => normalizeMatchStatus(match.status) === 'SCHEDULED')
  .sort((first, second) => {
    const matchdayDifference = (Number(first.matchday || 0) || 0) - (Number(second.matchday || 0) || 0)
    if (matchdayDifference !== 0) return matchdayDifference
    return new Date(first.date) - new Date(second.date)
  })
  .slice(0, 4))

const recentResults = computed(() => [...store.finishedMatches]
  .sort((first, second) => {
    const matchdayDifference = (Number(second.matchday || 0) || 0) - (Number(first.matchday || 0) || 0)
    if (matchdayDifference !== 0) return matchdayDifference
    return new Date(second.date) - new Date(first.date)
  })
  .slice(0, 4))

const topLeaders = computed(() => {
  if (store.standings.length) {
    return store.standings.slice(0, 5)
  }
  return store.teams.slice(0, 5).map((t, idx) => ({
    position: idx + 1,
    name: t.name,
    logoUrl: t.logoUrl,
    points: 0,
    goalDifference: 0,
    played: 0,
  }))
})

const topScorersList = computed(() => {
  return store.scorers.slice(0, 5)
})

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
}).slice(0, 6))

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
  await Promise.all([
    store.fetchDashboard(),
    store.fetchStandings(),
    store.fetchTopScorers(),
  ])
})

onUnmounted(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
  }
})
</script>

<template>
  <div class="dashboard-page">
    <!-- PAGE HEADER -->
    <div class="sport-page-header">
      <div class="sport-page-header__left">
        <div class="sport-page-header__icon-box">
          <q-icon name="dashboard" />
        </div>
        <div>
          <div class="sport-page-header__eyebrow">TEMPORADA 2026 · PANEL PRINCIPAL</div>
          <h1 class="sport-page-header__title">Dashboard del Torneo</h1>
        </div>
      </div>

      <div class="row items-center q-gutter-sm">
        <q-btn
          unelevated
          color="primary"
          icon="event"
          label="Ver Fixture"
          to="/partidos"
        />
        <q-btn
          unelevated
          outline
          color="secondary"
          icon="table_chart"
          label="Tabla de Posiciones"
          to="/tabla"
        />
      </div>
    </div>

    <!-- ERROR BANNERS -->
    <q-banner v-if="store.error" rounded class="bg-negative text-white q-mb-md">
      No se pudo cargar el resumen del torneo: {{ store.error }}
    </q-banner>

    <q-banner v-if="store.matchesError" rounded class="bg-warning text-dark q-mb-md">
      La información de partidos puede estar desactualizada. Se reintentará automáticamente.
    </q-banner>

    <!-- TOP KPIS GRID -->
    <div v-if="store.dashboardLoading && !store.teams.length" class="row q-col-gutter-md q-mb-lg">
      <div v-for="n in 4" :key="n" class="col-12 col-sm-6 col-lg-3">
        <q-card flat class="sport-kpi-card">
          <q-skeleton type="rect" height="110px" />
        </q-card>
      </div>
    </div>

    <div v-else class="row q-col-gutter-md q-mb-xl">
      <div v-for="kpi in kpiMetrics" :key="kpi.label" class="col-12 col-sm-6 col-lg-3">
        <div class="sport-kpi-card">
          <div class="sport-kpi-card__top">
            <span class="sport-kpi-card__label">{{ kpi.label }}</span>
            <div class="sport-kpi-card__icon-wrap" :style="{ backgroundColor: kpi.bgColor, color: kpi.color }">
              <q-icon :name="kpi.icon" size="22px" />
            </div>
          </div>
          <div class="sport-kpi-card__value">
            {{ store.error ? '—' : kpi.value }}
          </div>
          <div class="sport-kpi-card__subtext">
            {{ kpi.subtext }}
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN TWO-COLUMN SPLIT -->
    <div class="row q-col-gutter-xl">
      <!-- LEFT COLUMN: LIVE MATCHES + FIXTURE / RECENT RESULTS -->
      <div class="col-12 col-lg-8">
        <!-- LIVE MATCHES SECTION (IF ANY) -->
        <div v-if="liveMatches.length" class="q-mb-xl">
          <div class="section-title-bar q-mb-md">
            <div class="row items-center gap-sm">
              <span class="live-dot-pulse"></span>
              <h2 class="section-heading text-negative">PARTIDOS EN VIVO AHORA</h2>
            </div>
            <span class="badge-live-count">{{ liveMatches.length }} EN JUEGO</span>
          </div>

          <div class="row q-col-gutter-md">
            <div v-for="match in liveMatches" :key="match._id" class="col-12">
              <MatchSummaryCard :match="match" />
            </div>
          </div>
        </div>

        <!-- UPCOMING & RECENT MATCHES SECTION -->
        <div class="q-mb-xl">
          <div class="section-title-bar q-mb-md">
            <div class="row items-center gap-sm">
              <q-icon name="sports_soccer" color="primary" size="20px" />
              <h2 class="section-heading">CALENDARIO DE ENCUENTROS</h2>
            </div>

            <div class="match-toggle-tabs">
              <button
                type="button"
                class="match-toggle-btn"
                :class="{ 'match-toggle-btn--active': matchTab === 'upcoming' }"
                @click="matchTab = 'upcoming'"
              >
                Próximos ({{ upcomingMatches.length }})
              </button>
              <button
                type="button"
                class="match-toggle-btn"
                :class="{ 'match-toggle-btn--active': matchTab === 'recent' }"
                @click="matchTab = 'recent'"
              >
                Resultados ({{ recentResults.length }})
              </button>
            </div>
          </div>

          <!-- UPCOMING TAB -->
          <div v-if="matchTab === 'upcoming'">
            <div v-if="upcomingMatches.length" class="row q-col-gutter-md">
              <div v-for="match in upcomingMatches" :key="match._id" class="col-12 col-md-6">
                <MatchSummaryCard :match="match" />
              </div>
            </div>
            <div v-else class="empty-state-card text-center q-pa-xl">
              <q-icon name="event_available" size="42px" color="grey-6" />
              <div class="text-subtitle1 text-weight-bold q-mt-sm">No hay partidos programados pendientes</div>
              <div class="text-caption text-grey-5 q-mt-xs">Todos los partidos registrados ya han finalizado o no hay fechas futuras.</div>
            </div>
          </div>

          <!-- RECENT RESULTS TAB -->
          <div v-if="matchTab === 'recent'">
            <div v-if="recentResults.length" class="row q-col-gutter-md">
              <div v-for="match in recentResults" :key="match._id" class="col-12 col-md-6">
                <MatchSummaryCard :match="match" />
              </div>
            </div>
            <div v-else class="empty-state-card text-center q-pa-xl">
              <q-icon name="sports" size="42px" color="grey-6" />
              <div class="text-subtitle1 text-weight-bold q-mt-sm">Aún no hay resultados de partidos finalizados</div>
              <div class="text-caption text-grey-5 q-mt-xs">Los resultados aparecerán aquí tan pronto terminen los encuentros.</div>
            </div>
          </div>

          <div class="row justify-end q-mt-md">
            <q-btn flat color="primary" to="/partidos" label="Ver todos los partidos y fixture completo" icon-right="arrow_forward" />
          </div>
        </div>

        <!-- RECENT ACTIVITY TIMELINE -->
        <div class="q-mb-xl">
          <div class="section-title-bar q-mb-md">
            <div class="row items-center gap-sm">
              <q-icon name="history" color="primary" size="20px" />
              <h2 class="section-heading">ACTIVIDAD Y MINUTA RECIENTE</h2>
            </div>
          </div>

          <q-card flat class="sports-panel-card">
            <q-card-section class="q-pa-md">
              <div v-if="recentEvents.length" class="activity-list">
                <RouterLink
                  v-for="(event, index) in recentEvents"
                  :key="`${event.match._id}-${event.type}-${event.minute}-${index}`"
                  :to="{ name: 'match-detail', params: { id: event.match._id } }"
                  class="activity-item"
                >
                  <div
                    class="activity-icon-pill"
                    :class="{
                      'activity-icon-pill--goal': event.type === 'GOAL',
                      'activity-icon-pill--yellow': event.type === 'YELLOW_CARD',
                      'activity-icon-pill--red': event.type === 'RED_CARD',
                      'activity-icon-pill--assist': event.type === 'ASSIST',
                    }"
                  >
                    <span>{{ event.type === 'GOAL' ? '⚽' : event.type === 'RED_CARD' ? '🟥' : event.type === 'YELLOW_CARD' ? '🟨' : '👟' }}</span>
                  </div>

                  <div class="col min-width-0">
                    <div class="activity-headline">
                      <span class="activity-player">{{ event.playerLabel }}</span>
                      <span class="activity-type-label">{{ event.typeLabel }}</span>
                      <span class="activity-minute">minuto {{ event.minute }}'</span>
                    </div>
                    <div class="activity-sub">
                      {{ event.teamLabel }} · {{ event.match.homeTeam?.name }} vs {{ event.match.awayTeam?.name }}
                    </div>
                  </div>

                  <q-icon name="chevron_right" color="grey-6" size="20px" />
                </RouterLink>
              </div>

              <div v-else class="text-caption text-grey-5 text-center q-pa-md">
                No hay incidencias registradas recientemente.
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- RIGHT COLUMN: SIDEBAR WIDGETS (LÍDERES + GOLEADORES + QUICK ACTIONS) -->
      <div class="col-12 col-lg-4">
        <!-- WIDGET 1: LÍDERES DEL TORNEO -->
        <div class="q-mb-xl">
          <div class="section-title-bar q-mb-md">
            <div class="row items-center gap-sm">
              <q-icon name="emoji_events" color="accent" size="20px" />
              <h2 class="section-heading">LÍDERES DEL TORNEO</h2>
            </div>
            <RouterLink to="/tabla" class="text-caption text-primary text-weight-bold" style="text-decoration: none;">
              Ver tabla
            </RouterLink>
          </div>

          <q-card flat class="sports-panel-card">
            <div class="leaders-mini-table">
              <div
                v-for="team in topLeaders"
                :key="team.name"
                class="leader-row"
              >
                <!-- Rank -->
                <div
                  class="leader-rank"
                  :class="{
                    'leader-rank--1': team.position === 1,
                    'leader-rank--2': team.position === 2,
                    'leader-rank--3': team.position === 3,
                  }"
                >
                  {{ team.position }}
                </div>

                <!-- Crest -->
                <div class="sport-crest-container leader-crest">
                  <ImagePreview
                    :src="team.logoUrl"
                    fallback="/images/default-team.svg"
                    :alt="team.name"
                    width="28px"
                    height="28px"
                  />
                </div>

                <!-- Name -->
                <div class="leader-name col">
                  {{ team.name }}
                </div>

                <!-- DG -->
                <div class="leader-dg" :class="{ 'text-positive': team.goalDifference > 0, 'text-negative': team.goalDifference < 0 }">
                  {{ team.goalDifference > 0 ? '+' : '' }}{{ team.goalDifference }}
                </div>

                <!-- Pts -->
                <div class="leader-pts">
                  {{ team.points }} <span class="leader-pts-label">PTS</span>
                </div>
              </div>
            </div>
          </q-card>
        </div>

        <!-- WIDGET 2: MÁXIMOS GOLEADORES -->
        <div class="q-mb-xl">
          <div class="section-title-bar q-mb-md">
            <div class="row items-center gap-sm">
              <q-icon name="sports_soccer" color="primary" size="20px" />
              <h2 class="section-heading">MÁXIMOS GOLEADORES</h2>
            </div>
            <RouterLink to="/goleadores" class="text-caption text-primary text-weight-bold" style="text-decoration: none;">
              Ver todos
            </RouterLink>
          </div>

          <q-card flat class="sports-panel-card">
            <div v-if="topScorersList.length" class="scorers-mini-list">
              <div
                v-for="(scorer, idx) in topScorersList"
                :key="scorer.playerId || scorer.player"
                class="scorer-mini-item"
              >
                <div
                  class="scorer-rank-badge"
                  :class="{ 'scorer-rank-badge--1': idx === 0 }"
                >
                  {{ idx + 1 }}
                </div>

                <div class="scorer-avatar-box">
                  {{ scorer.player?.charAt(0)?.toUpperCase() || 'J' }}
                </div>

                <div class="col min-width-0">
                  <div class="scorer-name">{{ scorer.player }}</div>
                  <div class="scorer-team">{{ scorer.team }}</div>
                </div>

                <div class="scorer-goals-pill">
                  <strong>{{ scorer.goals }}</strong> <span>GOLES</span>
                </div>
              </div>
            </div>

            <div v-else class="text-caption text-grey-5 text-center q-pa-lg">
              No hay goleadores registrados aún.
            </div>
          </q-card>
        </div>

        <!-- WIDGET 3: ACCESOS RÁPIDOS -->
        <div class="q-mb-lg">
          <div class="section-title-bar q-mb-md">
            <h2 class="section-heading">ACCESOS RÁPIDOS</h2>
          </div>

          <div class="column q-gutter-sm">
            <q-btn
              unelevated
              to="/partidos"
              class="quick-action-btn"
              icon="event"
              label="Fixture y Jornadas"
            />
            <q-btn
              unelevated
              to="/equipos"
              class="quick-action-btn"
              icon="groups"
              label="Gestión de Equipos"
            />
            <q-btn
              unelevated
              to="/jugadores"
              class="quick-action-btn"
              icon="sports_soccer"
              label="Plantilla de Jugadores"
            />
            <q-btn
              unelevated
              to="/tabla"
              class="quick-action-btn"
              icon="table_chart"
              label="Tabla de Posiciones"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-heading {
  font-size: 0.84rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #ffffff;
  margin: 0;
}

.badge-live-count {
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #ef4444;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 9999px;
  letter-spacing: 0.04em;
}

/* Tabs toggle for matches */
.match-toggle-tabs {
  display: inline-flex;
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 3px;
  gap: 3px;
}

.match-toggle-btn {
  background: transparent;
  border: none;
  color: var(--tb-muted);
  font-size: 0.74rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: var(--tb-radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.match-toggle-btn:hover {
  color: #ffffff;
}

.match-toggle-btn--active {
  background: var(--tb-surface);
  color: var(--tb-primary);
  border: 1px solid var(--tb-border);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.empty-state-card {
  background: var(--tb-surface);
  border: 1px dashed var(--tb-border);
  border-radius: var(--tb-radius-md);
}

/* Panels */
.sports-panel-card {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-md) !important;
  overflow: hidden;
}

/* Leaders mini table */
.leaders-mini-table {
  display: flex;
  flex-direction: column;
}

.leader-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--tb-border);
  transition: background 0.15s ease;
}

.leader-row:last-child {
  border-bottom: none;
}

.leader-row:hover {
  background: var(--tb-surface-hover);
}

.leader-rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 900;
  background: var(--tb-surface-raised);
  color: var(--tb-muted);
}

.leader-rank--1 {
  background: #eab308;
  color: #0b111e;
  box-shadow: 0 0 8px rgba(234, 179, 8, 0.4);
}

.leader-rank--2 {
  background: #cbd5e1;
  color: #0b111e;
}

.leader-rank--3 {
  background: #d97706;
  color: #ffffff;
}

.leader-crest {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}

.leader-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.leader-dg {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--tb-muted);
  min-width: 32px;
  text-align: right;
}

.leader-pts {
  font-size: 0.95rem;
  font-weight: 900;
  color: #eab308;
  min-width: 45px;
  text-align: right;
}

.leader-pts-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--tb-muted);
}

/* Scorers Mini List */
.scorers-mini-list {
  display: flex;
  flex-direction: column;
}

.scorer-mini-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--tb-border);
  transition: background 0.15s ease;
}

.scorer-mini-item:last-child {
  border-bottom: none;
}

.scorer-mini-item:hover {
  background: var(--tb-surface-hover);
}

.scorer-rank-badge {
  font-size: 0.75rem;
  font-weight: 900;
  color: var(--tb-muted);
  width: 20px;
  text-align: center;
}

.scorer-rank-badge--1 {
  color: #eab308;
}

.scorer-avatar-box {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: #ffffff;
  font-size: 0.85rem;
}

.scorer-name {
  font-size: 0.86rem;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scorer-team {
  font-size: 0.7rem;
  color: var(--tb-muted);
}

.scorer-goals-pill {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  padding: 4px 10px;
  border-radius: var(--tb-radius-full);
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.scorer-goals-pill strong {
  font-size: 0.95rem;
  font-weight: 900;
  color: #10b981;
}

.scorer-goals-pill span {
  font-size: 0.6rem;
  font-weight: 800;
  color: #10b981;
  letter-spacing: 0.04em;
}

/* Activity Items */
.activity-list {
  display: flex;
  flex-direction: column;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-sm);
  transition: background 0.15s ease;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-item:hover {
  background: var(--tb-surface-hover);
}

.activity-icon-pill {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
}

.activity-icon-pill--goal {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.35);
}

.activity-icon-pill--yellow {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.35);
}

.activity-icon-pill--red {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
}

.activity-headline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.activity-player {
  font-size: 0.86rem;
  font-weight: 700;
  color: #ffffff;
}

.activity-type-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--tb-primary);
  text-transform: uppercase;
}

.activity-minute {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--tb-muted);
}

.activity-sub {
  font-size: 0.74rem;
  color: var(--tb-muted);
  margin-top: 2px;
}

/* Quick Action Buttons */
.quick-action-btn {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  font-size: 0.85rem !important;
  padding: 12px 16px !important;
  justify-content: flex-start !important;
  transition: all 0.2s ease !important;
}

.quick-action-btn:hover {
  background: var(--tb-surface-raised) !important;
  border-color: var(--tb-primary) !important;
  color: var(--tb-primary) !important;
  transform: translateX(4px);
}
</style>
