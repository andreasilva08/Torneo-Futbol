<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import {
  formatMatchDate,
  getId,
  matchStatusColor,
  matchStatusLabel,
  normalizeMatchStatus,
} from '@/utils/matchFormatting'
import ImagePreview from '@/components/ImagePreview.vue'
import { useTournamentStore } from '@/stores/tournament'

const props = defineProps({
  match: {
    type: Object,
    required: true,
  },
})

const store = useTournamentStore()
const $q = useQuasar()

const startMatchCard = () => {
  if (!canStartMatch.value) {
    $q.notify({ type: 'warning', message: startMatchBlockReason.value })
    return
  }
  $q.dialog({
    title: 'Iniciar Partido (Poner EN VIVO)',
    message: `¿Deseas iniciar el encuentro entre ${props.match.homeTeam?.name || 'Local'} vs ${props.match.awayTeam?.name || 'Visitante'}? Pasará a EN VIVO con Bandera Verde.`,
    cancel: { label: 'Cancelar', color: 'grey-5', flat: true },
    ok: { label: '🏁 Iniciar (EN VIVO)', color: 'positive' },
    persistent: true,
  }).onOk(async () => {
    try {
      await store.updateMatchResult(props.match._id, {
        status: 'IN_PROGRESS',
      })
      $q.notify({
        type: 'positive',
        message: 'Partido iniciado: oficialmente EN VIVO 🟢 🏁',
        icon: 'flag',
      })
    } catch (error) {
      $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No se pudo iniciar el partido.' })
    }
  })
}

const finishMatchCard = () => {
  $q.dialog({
    title: 'Finalizar Encuentro (Bandera Roja)',
    message: `¿Confirmas finalizar el encuentro entre ${props.match.homeTeam?.name || 'Local'} vs ${props.match.awayTeam?.name || 'Visitante'} con marcador ${props.match.homeScore ?? 0} - ${props.match.awayScore ?? 0}?`,
    cancel: { label: 'Cancelar', color: 'grey-5', flat: true },
    ok: { label: '🏁 Sí, Finalizar', color: 'negative' },
    persistent: true,
  }).onOk(async () => {
    try {
      await store.updateMatchResult(props.match._id, {
        status: 'FINISHED',
      })
      $q.notify({
        type: 'positive',
        message: 'Partido finalizado (Bandera Roja) 🔴 🏁',
        icon: 'flag',
      })
    } catch {
      $q.notify({ type: 'negative', message: 'No se pudo finalizar el partido.' })
    }
  })
}

const getPlayerName = (player) => {
  if (!player) return 'Jugador'
  if (typeof player === 'object' && player.name) return player.name
  const id = getId(player)
  return store.players.find((item) => item._id === id)?.name || 'Jugador'
}

const statusNormalized = computed(() => normalizeMatchStatus(props.match.status))
const isLive = computed(() => statusNormalized.value === 'IN_PROGRESS')
const isFinished = computed(() => statusNormalized.value === 'FINISHED')
const isSuspended = computed(() => ['SUSPENDED', 'POSTPONED'].includes(statusNormalized.value))
const isPostponed = computed(() => statusNormalized.value === 'POSTPONED')
const isScheduled = computed(() => statusNormalized.value === 'SCHEDULED')
const isNotStarted = computed(() => isScheduled.value || isSuspended.value)
const hasValidDate = computed(() => Boolean(props.match.date && !Number.isNaN(new Date(props.match.date).getTime())))
const hasUnfinishedPriorMatchday = computed(() => store.matches.some((item) => (
  Number(item.matchday) < Number(props.match.matchday) &&
  normalizeMatchStatus(item.status) !== 'FINISHED'
)))
const canStartMatch = computed(() => isScheduled.value && hasValidDate.value && !hasUnfinishedPriorMatchday.value)
const startMatchBlockReason = computed(() => {
  if (!hasValidDate.value) return 'Asigna una fecha y hora válidas antes de iniciar el partido.'
  if (hasUnfinishedPriorMatchday.value) return 'Completa primero los partidos pendientes de jornadas anteriores.'
  return ''
})
const homeStadium = computed(() => {
  const venues = [
    props.match.stadium,
    props.match.homeTeam?.cancha,
    props.match.homeTeam?.estadio,
    props.match.homeTeam?.stadium,
  ]
    .map((venue) => String(venue || '').trim())
    .filter((venue) => venue && !['cancha local', 'cancha principal'].includes(venue.toLowerCase()))
  return venues[0] || 'Cancha Local'
})

