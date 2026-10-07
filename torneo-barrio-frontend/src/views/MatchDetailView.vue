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
const goalForm = reactive({ team: '', player: '', assistPlayer: '', minute: 1 })
const eventForm = reactive({ type: 'ASSIST', team: '', player: '', minute: 1 })
const goalSaving = reactive({ value: false })
const eventSaving = reactive({ value: false })

const match = computed(() => store.matchDetail)
const isFinished = computed(() => normalizeMatchStatus(match.value?.status) === 'FINISHED')
const participantTeams = computed(() => [match.value?.homeTeam, match.value?.awayTeam].filter(Boolean))
const teamOptions = computed(() => participantTeams.value.map((team) => ({
  label: team.name || store.teams.find((item) => item._id === getId(team))?.name || 'Equipo',
  value: getId(team),
})))
const goalPlayerOptions = computed(() => store.players
  .filter((player) => getId(player.team) === goalForm.team)
  .map((player) => ({ label: `#${player.number} ${player.name}`, value: player._id })))
const assistPlayerOptions = computed(() => store.players
  .filter((player) => getId(player.team) === goalForm.team && player._id !== goalForm.player)
  .map((player) => ({ label: `#${player.number} ${player.name}`, value: player._id })))
const eventPlayerOptions = computed(() => store.players
  .filter((player) => getId(player.team) === eventForm.team)
  .map((player) => ({ label: `#${player.number} ${player.name}`, value: player._id })))

const playerName = (value) => {
  if (value && typeof value === 'object' && value.name) {
    return value.name
  }
  return store.players.find((player) => player._id === getId(value))?.name || 'Jugador'
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
    return {
      ...item,
      type,
      teamId,
      playerId: getId(item.player),
      playerName: playerName(item.player),
      minute: Number(item.minute) || 0,
      label: eventTypeLabel(type),
      icon: type === 'GOAL' ? 'sports_soccer' : type === 'ASSIST' ? 'assistant' : type === 'RED_CARD' ? 'cancel' : type === 'YELLOW_CARD' ? 'warning' : 'style',
      color: type === 'RED_CARD' ? 'negative' : type === 'YELLOW_CARD' ? 'warning' : 'primary',
      side: teamId === homeId ? 'home' : teamId === awayId ? 'away' : 'neutral',
      sourceOrder,
    }
  }

  const goals = (match.value.goals || []).map((goal, index) => buildEvent(goal, 'GOAL', index))
  const events = (match.value.events || []).map((event, index) => buildEvent(event, event.type, goals.length + index))

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
  if (!match.value || isFinished.value) {
    return
  }

  goalSaving.value = true
  try {
    const goals = [...apiGoals(), {
      player: goalForm.player,
      team: goalForm.team,
      minute: Number(goalForm.minute),
      ...(goalForm.assistPlayer ? { assistPlayer: goalForm.assistPlayer } : {}),
    }]
    const homeTeamId = getId(match.value.homeTeam)
    const awayTeamId = getId(match.value.awayTeam)
    await store.updateMatchResult(match.value._id, {
      homeScore: scoreFor(homeTeamId, goals),
      awayScore: scoreFor(awayTeamId, goals),
      status: 'IN_PROGRESS',
      goals,
    })
    $q.notify({ type: 'positive', message: 'Gol registrado y marcador actualizado.' })
    Object.assign(goalForm, { team: '', player: '', assistPlayer: '', minute: 1 })
  } catch (error) {
    $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
  } finally {
    goalSaving.value = false
  }
}

const registerEvent = async () => {
  if (!match.value || isFinished.value) {
    return
  }

  eventSaving.value = true
  try {
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
    Object.assign(eventForm, { type: 'ASSIST', team: '', player: '', minute: 1 })
    $q.notify({ type: 'positive', message: `${eventTypeLabel(events.at(-1).type)} registrado correctamente.` })
  } catch (error) {
    $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
  } finally {
    eventSaving.value = false
  }
}

const finishMatch = () => {
  $q.dialog({
    title: 'Finalizar partido',
    message: 'El encuentro quedará marcado como finalizado. Esta operación no se puede deshacer desde el frontend.',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const goals = apiGoals()
      await store.updateMatchResult(match.value._id, {
        homeScore: scoreFor(getId(match.value.homeTeam), goals),
        awayScore: scoreFor(getId(match.value.awayTeam), goals),
        status: 'FINISHED',
        goals,
      })
      $q.notify({ type: 'positive', message: 'Partido finalizado correctamente.' })
    } catch (error) {
      $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
    }
  })
}
</script>

