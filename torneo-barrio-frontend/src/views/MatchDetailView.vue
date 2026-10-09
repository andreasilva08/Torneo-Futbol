<script setup>
import { computed, reactive, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { getApiErrorMessage, useTournamentStore } from '@/stores/tournament'
import {
  eventTypeLabel,
  formatMatchDate,
  getId,
  matchStatusColor,
  matchStatusLabel,
  normalizeMatchStatus,
} from '@/utils/matchFormatting'
import ImagePreview from '@/components/ImagePreview.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const store = useTournamentStore()
const goalForm = reactive({ team: '', player: '', assistPlayer: '', minute: 1, isOwnGoal: false })
const eventForm = reactive({ type: 'ASSIST', team: '', player: '', minute: 1 })
const goalSaving = reactive({ value: false })
const eventSaving = reactive({ value: false })

const match = computed(() => store.matchDetail)
const isFinished = computed(() => normalizeMatchStatus(match.value?.status) === 'FINISHED')
const isLive = computed(() => normalizeMatchStatus(match.value?.status) === 'IN_PROGRESS')
const participantTeams = computed(() => [match.value?.homeTeam, match.value?.awayTeam].filter(Boolean))

const teamOptions = computed(() => participantTeams.value.map((team) => ({
  label: team.name || store.teams.find((item) => item._id === getId(team))?.name || 'Equipo',
  value: getId(team),
})))

const formatPlayerOption = (player) => {
  const num = player.number ?? player.dorsal ?? '?'
  const name = player.name || player.nombre || 'Jugador'
  return `#${num} ${name}`
}

// Helper que compara al jugador contra el equipo seleccionado (por ID o por Nombre)
const isPlayerInTeam = (player, selectedTeamId) => {
  if (!selectedTeamId) return false

  const targetId = String(selectedTeamId)
  
  // Buscar el nombre del equipo seleccionado en el store o en los equipos del partido
  const targetTeamObj = store.teams.find((t) => String(t._id) === targetId) ||
                        participantTeams.value.find((t) => String(getId(t)) === targetId)
  
  const targetName = targetTeamObj 
    ? String(targetTeamObj.name || targetTeamObj.nombre || '').toLowerCase().trim() 
    : ''

  // Extraer el equipo guardado en el registro del jugador
  const rawTeam = player.team || player.equipo
  let pTeamId = ''
  let pTeamName = ''

  if (rawTeam && typeof rawTeam === 'object') {
    pTeamId = String(rawTeam._id || rawTeam.id || '')
    pTeamName = String(rawTeam.name || rawTeam.nombre || '').toLowerCase().trim()
  } else if (rawTeam) {
    pTeamId = String(rawTeam)
    pTeamName = String(rawTeam).toLowerCase().trim()
  }

  // Retorna verdadero si coincide por ID o si coincide por Nombre
  return (
    (targetId && pTeamId === targetId) ||
    (targetName && pTeamName === targetName)
  )
}

const goalPlayerOptions = computed(() => store.players
  .filter((player) => isPlayerInTeam(player, goalForm.team))
  .map((player) => ({ label: formatPlayerOption(player), value: player._id })))

const assistPlayerOptions = computed(() => store.players
  .filter((player) => isPlayerInTeam(player, goalForm.team) && String(player._id) !== String(goalForm.player))
  .map((player) => ({ label: formatPlayerOption(player), value: player._id })))

const eventPlayerOptions = computed(() => store.players
  .filter((player) => isPlayerInTeam(player, eventForm.team))
  .map((player) => ({ label: formatPlayerOption(player), value: player._id })))

const playerName = (value) => {
  if (value && typeof value === 'object') {
    return value.name || value.nombre || 'Jugador'
  }
  const found = store.players.find((player) => player._id === getId(value))
  return found?.name || found?.nombre || 'Jugador'
}

const teamName = (value) => {
  if (value && typeof value === 'object' && value.name) {
    return value.name
  }
  return store.teams.find((team) => team._id === getId(value))?.name || 'Equipo'
}

const timeline = computed(() => {
  if (!match.value) {
    return []
  }

  const homeId = getId(match.value.homeTeam)
  const awayId = getId(match.value.awayTeam)

  const buildEvent = (item, type, sourceOrder) => {
    const teamId = getId(item.team)
    const isOwnGoal = type === 'OWN_GOAL' || Boolean(item.isOwnGoal)
    return {
      ...item,
      type: isOwnGoal ? 'OWN_GOAL' : type,
      teamId,
      playerId: getId(item.player),
      playerName: playerName(item.player),
      minute: Number(item.minute) || 0,
      label: isOwnGoal ? 'Autogol (Gol en contra)' : eventTypeLabel(type),
      icon: (type === 'GOAL' || isOwnGoal) ? 'sports_soccer' : type === 'ASSIST' ? 'assistant' : type === 'RED_CARD' ? 'cancel' : type === 'YELLOW_CARD' ? 'warning' : 'style',
      color: isOwnGoal ? 'negative' : type === 'RED_CARD' ? 'negative' : type === 'YELLOW_CARD' ? 'warning' : type === 'GOAL' ? 'positive' : 'info',
      side: teamId === homeId ? 'home' : teamId === awayId ? 'away' : 'neutral',
      sourceOrder,
    }
  }

  const goals = (match.value.goals || []).map((goal, index) => buildEvent(goal, goal.isOwnGoal ? 'OWN_GOAL' : 'GOAL', index))
  const events = (match.value.events || [])
    .filter((event) => {
      if (event.type === 'OWN_GOAL') {
        return !(match.value.goals || []).some(
          (g) => g.isOwnGoal && getId(g.player) === getId(event.player) && Number(g.minute) === Number(event.minute)
        )
      }
      return true
    })
    .map((event, index) => buildEvent(event, event.type, goals.length + index))

  return [...goals, ...events]
    .sort((first, second) => Number(first.minute) - Number(second.minute) || Number(first.sourceOrder) - Number(second.sourceOrder))
})

const loadMatch = async (matchId) => {
  await Promise.all([store.fetchMatch(matchId), store.fetchTeams(), store.fetchPlayers()])
}

watch(() => route.params.id, (matchId) => {
  if (matchId) {
    loadMatch(matchId)
  }
}, { immediate: true })

watch(() => goalForm.team, () => {
  goalForm.player = ''
  goalForm.assistPlayer = ''
})

watch(() => goalForm.player, () => {
  if (goalForm.player && goalForm.assistPlayer === goalForm.player) {
    goalForm.assistPlayer = ''
  }
})

watch(() => eventForm.team, () => {
  eventForm.player = ''
})

const apiGoals = () => (match.value?.goals || []).map((goal) => ({
  player: getId(goal.player),
  team: getId(goal.team),
  minute: Number(goal.minute),
  ...(goal.assistPlayer ? { assistPlayer: getId(goal.assistPlayer) } : {}),
}))

const scoreFor = (teamId, goals) => goals.filter((goal) => goal.team === teamId).length

const registerGoal = async () => {
  if (!match.value || isFinished.value) return

  goalSaving.value = true
  try {
    const homeTeamId = getId(match.value.homeTeam)
    const awayTeamId = getId(match.value.awayTeam)

    const isOwnGoal = Boolean(goalForm.isOwnGoal)
    // En autogol, el equipo que comete el error es goalForm.team,
    // y el gol suma al marcador del equipo rival
    const scoringTeam = isOwnGoal
      ? (goalForm.team === homeTeamId ? awayTeamId : homeTeamId)
      : goalForm.team

    const newGoal = {
      player: goalForm.player,
      team: scoringTeam,
      minute: Number(goalForm.minute),
      isOwnGoal,
      ...(goalForm.assistPlayer && !isOwnGoal ? { assistPlayer: goalForm.assistPlayer } : {}),
    }

    const goals = [...apiGoals(), newGoal]

    // Si es autogol, registramos también la incidencia disciplinaria OWN_GOAL
    if (isOwnGoal) {
      const existingEvents = (match.value.events || []).map((event) => ({
        type: event.type,
        player: getId(event.player),
        team: getId(event.team),
        minute: Number(event.minute),
      }))
      const newEvent = {
        type: 'OWN_GOAL',
        player: goalForm.player,
        team: goalForm.team,
        minute: Number(goalForm.minute),
      }
      await store.updateMatchEvents(match.value._id, [...existingEvents, newEvent])
    }

    await store.updateMatchResult(match.value._id, {
      homeScore: scoreFor(homeTeamId, goals),
      awayScore: scoreFor(awayTeamId, goals),
      status: 'IN_PROGRESS',
      goals,
    })

    $q.notify({
      type: 'positive',
      message: isOwnGoal
        ? 'Autogol registrado: el tanto subió al marcador del equipo rival.'
        : 'Gol registrado y marcador actualizado en vivo.',
    })
    Object.assign(goalForm, { team: '', player: '', assistPlayer: '', minute: 1, isOwnGoal: false })
  } catch (error) {
    $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
  } finally {
    goalSaving.value = false
  }
}

const registerEvent = async () => {
  if (!match.value || isFinished.value) return

  eventSaving.value = true
  try {
    const homeTeamId = getId(match.value.homeTeam)
    const awayTeamId = getId(match.value.awayTeam)

    const existingEvents = (match.value.events || []).map((event) => ({
      type: event.type,
      player: getId(event.player),
      team: getId(event.team),
      minute: Number(event.minute),
    }))
    const events = [...existingEvents, {
      type: eventForm.type,
      player: eventForm.player,
      team: eventForm.team,
      minute: Number(eventForm.minute),
    }]
    await store.updateMatchEvents(match.value._id, events)

    // Si la incidencia es un autogol, también sumamos el gol al marcador rival
    if (eventForm.type === 'OWN_GOAL') {
      const scoringTeam = eventForm.team === homeTeamId ? awayTeamId : homeTeamId
      const goals = [...apiGoals(), {
        player: eventForm.player,
        team: scoringTeam,
        minute: Number(eventForm.minute),
        isOwnGoal: true,
      }]
      await store.updateMatchResult(match.value._id, {
        homeScore: scoreFor(homeTeamId, goals),
        awayScore: scoreFor(awayTeamId, goals),
        status: 'IN_PROGRESS',
        goals,
      })
      $q.notify({
        type: 'positive',
        message: 'Autogol registrado: sumado al marcador del equipo rival.',
      })
    } else {
      $q.notify({
        type: 'positive',
        message: `${eventTypeLabel(events.at(-1).type)} registrado correctamente.`,
      })
    }

    Object.assign(eventForm, { type: 'ASSIST', team: '', player: '', minute: 1 })
  } catch (error) {
    $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
  } finally {
    eventSaving.value = false
  }
}

const finishMatch = () => {
  $q.dialog({
    title: 'Finalizar Encuentro',
    message: '¿Confirmas la finalización del partido? El resultado quedará registrado como definitivo.',
    cancel: true,
    persistent: true,
    ok: {
      label: 'Sí, Finalizar',
      color: 'negative',
    },
    cancel: {
      label: 'Cancelar',
      color: 'grey-5',
      flat: true,
    },
  }).onOk(async () => {
    try {
      const goals = apiGoals()
      await store.updateMatchResult(match.value._id, {
        homeScore: scoreFor(getId(match.value.homeTeam), goals),
        awayScore: scoreFor(getId(match.value.awayTeam), goals),
        status: 'FINISHED',
        goals,
      })
      $q.notify({ type: 'positive', message: 'Partido finalizado con éxito.' })
    } catch (error) {
      $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
    }
  })
}
</script>

<template>
  <div class="match-detail-page">
    <!-- PAGE HEADER -->
    <div class="sport-page-header">
      <div class="sport-page-header__left">
        <q-btn flat round icon="arrow_back" color="grey-4" @click="router.push('/partidos')" class="q-mr-xs" />
        <div class="sport-page-header__icon-box">
          <q-icon name="sports" />
        </div>
        <div>
          <div class="sport-page-header__eyebrow">DETALLE DEL PARTIDO OFICIAL</div>
          <h1 class="sport-page-header__title">
            {{ match ? `${teamName(match.homeTeam)} vs ${teamName(match.awayTeam)}` : 'Partido' }}
          </h1>
        </div>
      </div>
    </div>

    <!-- ERROR BANNER -->
    <q-banner v-if="store.matchError" rounded class="bg-negative text-white q-mb-md">
      {{ store.matchError }}
    </q-banner>

    <!-- LOADING SKELETON -->
    <div v-else-if="store.matchLoading && !match" class="q-gutter-md">
      <q-skeleton type="rect" height="200px" />
      <q-skeleton type="rect" height="300px" />
    </div>

    <template v-else-if="match">
      <!-- BIG SPORTS MATCH SUMMARY BANNER -->
      <q-card flat class="sports-match-banner q-mb-xl">
        <q-card-section class="q-pa-lg">
          <!-- CONTEXT INFO -->
          <div class="row items-center justify-between q-mb-md">
            <div class="row items-center gap-sm">
              <span class="matchday-tag">JORNADA {{ match.matchday }}</span>
              <span class="text-caption text-grey-5">{{ match.homeTeam?.stadium || 'Cancha Local' }}</span>
            </div>

            <div v-if="isLive" class="status-live-badge">
              <span class="live-dot-pulse"></span>
              <span>🔴 EN VIVO</span>
            </div>
            <div v-else-if="isFinished" class="status-finished-badge">
              <q-icon name="check_circle" size="14px" class="q-mr-xs" />
              <span>FINALIZADO</span>
            </div>
            <div v-else class="status-scheduled-badge">
              <q-icon name="schedule" size="14px" class="q-mr-xs" />
              <span>PROGRAMADO</span>
            </div>
          </div>

          <!-- 3-COLUMNS MATCH SCORE DISPLAY -->
          <div class="match-banner-grid">
            <!-- LOCAL TEAM -->
            <div class="banner-team banner-team--home">
              <div class="sport-crest-container banner-crest-box">
                <ImagePreview
                  :src="match.homeTeam?.logoUrl"
                  fallback="/images/default-team.svg"
                  :alt="`Escudo de ${teamName(match.homeTeam)}`"
                  width="72px"
                  height="72px"
                />
              </div>
              <div class="banner-team-name">{{ teamName(match.homeTeam) }}</div>
              <div class="banner-team-role">LOCAL</div>
            </div>

            <!-- SCORE CENTER -->
            <div class="banner-score-box">
              <div v-if="normalizeMatchStatus(match.status) === 'SCHEDULED'" class="banner-vs-label">
                VS
              </div>
              <div v-else class="banner-digits">
                <span>{{ match.homeScore ?? 0 }}</span>
                <span class="banner-digits-dash">-</span>
                <span>{{ match.awayScore ?? 0 }}</span>
              </div>
              <div class="banner-date-text">
                {{ formatMatchDate(match.date) }}
              </div>
            </div>

            <!-- AWAY TEAM -->
            <div class="banner-team banner-team--away">
              <div class="sport-crest-container banner-crest-box">
                <ImagePreview
                  :src="match.awayTeam?.logoUrl"
                  fallback="/images/default-team.svg"
                  :alt="`Escudo de ${teamName(match.awayTeam)}`"
                  width="72px"
                  height="72px"
                />
              </div>
              <div class="banner-team-name">{{ teamName(match.awayTeam) }}</div>
              <div class="banner-team-role">VISITANTE</div>
            </div>
          </div>

          <!-- FINISH BUTTON IF NOT FINISHED -->
          <div v-if="!isFinished" class="row justify-end q-mt-md">
            <q-btn
              unelevated
              color="negative"
              outline
              icon="flag"
              label="Finalizar Partido"
              @click="finishMatch"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- REGISTRATION FORMS (GOAL & EVENT) IF NOT FINISHED -->
      <div v-if="!isFinished" class="row q-col-gutter-lg q-mb-xl">
        <!-- FORM 1: GOAL REGISTRATION -->
        <div class="col-12 col-lg-6">
          <q-card flat class="sports-panel-card full-height">
            <q-card-section class="q-pa-lg">
              <div class="row items-center gap-sm q-mb-xs">
                <q-icon name="sports_soccer" color="primary" size="20px" />
                <div class="text-subtitle1 text-weight-bold text-white">Registrar Gol</div>
              </div>
              <div class="text-caption text-grey-5 q-mb-md">El marcador se actualiza automáticamente con cada gol validado.</div>

              <q-form class="q-gutter-y-md" @submit.prevent="registerGoal">
                <!-- TOGGLE AUTOGOL -->
                <div class="row items-center justify-between q-pa-sm rounded-borders" style="background: rgba(239, 68, 68, 0.08); border: 1px dashed rgba(239, 68, 68, 0.35);">
                  <div class="row items-center gap-xs">
                    <q-icon name="sports_soccer" :color="goalForm.isOwnGoal ? 'negative' : 'grey-5'" size="20px" />
                    <div>
                      <div class="text-caption text-weight-bold" :class="goalForm.isOwnGoal ? 'text-negative' : 'text-white'">
                        {{ goalForm.isOwnGoal ? '⚽ Marcando Autogol (Gol en contra)' : '¿Es Gol en propia puerta (Autogol)?' }}
                      </div>
                      <div class="text-caption text-grey-5" style="font-size: 0.72rem;">
                        {{ goalForm.isOwnGoal ? 'El gol se sumará automáticamente al equipo rival.' : 'Activa si el jugador anotó en su propia portería.' }}
                      </div>
                    </div>
                  </div>
                  <q-toggle v-model="goalForm.isOwnGoal" color="negative" dense />
                </div>

                <q-select
                  v-model="goalForm.team"
                  :options="teamOptions"
                  emit-value
                  map-options
                  :label="goalForm.isOwnGoal ? 'Equipo que cometió el autogol *' : 'Equipo que anota *'"
                  outlined
                  stack-label
                  required
                />
                <q-select
                  v-model="goalForm.player"
                  :options="goalPlayerOptions"
                  emit-value
                  map-options
                  :label="goalForm.isOwnGoal ? 'Jugador que anotó en contra *' : 'Goleador (Anotador) *'"
                  outlined
                  stack-label
                  required
                  :disable="!goalForm.team"
                />
                <q-select
                  v-if="!goalForm.isOwnGoal"
                  v-model="goalForm.assistPlayer"
                  :options="assistPlayerOptions"
                  emit-value
                  map-options
                  label="Asistencia / Pase de Gol (Opcional)"
                  outlined
                  stack-label
                  clearable
                  :disable="!goalForm.team"
                />
                <q-input
                  v-model.number="goalForm.minute"
                  type="number"
                  min="0"
                  max="120"
                  label="Minuto del Gol"
                  outlined
                  stack-label
                  required
                />
                <q-btn
                  type="submit"
                  :color="goalForm.isOwnGoal ? 'negative' : 'primary'"
                  icon="sports_soccer"
                  :label="goalForm.isOwnGoal ? 'Guardar Autogol' : 'Guardar Gol'"
                  class="full-width q-py-sm"
                  :loading="goalSaving.value"
                  :disable="!goalForm.team || !goalForm.player"
                />
              </q-form>
            </q-card-section>
          </q-card>
        </div>

        <!-- FORM 2: EVENT (ASSIST / CARDS) REGISTRATION -->
        <div class="col-12 col-lg-6">
          <q-card flat class="sports-panel-card full-height">
            <q-card-section class="q-pa-lg">
              <div class="row items-center gap-sm q-mb-xs">
                <q-icon name="style" color="secondary" size="20px" />
                <div class="text-subtitle1 text-weight-bold text-white">Registrar Incidencia / Tarjeta</div>
              </div>
              <div class="text-caption text-grey-5 q-mb-md">Control disciplinario y asistencias del encuentro.</div>

              <q-form class="q-gutter-y-md" @submit.prevent="registerEvent">
                <q-select
                  v-model="eventForm.type"
                  :options="[
                    { label: 'Asistencia de gol 👟', value: 'ASSIST' },
                    { label: 'Tarjeta amarilla 🟨', value: 'YELLOW_CARD' },
                    { label: 'Tarjeta roja 🟥', value: 'RED_CARD' },
                  ]"
                  emit-value
                  map-options
                  label="Tipo de Incidencia"
                  outlined
                  stack-label
                />
                <q-select
                  v-model="eventForm.team"
                  :options="teamOptions"
                  emit-value
                  map-options
                  label="Equipo involucrado"
                  outlined
                  stack-label
                  required
                />
                <q-select
                  v-model="eventForm.player"
                  :options="eventPlayerOptions"
                  emit-value
                  map-options
                  label="Jugador involucrado"
                  outlined
                  stack-label
                  required
                  :disable="!eventForm.team"
                />
                <q-input
                  v-model.number="eventForm.minute"
                  type="number"
                  min="0"
                  max="120"
                  label="Minuto del Suceso"
                  outlined
                  stack-label
                  required
                />
                <q-btn
                  type="submit"
                  color="secondary"
                  icon="add_task"
                  label="Guardar Incidencia"
                  class="full-width q-py-sm"
                  :loading="eventSaving.value"
                  :disable="!eventForm.team || !eventForm.player"
                />
              </q-form>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- MATCH TIMELINE / CRONOLOGÍA -->
      <q-card flat class="sports-panel-card q-mb-xl">
        <q-card-section class="q-pa-lg">
          <div class="row items-center gap-sm q-mb-md">
            <q-icon name="history" color="primary" size="22px" />
            <div class="text-subtitle1 text-weight-bold text-white">Cronología del Encuentro</div>
          </div>

          <div v-if="timeline.length" class="sports-timeline">
            <!-- TIMELINE HEADER -->
            <div class="sports-timeline__header">
              <div class="timeline-team-head text-left">{{ teamName(match.homeTeam) }} (LOCAL)</div>
              <div class="timeline-min-head">MIN</div>
              <div class="timeline-team-head text-right">{{ teamName(match.awayTeam) }} (VISITANTE)</div>
            </div>

            <!-- TIMELINE ROWS -->
            <div
              v-for="event in timeline"
              :key="`${event.type}-${event.playerId}-${event.minute}-${event.teamId}-${event.sourceOrder}`"
              class="sports-timeline__row"
            >
              <!-- LEFT SIDE (HOME) -->
              <div class="timeline-side timeline-side--left">
                <div v-if="event.side === 'home'" class="timeline-event-card timeline-event-card--home">
                  <div class="timeline-icon-pill" :class="`timeline-icon-pill--${event.type.toLowerCase()}`">
                    <q-icon :name="event.icon" :color="event.color" size="16px" />
                  </div>
                  <div class="timeline-event-details text-left">
                    <div class="row items-center gap-xs">
                      <span class="timeline-event-title" :class="{ 'text-negative': event.type === 'OWN_GOAL' }">
                        {{ event.label }}
                      </span>
                      <q-badge v-if="event.type === 'OWN_GOAL'" color="negative" class="text-weight-bolder q-px-xs">
                        ⚽ (AG)
                      </q-badge>
                    </div>
                    <span class="timeline-event-player">{{ event.playerName }}</span>
                  </div>
                </div>
              </div>

              <!-- CENTER MINUTE PILL -->
              <div class="timeline-center-minute">
                <span>{{ event.minute }}'</span>
              </div>

              <!-- RIGHT SIDE (AWAY) -->
              <div class="timeline-side timeline-side--right">
                <div v-if="event.side === 'away'" class="timeline-event-card timeline-event-card--away">
                  <div class="timeline-event-details text-right">
                    <div class="row items-center justify-end gap-xs">
                      <q-badge v-if="event.type === 'OWN_GOAL'" color="negative" class="text-weight-bolder q-px-xs">
                        ⚽ (AG)
                      </q-badge>
                      <span class="timeline-event-title" :class="{ 'text-negative': event.type === 'OWN_GOAL' }">
                        {{ event.label }}
                      </span>
                    </div>
                    <span class="timeline-event-player">{{ event.playerName }}</span>
                  </div>
                  <div class="timeline-icon-pill" :class="`timeline-icon-pill--${event.type.toLowerCase()}`">
                    <q-icon :name="event.icon" :color="event.color" size="16px" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-caption text-grey-5 text-center q-pa-lg">
            Todavía no hay goles ni incidencias registradas en este partido.
          </div>
        </q-card-section>
      </q-card>
    </template>
  </div>