const matchTimeFormatted = computed(() => {
  if (!props.match.date) return ''
  const date = new Date(props.match.date)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(date)
})

const matchGoals = computed(() => {
  const homeId = getId(props.match.homeTeam)
  const awayId = getId(props.match.awayTeam)
  const homeEvents = []
  const awayEvents = []

  // Goles
  for (const goal of props.match.goals || []) {
    const teamId = getId(goal.team)
    const entry = {
      player: getPlayerName(goal.player),
      minute: Number(goal.minute) || 0,
      assist: goal.assistPlayer ? getPlayerName(goal.assistPlayer) : null,
      type: 'GOAL',
    }

    if (teamId === homeId) {
      homeEvents.push(entry)
    } else if (teamId === awayId) {
      awayEvents.push(entry)
    }
  }

  // Tarjetas e incidencias
  for (const event of props.match.events || []) {
    if (!['YELLOW_CARD', 'RED_CARD', 'OWN_GOAL'].includes(event.type)) continue

    const entry = {
      player: getPlayerName(event.player),
      minute: Number(event.minute) || 0,
      type: event.type,
    }
    const teamId = getId(event.team)

    if (teamId === homeId) {
      homeEvents.push(entry)
    } else if (teamId === awayId) {
      awayEvents.push(entry)
    }
  }

  return {
    home: homeEvents.sort((a, b) => a.minute - b.minute),
    away: awayEvents.sort((a, b) => a.minute - b.minute),
  }
})
</script>

