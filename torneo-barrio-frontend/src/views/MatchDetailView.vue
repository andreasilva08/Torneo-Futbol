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
} from '@/utils/matchFormatting'
import ImagePreview from '@/components/ImagePreview.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const store = useTournamentStore()
const goalForm = reactive({ team: '', player: '', minute: 1 })
const eventForm = reactive({ type: 'ASSIST', team: '', player: '', minute: 1 })
const goalSaving = reactive({ value: false })
const eventSaving = reactive({ value: false })

const match = computed(() => store.matchDetail)
const isFinished = computed(() => match.value?.status === 'FINISHED')
const participantTeams = computed(() => [match.value?.homeTeam, match.value?.awayTeam].filter(Boolean))
const teamOptions = computed(() => participantTeams.value.map((team) => ({
  label: team.name || store.teams.find((item) => item._id === getId(team))?.name || 'Equipo',
  value: getId(team),
})))
const goalPlayerOptions = computed(() => store.players
  .filter((player) => getId(player.team) === goalForm.team)
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

  const goals = (match.value.goals || []).map((goal) => ({
    ...goal,
    kind: 'GOAL',
    label: 'Gol',
  }))
  const events = (match.value.events || []).map((event) => ({
    ...event,
    kind: event.type,
    label: eventTypeLabel(event.type),
  }))

  return [...goals, ...events].sort((first, second) => Number(first.minute) - Number(second.minute))
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
})

watch(() => eventForm.team, () => {
  eventForm.player = ''
})

const apiGoals = () => (match.value?.goals || []).map((goal) => ({
  player: getId(goal.player),
  team: getId(goal.team),
  minute: Number(goal.minute),
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
    Object.assign(goalForm, { team: '', player: '', minute: 1 })
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

      <div v-if="match.status === 'IN_PROGRESS'" class="q-mb-md">
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
          <q-timeline v-if="timeline.length" color="primary">
            <q-timeline-entry
              v-for="(item, index) in timeline"
              :key="`${item.kind}-${item.minute}-${item.player?._id || item.player}-${index}`"
              :title="item.label"
              :subtitle="`${item.minute}' · ${playerName(item.player)} · ${teamName(item.team)}`"
              :icon="item.kind === 'GOAL' ? 'sports_soccer' : item.kind === 'ASSIST' ? 'assistant' : 'style'"
              :color="item.kind === 'RED_CARD' ? 'negative' : item.kind === 'YELLOW_CARD' ? 'warning' : 'primary'"
            />
          </q-timeline>
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
</style>