<template>
  <div>
    <div class="row items-center q-mb-lg">
      <q-btn flat round icon="arrow_back" aria-label="Volver a partidos" @click="router.push('/partidos')" />
      <div class="q-ml-sm">
        <p class="text-caption text-uppercase text-grey-7 q-mb-xs">Encuentro</p>
        <h1 class="text-h4 text-weight-bold q-ma-none">Detalle del partido</h1>
      </div>
    </div>

    <q-banner v-if="store.matchError" rounded class="bg-negative text-white">
      {{ store.matchError }}
    </q-banner>

    <div v-else-if="store.matchLoading && !match" class="q-gutter-md">
      <q-skeleton type="rect" height="180px" />
      <q-skeleton type="rect" height="260px" />
    </div>

    <template v-else-if="match">
      <q-card flat bordered class="q-mb-md">
        <q-card-section class="row items-center q-col-gutter-md">
          <div class="col-12 row items-center justify-center match-heading">
            <div class="col-4 text-center">
              <ImagePreview
                :src="match.homeTeam?.logoUrl"
                fallback="/images/default-team.svg"
                :alt="`Escudo de ${teamName(match.homeTeam)}`"
                width="72px"
                height="72px"
                class="q-mb-sm"
              />
              <div class="text-subtitle1 text-weight-bold">{{ teamName(match.homeTeam) }}</div>
              <div class="text-caption text-grey-7">Local</div>
            </div>

            <div class="col-4 text-center">
              <div class="detail-score">
                <span>{{ match.homeScore ?? 0 }}</span>
                <span class="text-grey-6">–</span>
                <span>{{ match.awayScore ?? 0 }}</span>
              </div>
              <q-badge :color="matchStatusColor(match.status)" rounded class="q-mt-sm">
                {{ matchStatusLabel(match.status) }}
              </q-badge>
            </div>

            <div class="col-4 text-center">
              <ImagePreview
                :src="match.awayTeam?.logoUrl"
                fallback="/images/default-team.svg"
                :alt="`Escudo de ${teamName(match.awayTeam)}`"
                width="72px"
                height="72px"
                class="q-mb-sm"
              />
              <div class="text-subtitle1 text-weight-bold">{{ teamName(match.awayTeam) }}</div>
              <div class="text-caption text-grey-7">Visitante</div>
            </div>
          </div>

          <div class="col-12 text-center text-body2 text-grey-7">
            Jornada {{ match.matchday }} · {{ formatMatchDate(match.date) }}
          </div>
        </q-card-section>
      </q-card>

      <div v-if="normalizeMatchStatus(match.status) === 'IN_PROGRESS'" class="q-mb-md">
        <q-banner rounded class="bg-green-1 text-primary">
          En juego. El backend no envía el minuto actual; los minutos visibles corresponden solo a eventos registrados.
        </q-banner>
      </div>

      <div v-if="!isFinished" class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-lg-6">
          <q-card flat bordered class="full-height">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold">Registrar gol</div>
              <div class="text-caption text-grey-7 q-mb-md">El marcador se calcula desde los goles que valida la API.</div>
              <q-form class="q-gutter-md" @submit.prevent="registerGoal">
                <q-select
                  v-model="goalForm.team"
                  :options="teamOptions"
                  emit-value
                  map-options
                  label="Equipo"
                  outlined
                  required
                />
                <q-select
                  v-model="goalForm.player"
                  :options="goalPlayerOptions"
                  emit-value
                  map-options
                  label="Jugador"
                  outlined
                  required
                  :disable="!goalForm.team"
                />
                <q-select
                  v-model="goalForm.assistPlayer"
                  :options="assistPlayerOptions"
                  emit-value
                  map-options
                  label="Asistencia (opcional)"
                  outlined
                  clearable
                  :disable="!goalForm.team"
                />
                <q-input v-model.number="goalForm.minute" type="number" min="0" max="120" label="Minuto" outlined required />
                <q-btn type="submit" color="primary" icon="sports_soccer" label="Guardar gol" :loading="goalSaving.value" />
              </q-form>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-lg-6">
          <q-card flat bordered class="full-height">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold">Registrar evento</div>
              <div class="text-caption text-grey-7 q-mb-md">Tipos aceptados: asistencia y tarjetas.</div>
              <q-form class="q-gutter-md" @submit.prevent="registerEvent">
                <q-select
                  v-model="eventForm.type"
                  :options="[
                    { label: 'Asistencia', value: 'ASSIST' },
                    { label: 'Tarjeta amarilla', value: 'YELLOW_CARD' },
                    { label: 'Tarjeta roja', value: 'RED_CARD' },
                  ]"
                  emit-value
                  map-options
                  label="Tipo de evento"
                  outlined
                />
                <q-select
                  v-model="eventForm.team"
                  :options="teamOptions"
                  emit-value
                  map-options
                  label="Equipo"
                  outlined
                  required
                />
                <q-select
                  v-model="eventForm.player"
                  :options="eventPlayerOptions"
                  emit-value
                  map-options
                  label="Jugador"
                  outlined
                  required
                  :disable="!eventForm.team"
                />
                <q-input v-model.number="eventForm.minute" type="number" min="0" max="120" label="Minuto" outlined required />
                <q-btn type="submit" color="secondary" icon="add_task" label="Guardar evento" :loading="eventSaving.value" />
              </q-form>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row justify-end q-mb-md">
        <q-btn
          v-if="match.status !== 'FINISHED'"
          color="negative"
          outline
          icon="flag"
          label="Finalizar partido"
          @click="finishMatch"
        />
      </div>

      <q-card flat bordered>
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold q-mb-md">Cronología del encuentro</div>

          <div v-if="timeline.length" class="match-timeline">
            <div class="match-timeline__header">
              <div class="match-timeline__team-name">{{ teamName(match.homeTeam) }}</div>
              <div class="match-timeline__team-name match-timeline__team-name--center">Minuto</div>
              <div class="match-timeline__team-name match-timeline__team-name--right">{{ teamName(match.awayTeam) }}</div>
            </div>

            <div v-for="event in timeline" :key="`${event.type}-${event.playerId}-${event.minute}-${event.teamId}-${event.sourceOrder}`" class="match-timeline__row">
              <div class="match-timeline__side">
                <div v-if="event.side === 'home'" class="match-timeline__event match-timeline__event--home">
                  <span class="match-timeline__icon" :class="`match-timeline__icon--${event.type.toLowerCase()}`">
                    <q-icon :name="event.icon" :color="event.color" size="16px" />
                  </span>
                  <div class="match-timeline__content">
                    <strong>{{ event.label }}</strong>
                    <span>{{ event.playerName }}</span>
                  </div>
                </div>
                <div v-else class="match-timeline__empty-cell" aria-hidden="true"></div>
              </div>

              <div class="match-timeline__minute-pill">{{ event.minute }}'</div>

              <div class="match-timeline__side match-timeline__side--right">
                <div v-if="event.side === 'away'" class="match-timeline__event match-timeline__event--away">
                  <div class="match-timeline__content match-timeline__content--right">
                    <strong>{{ event.label }}</strong>
                    <span>{{ event.playerName }}</span>
                  </div>
                  <span class="match-timeline__icon" :class="`match-timeline__icon--${event.type.toLowerCase()}`">
                    <q-icon :name="event.icon" :color="event.color" size="16px" />
                  </span>
                </div>
                <div v-else class="match-timeline__empty-cell" aria-hidden="true"></div>
              </div>
            </div>
          </div>

          <div v-else class="text-grey-7">Todavía no hay goles ni eventos registrados en este partido.</div>
          <div v-if="isFinished" class="text-caption text-grey-7 q-mt-md">
            Resultado final: {{ match.homeScore ?? 0 }}–{{ match.awayScore ?? 0 }}.
          </div>
        </q-card-section>
      </q-card>
    </template>
  </div>