<template>
  <router-link :to="{ name: 'match-detail', params: { id: match._id } }" class="match-card-link">
    <q-card flat class="sports-match-card">
      <q-card-section class="sports-match-card__body">
        <!-- CARD HEADER: izquierda=Jornada+Cancha / derecha=solo Estado -->
        <div class="row items-center justify-between no-wrap q-mb-md sports-match-card__header">
          <!-- LEFT: Jornada badge + ubicación -->
          <div class="row items-center no-wrap sports-match-card__context">
            <span v-if="match.matchday" class="matchday-badge q-mr-sm">
              JORNADA {{ match.matchday }}
            </span>
            <div class="stadium-info row items-center no-wrap">
              <q-icon name="place" size="14px" class="q-mr-xs text-grey-5" />
              <span class="stadium-name-text">{{ homeStadium }}</span>
            </div>
          </div>

          <!-- RIGHT: SOLO badge de estado -->
          <div class="flex-shrink-0">
            <div v-if="isLive" class="status-live-badge">
              <span class="live-dot-pulse"></span>
              <span>EN VIVO</span>
            </div>
            <div v-else-if="isFinished" class="status-finished-badge">
              <span>🏁 FINALIZADO</span>
            </div>
            <div v-else-if="isSuspended" class="status-suspended-badge">
              <q-icon name="pause_circle" size="12px" class="q-mr-xs" />
              <span>{{ isPostponed ? 'APLAZADO' : 'SUSPENDIDO' }}</span>
            </div>
            <div v-else class="status-scheduled-badge">
              <q-icon name="schedule" size="12px" class="q-mr-xs" />
              <span>PROGRAMADO</span>
            </div>
          </div>
        </div>

        <!-- CARD CENTER: 3-COLUMN HORIZONTAL MATCH LAYOUT -->
        <div class="sports-match-card__content">
          <!-- LOCAL TEAM -->
          <div class="match-team match-team--home">
            <div class="sport-crest-container match-team__crest-box">
              <ImagePreview
                :src="match.homeTeam?.logoUrl"
                fallback="/images/default-team.svg"
                :alt="`Escudo de ${match.homeTeam?.name || 'Local'}`"
                width="48px"
                height="48px"
                class="match-team__crest"
              />
            </div>
            <div class="match-team__info">
              <span class="match-team__name">{{ match.homeTeam?.name || 'Local' }}</span>
              <span class="match-team__role">LOCAL</span>
            </div>
          </div>

          <!-- CENTER SCORE BOX -->
          <div class="match-center-score">
            <div v-if="isNotStarted" class="score-box-scheduled">
              <div class="score-vs">VS</div>
              <div v-if="matchTimeFormatted" class="score-time">{{ matchTimeFormatted }}</div>
            </div>
            <div v-else class="score-box-active">
              <span class="score-digit">{{ match.homeScore ?? 0 }}</span>
              <span class="score-separator">-</span>
              <span class="score-digit">{{ match.awayScore ?? 0 }}</span>
            </div>

            <div class="match-date-label">
              {{ formatMatchDate(match.date) }}
            </div>
          </div>

          <!-- AWAY TEAM -->
          <div class="match-team match-team--away">
            <div class="sport-crest-container match-team__crest-box">
              <ImagePreview
                :src="match.awayTeam?.logoUrl"
                fallback="/images/default-team.svg"
                :alt="`Escudo de ${match.awayTeam?.name || 'Visitante'}`"
                width="48px"
                height="48px"
                class="match-team__crest"
              />
            </div>
            <div class="match-team__info">
              <span class="match-team__name">{{ match.awayTeam?.name || 'Visitante' }}</span>
              <span class="match-team__role">VISITANTE</span>
            </div>
          </div>
        </div>

        <!-- INCIDENTS / GOALS TIMELINE -->
        <div class="sports-match-card__events" v-if="matchGoals.home.length || matchGoals.away.length">
          <!-- HOME EVENTS -->
          <div class="events-col events-col--home">
            <div
              v-for="item in matchGoals.home"
              :key="`home-${item.player}-${item.minute}`"
              class="event-tag event-tag--home"
            >
              <span class="event-icon">{{ item.type === 'RED_CARD' ? '🟥' : item.type === 'YELLOW_CARD' ? '🟨' : item.type === 'OWN_GOAL' ? '⚽' : '⚽' }}</span>
              <span class="event-desc" :class="{ 'text-negative': item.type === 'OWN_GOAL' }">
                {{ item.minute }}' {{ item.player }}{{ item.type === 'OWN_GOAL' ? ' (AG)' : '' }}
              </span>
            </div>
          </div>

          <!-- AWAY EVENTS -->
          <div class="events-col events-col--away">
            <div
              v-for="item in matchGoals.away"
              :key="`away-${item.player}-${item.minute}`"
              class="event-tag event-tag--away"
            >
              <span class="event-desc" :class="{ 'text-negative': item.type === 'OWN_GOAL' }">
                {{ item.player }}{{ item.type === 'OWN_GOAL' ? ' (AG)' : '' }} {{ item.minute }}'
              </span>
              <span class="event-icon">{{ item.type === 'RED_CARD' ? '🟥' : item.type === 'YELLOW_CARD' ? '🟨' : item.type === 'OWN_GOAL' ? '⚽' : '⚽' }}</span>
            </div>
          </div>
        </div>

        <div v-else class="sports-match-card__empty-events">
          Sin incidencias registradas
        </div>

        <!-- FOOTER: Acciones de estado (Iniciar / Finalizar) -->
        <div
          v-if="isScheduled || isLive"
          class="sports-match-card__footer"
          @click.stop.prevent
        >
          <button
            v-if="isScheduled"
            type="button"
            class="quick-flag-btn quick-flag-btn--start"
            :title="canStartMatch ? 'Iniciar partido (Bandera Verde)' : startMatchBlockReason"
            :disabled="!canStartMatch"
            @click.stop.prevent="startMatchCard"
          >
            <q-icon name="flag" size="14px" class="q-mr-xs" />
            <span>🟢 Iniciar Partido</span>
          </button>
          <button
            v-else-if="isLive"
            type="button"
            class="quick-flag-btn quick-flag-btn--finish"
            title="Finalizar partido (Bandera Roja)"
            @click.stop.prevent="finishMatchCard"
          >
            <q-icon name="flag" size="14px" class="q-mr-xs" />
            <span>🔴 Finalizar Partido</span>
          </button>
        </div>
      </q-card-section>
    </q-card>
  </router-link>