</template>

<style scoped>
.match-detail-page {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.sports-match-banner {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-lg) !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4) !important;
}

.matchday-tag {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #10b981;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 4px;
  letter-spacing: 0.06em;
}

.match-banner-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
  padding: 16px 0;
}

.banner-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.banner-crest-box {
  width: 82px;
  height: 82px;
  border: 2px solid var(--tb-border);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  margin-bottom: 10px;
}

.banner-team-name {
  font-size: 1.25rem;
  font-weight: 800;
  color: #ffffff;
  max-width: 200px;
}

.banner-team-role {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--tb-muted);
  margin-top: 2px;
}

.banner-score-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 160px;
}

.banner-vs-label {
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--tb-primary);
  background: var(--tb-bg);
  border: 1px solid var(--tb-border);
  padding: 10px 24px;
  border-radius: var(--tb-radius-md);
}

.banner-digits {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  background: var(--tb-bg);
  border: 1px solid var(--tb-border);
  padding: 12px 28px;
  border-radius: var(--tb-radius-md);
  font-size: 3rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
}

.banner-digits-dash {
  color: var(--tb-muted);
  font-size: 1.8rem;
}

.banner-date-text {
  font-size: 0.76rem;
  color: var(--tb-muted);
  font-weight: 600;
  margin-top: 10px;
}