</template>

<style scoped>
.detail-score {
  display: flex;
  justify-content: center;
  gap: 14px;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.1;
}

.match-heading {
  min-height: 150px;
}

.match-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.match-timeline__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(17, 24, 39, 0.08);
}

.match-timeline__team-name {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 800;
  color: #29453a;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-timeline__team-name--center {
  text-align: center;
  color: #5c6d67;
}

.match-timeline__team-name--right {
  text-align: right;
}

.match-timeline__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.match-timeline__side {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.match-timeline__side--right {
  justify-content: flex-end;
}

.match-timeline__event {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 10px 12px;
  background: #f7faf8;
  border: 1px solid rgba(17, 24, 39, 0.05);
  border-radius: 12px;
}

.match-timeline__event--away {
  justify-content: flex-end;
  text-align: right;
}

.match-timeline__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.match-timeline__content strong {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1d5f41;
}

.match-timeline__content span {
  color: #475a55;
  font-size: 0.8rem;
  word-break: break-word;
}

.match-timeline__content--right {
  align-items: flex-end;
  text-align: right;
}

.match-timeline__minute-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: #183126;
  font-size: 0.72rem;
  background: rgba(20, 125, 74, 0.08);
  border-radius: 999px;
  height: 28px;
  width: 100%;
  border: 1px solid rgba(20, 125, 74, 0.12);
}

.match-timeline__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
}

.match-timeline__icon--goal {
  background: #ecfdf5;
}

.match-timeline__icon--assist {
  background: #eef5ff;
}

.match-timeline__icon--yellow_card {
  background: #fff7d6;
}

.match-timeline__icon--red_card {
  background: #fdecec;
}

.match-timeline__empty-cell {
  min-height: 52px;
  width: 100%;
}

@media (max-width: 768px) {
  .match-timeline__header,
  .match-timeline__row {
    grid-template-columns: minmax(0, 1fr) 56px minmax(0, 1fr);
    gap: 8px;
  }

  .match-timeline__event {
    padding: 8px 10px;
  }

  .match-timeline__team-name {
    letter-spacing: 0.04em;
    font-size: 0.68rem;
  }
}
</style>