</template>

<style scoped>
.match-card-link {
  display: block;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease;
}

.match-card-link:hover {
  transform: translateY(-2px);
}

.sports-match-card {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-md) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3) !important;
  transition: all 0.2s ease;
  overflow: hidden;
}

.sports-match-card:hover {
  border-color: #3b82f6 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45) !important;
}

.sports-match-card__body {
  padding: 20px 22px 16px;
}

/* Card Header */
.sports-match-card__header {
  gap: 12px;
  flex-wrap: nowrap;
}

.sports-match-card__context {
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.stadium-name-text {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--tb-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.flex-shrink-0 {
  flex-shrink: 0;
}

/* Card Footer: acciones de estado */
.sports-match-card__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 12px;
  margin-top: 10px;
  border-top: 1px solid var(--tb-border);
}

.matchday-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #10b981;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 3px 8px;
  border-radius: 4px;
}

.stadium-info {
  display: inline-flex;
  align-items: center;
  color: var(--tb-muted);
  font-size: 0.74rem;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
}

/* Status Badges with Sports Flags */
.status-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(16, 185, 129, 0.18);
  border: 1px solid rgba(16, 185, 129, 0.45);
  color: #22c55e;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 4px 9px;
  border-radius: var(--tb-radius-full);
  animation: live-pulse 2s infinite ease-in-out;
}

.live-dot-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e;
}

.status-finished-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #ef4444;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 4px 9px;
  border-radius: var(--tb-radius-full);
}

.status-suspended-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(245, 158, 11, 0.16);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fbbf24;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 4px 9px;
  border-radius: var(--tb-radius-full);
}

.status-scheduled-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60a5fa;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 4px 9px;
  border-radius: var(--tb-radius-full);
}

.quick-flag-btn {
  display: inline-flex;
  align-items: center;
  border-radius: var(--tb-radius-full);
  padding: 3px 8px;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--tb-surface-raised);
}

.quick-flag-btn--start {
  border: 1px solid rgba(16, 185, 129, 0.5);
  color: #22c55e;
}

.quick-flag-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.quick-flag-btn--start:hover {
  background: #10b981;
  color: #0b111e;
  border-color: #10b981;
}

.quick-flag-btn--finish {
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #ef4444;
}

.quick-flag-btn--finish:hover {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
}

/* Match Content: 3-column Layout */
.sports-match-card__content {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  padding: 8px 0 14px;
}

.match-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 0;
}

.match-team__crest-box {
  width: 52px;
  height: 52px;
  margin-bottom: 8px;
  border: 2px solid var(--tb-border);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
}

.match-team__crest {
  border-radius: 50%;
}

.match-team__info {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.match-team__name {
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  word-break: break-word;
  max-width: 130px;
}

.match-team__role {
  color: var(--tb-muted);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 3px;
}

/* Center Score Box */
.match-center-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 110px;
}

.score-box-active {
  background: var(--tb-bg);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 8px 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4);
}

.score-digit {
  font-size: 2rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1;
}

.score-separator {
  font-size: 1.2rem;
  color: var(--tb-muted);
  font-weight: 700;
}

.score-box-scheduled {
  background: var(--tb-bg);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-vs {
  font-size: 1.2rem;
  font-weight: 900;
  color: var(--tb-primary);
  letter-spacing: 0.04em;
}

.score-time {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--tb-muted);
  margin-top: 2px;
}

.match-date-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--tb-muted);
  margin-top: 8px;
  text-align: center;
}

/* Incidents Section */
.sports-match-card__events {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--tb-border);
}

.events-col {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.events-col--home {
  align-items: flex-start;
}

.events-col--away {
  align-items: flex-end;
}

.event-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.74rem;
  color: var(--tb-text-secondary);
  font-weight: 600;
}

.event-icon {
  font-size: 0.8rem;
}

.event-desc {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.sports-match-card__empty-events {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--tb-border);
  color: var(--tb-muted);
  font-size: 0.72rem;
  font-weight: 500;
  text-align: center;
}
</style>