.sports-panel-card {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-md) !important;
}

/* Timeline */
.sports-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sports-timeline__header {
  display: grid;
  grid-template-columns: 1fr 64px 1fr;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--tb-border);
}

.timeline-team-head {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--tb-muted);
  text-transform: uppercase;
}

.timeline-min-head {
  text-align: center;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--tb-primary);
}

.sports-timeline__row {
  display: grid;
  grid-template-columns: 1fr 64px 1fr;
  align-items: center;
  gap: 10px;
}

.timeline-side {
  display: flex;
  align-items: center;
  width: 100%;
}

.timeline-side--left {
  justify-content: flex-end;
}

.timeline-side--right {
  justify-content: flex-start;
}

.timeline-event-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 8px 14px;
  max-width: 320px;
  width: 100%;
}

.timeline-icon-pill {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--tb-surface);
  border: 1px solid var(--tb-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.timeline-event-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.timeline-event-title {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--tb-primary);
  text-transform: uppercase;
}

.timeline-event-player {
  font-size: 0.84rem;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-center-minute {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tb-bg);
  border: 1px solid var(--tb-border);
  border-radius: 9999px;
  height: 28px;
  font-size: 0.72rem;
  font-weight: 900;
  color: var(--tb-primary);
}

@media (max-width: 600px) {
  .match-banner-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
