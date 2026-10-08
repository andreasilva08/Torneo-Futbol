<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import ImagePreview from '@/components/ImagePreview.vue'
import MatchSummaryCard from '@/components/MatchSummaryCard.vue'
import { useTournamentStore, getApiErrorMessage } from '@/stores/tournament'
import { normalizeMatchStatus } from '@/utils/matchFormatting'

const store = useTournamentStore()
const $q = useQuasar()
const router = useRouter()
const dialog = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const filterStatus = ref('ALL')
const sortMode = ref('matchday')
const form = reactive({
  matchday: null,
  date: '',
  homeTeam: '',
  awayTeam: '',
})

const teamOptions = computed(() => store.teams.map((team) => ({
  label: team.name,
  value: team._id,
})))

const statusLabels = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizado',
}

const getTeamName = (team) => {
  if (!team) return 'Equipo'
  if (typeof team === 'object') return team.name || 'Equipo'
  return store.teams.find((item) => item._id === team)?.name || 'Equipo'
}

const getTeamLogo = (team) => {
  if (!team) return '/images/default-team.svg'
  if (typeof team === 'object') return team.logoUrl || '/images/default-team.svg'
  const found = store.teams.find((item) => item._id === team)
  return found?.logoUrl || '/images/default-team.svg'
}

const formatMatchdayLabel = (matchday) => `Jornada ${Number(matchday) || 1}`

const formatDateLabel = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Fecha por confirmar'
  }

  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

const formatTimeLabel = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Hora por confirmar'
  }

  return new Intl.DateTimeFormat('es-ES', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const getFinishedMatchdaysForTeam = (teamId) => {
  if (!teamId) return []

  return store.matches
    .filter((match) => normalizeMatchStatus(match.status) === 'FINISHED' && (
      (typeof match.homeTeam === 'object' ? match.homeTeam?._id : match.homeTeam) === teamId ||
      (typeof match.awayTeam === 'object' ? match.awayTeam?._id : match.awayTeam) === teamId
    ))
    .map((match) => Number(match.matchday || 0))
    .filter((value) => Number.isInteger(value) && value > 0)
}

const isMatchdayBlockedForTeam = (teamId, matchday) => {
  if (!teamId || !matchday) return false
  const finishedMatchdays = getFinishedMatchdaysForTeam(teamId)
  return finishedMatchdays.includes(Number(matchday))
}

const matchdayComparison = computed(() => Array.from({ length: 38 }, (_, index) => {
  const value = index + 1
  const homeDisputed = isMatchdayBlockedForTeam(form.homeTeam, value)
  const awayDisputed = isMatchdayBlockedForTeam(form.awayTeam, value)
  const available = !homeDisputed && !awayDisputed
  const selected = form.matchday === value

  return {
    value,
    label: `Jornada ${value}`,
    homeDisputed,
    awayDisputed,
    available,
    selected,
  }
}))

const availableMatchdays = computed(() => matchdayComparison.value.filter((day) => day.available).map((day) => day.value))

const resetForm = () => {
  Object.assign(form, {
    matchday: null,
    date: '',
    homeTeam: '',
    awayTeam: '',
  })
}

const openDialog = () => {
  resetForm()
  dialog.value = true
}

const scheduleMatch = async () => {
  if (!form.matchday) {
    $q.notify({ type: 'warning', message: 'Debes seleccionar una jornada antes de guardar el partido.' })
    return
  }

  if (form.homeTeam === form.awayTeam) {
    $q.notify({ type: 'warning', message: 'El equipo local y el visitante deben ser distintos.' })
    return
  }

  if (isMatchdayBlockedForTeam(form.homeTeam, form.matchday) || isMatchdayBlockedForTeam(form.awayTeam, form.matchday)) {
    $q.notify({ type: 'warning', message: 'La jornada seleccionada ya fue disputada por uno de los equipos seleccionados.' })
    return
  }

  saving.value = true

  try {
    const created = await store.createMatch({
      matchday: Number(form.matchday),
      date: new Date(form.date).toISOString(),
      homeTeam: form.homeTeam,
      awayTeam: form.awayTeam,
    })

    dialog.value = false
    $q.notify({ type: 'positive', message: 'Partido programado correctamente.' })
    if (created._id) {
      await router.push({ name: 'match-detail', params: { id: created._id } })
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
  } finally {
    saving.value = false
  }
}

const compareMatchesByMatchday = (first, second, descendingDate = false) => {
  const firstMatchday = Number(first?.matchday ?? 0)
  const secondMatchday = Number(second?.matchday ?? 0)

  if (firstMatchday !== secondMatchday) {
    return firstMatchday - secondMatchday
  }

  const firstDate = new Date(first?.date || 0).getTime()
  const secondDate = new Date(second?.date || 0).getTime()

  return descendingDate ? secondDate - firstDate : firstDate - secondDate
}

const currentMatchday = computed(() => {
  const values = store.matches
    .map((match) => Number(match.matchday))
    .filter((value) => Number.isFinite(value) && value > 0)

  return values.length ? Math.max(...values) : null
})

const filteredMatches = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return [...store.matches].filter((match) => {
    const teamNames = `${getTeamName(match.homeTeam)} ${getTeamName(match.awayTeam)} ${formatMatchdayLabel(match.matchday)}`.toLowerCase()
    const matchesSearch = !query || teamNames.includes(query)
    const matchesStatus = filterStatus.value === 'ALL' || normalizeMatchStatus(match.status) === filterStatus.value
    return matchesSearch && matchesStatus
  })
})

const sortedMatches = computed(() => {
  const matches = [...filteredMatches.value]

  if (sortMode.value === 'date-asc') {
    return matches.sort((first, second) => new Date(first.date || 0).getTime() - new Date(second.date || 0).getTime())
  }

  if (sortMode.value === 'date-desc') {
    return matches.sort((first, second) => new Date(second.date || 0).getTime() - new Date(first.date || 0).getTime())
  }

  return matches.sort((first, second) => compareMatchesByMatchday(first, second))
})

const groupedMatches = computed(() => {
  const groups = new Map()

  for (const match of sortedMatches.value) {
    const matchday = Number(match.matchday) || 1
    if (!groups.has(matchday)) {
      groups.set(matchday, [])
    }
    groups.get(matchday).push(match)
  }

  return [...groups.entries()].map(([matchday, matches]) => ({
    matchday,
    matches: [...matches].sort((first, second) => {
      if (sortMode.value === 'date-desc') {
        return new Date(second.date || 0).getTime() - new Date(first.date || 0).getTime()
      }

      if (sortMode.value === 'date-asc') {
        return new Date(first.date || 0).getTime() - new Date(second.date || 0).getTime()
      }

      return compareMatchesByMatchday(first, second)
    }),
    isCurrent: currentMatchday.value !== null && Number(matchday) === Number(currentMatchday.value),
  }))
})

const teamMatchdays = computed(() => {
  const matchesByTeam = store.teams.map((team) => {
    const matchdays = [...new Set(store.matches
      .filter((match) => normalizeMatchStatus(match.status) === 'FINISHED' && (
        (typeof match.homeTeam === 'object' ? match.homeTeam?._id : match.homeTeam) === team._id ||
        (typeof match.awayTeam === 'object' ? match.awayTeam?._id : match.awayTeam) === team._id
      ))
      .map((match) => Number(match.matchday))
      .filter((value) => Number.isInteger(value) && value > 0))]
      .sort((first, second) => first - second)

    return {
      team,
      matchdays,
    }
  })

  return matchesByTeam.sort((first, second) => first.team.name.localeCompare(second.team.name))
})

const getScore = (match) => {
  const normalizedStatus = normalizeMatchStatus(match.status)
  if (normalizedStatus === 'FINISHED' || normalizedStatus === 'IN_PROGRESS') {
    return `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`
  }

  return 'VS'
}

const getStateClass = (status) => {
  const normalizedStatus = normalizeMatchStatus(status)
  if (normalizedStatus === 'FINISHED') return 'match-card__chip--finished'
  if (normalizedStatus === 'IN_PROGRESS') return 'match-card__chip--live'
  return 'match-card__chip--scheduled'
}

onMounted(async () => {
  await Promise.all([store.fetchTeams(), store.fetchPlayers(), store.fetchMatches()])
})
</script>

<template>
  <div>
    <div class="page-header q-mb-xl">
      <div class="page-header__title-block">
        <div class="page-header__icon">
          <q-icon name="sports_soccer" size="1.4rem" />
        </div>
        <div>
          <p class="page-header__eyebrow">Calendario</p>
          <h1 class="page-header__title">Partidos</h1>
        </div>
      </div>
      <q-btn
        class="page-header__cta"
        color="primary"
        icon="add"
        label="Programar partido"
        :disable="store.teams.length < 2"
        @click="openDialog"
      />
    </div>

    <q-banner v-if="store.matchesError" rounded class="bg-negative text-white q-mb-md">
      No se pudieron consultar los partidos: {{ store.matchesError }}
    </q-banner>
    <q-banner v-if="store.teams.length < 2" rounded class="bg-info text-white q-mb-md">
      Registra al menos dos equipos antes de programar un encuentro.
    </q-banner>

    <div v-if="store.matchesLoading && !store.matches.length" class="q-gutter-md">
      <q-skeleton v-for="item in 3" :key="item" type="rect" height="120px" />
    </div>

    <div v-else class="match-page">
      <div class="match-toolbar q-mb-xl">
        <q-input
          v-model="searchQuery"
          dense
          outlined
          clearable
          label="Buscar partido"
          class="match-toolbar__search"
        />

        <div class="match-toolbar__filters">
          <q-btn-toggle
            v-model="filterStatus"
            :options="[
              { label: 'Todos', value: 'ALL' },
              { label: 'Programados', value: 'SCHEDULED' },
              { label: 'En curso', value: 'IN_PROGRESS' },
              { label: 'Finalizados', value: 'FINISHED' },
            ]"
            spread
            no-caps
            color="primary"
            toggle-color="primary"
          />
        </div>

        <div class="match-toolbar__sort">
          <q-select
            v-model="sortMode"
            :options="[
              { label: 'Fecha y hora', value: 'date-asc' },
              { label: 'Más recientes primero', value: 'date-desc' },
              { label: 'Jornada', value: 'matchday' },
            ]"
            emit-value
            map-options
            outlined
            dense
            label="Ordenar por"
          />
        </div>
      </div>

      <div class="team-matchdays q-mb-lg">
        <div class="team-matchdays__header">
          <span class="team-matchdays__title">Jornadas disputadas</span>
        </div>

        <div class="team-matchdays__grid">
          <div v-for="item in teamMatchdays" :key="item.team._id" class="team-matchdays__card">
            <div class="team-matchdays__meta">
              <div class="team-matchdays__team">{{ item.team.name }}</div>
              <div class="team-matchdays__count">{{ item.matchdays.length }} / 38 jornadas</div>
            </div>

            <div v-if="item.matchdays.length" class="team-matchdays__chips">
              <q-chip v-for="matchday in item.matchdays" :key="`${item.team._id}-${matchday}`" size="sm" rounded color="primary" text-color="white">
                Jornada {{ matchday }}
              </q-chip>
            </div>
            <div v-else class="team-matchdays__empty">Sin jornadas disputadas</div>
          </div>
        </div>
      </div>

      <nav v-if="groupedMatches.length" class="matchday-selector q-mb-lg" aria-label="Ir a una jornada">
        <a
          v-for="group in groupedMatches"
          :key="`jump-${group.matchday}`"
          :href="`#matchday-${group.matchday}`"
          class="matchday-selector__item"
          :class="{ 'matchday-selector__item--current': group.isCurrent }"
        >
          J{{ group.matchday }}
        </a>
      </nav>

      <div v-if="groupedMatches.length" class="match-groups">
        <div v-for="group in groupedMatches" :id="`matchday-${group.matchday}`" :key="group.matchday" class="match-group">
          <div class="match-group__header">
            <span class="match-group__title">Jornada {{ group.matchday }}</span>
            <q-badge v-if="group.isCurrent" color="primary" rounded class="match-group__badge">Actual</q-badge>
          </div>

          <div class="match-grid">
            <MatchSummaryCard v-for="match in group.matches" :key="match._id" :match="match" />
          </div>
        </div>
      </div>

      <q-card v-else flat bordered class="q-pa-xl text-center">
        <q-icon name="event_busy" color="grey-6" size="3rem" />
        <div class="text-h6 q-mt-md">No hay partidos para este filtro</div>
        <div class="text-body2 text-grey-7 q-mt-sm">Prueba con otra búsqueda o cambia el filtro.</div>
      </q-card>
    </div>

    <q-dialog v-model="dialog" persistent>
      <q-card class="match-dialog">
        <q-card-section>
          <div class="row items-center q-gutter-sm">
            <q-icon name="sports_soccer" color="positive" size="1.5rem" />
            <div class="text-h6">Programar partido</div>
          </div>
          <div class="text-caption text-grey-7">Selecciona ambos equipos para comparar jornadas disponibles.</div>
        </q-card-section>

        <q-form class="q-gutter-md q-pa-md" @submit.prevent="scheduleMatch">
          <q-select
            v-model="form.homeTeam"
            :options="teamOptions"
            emit-value
            map-options
            label="Equipo local"
            outlined
            required
          />
          <q-select
            v-model="form.awayTeam"
            :options="teamOptions"
            emit-value
            map-options
            label="Equipo visitante"
            outlined
            required
          />

          <div v-if="form.homeTeam && form.awayTeam && form.homeTeam !== form.awayTeam">
            <div class="text-subtitle2 text-weight-medium q-mb-sm">Historial de jornadas</div>
            <div class="matchday-compare-wrapper">
              <div class="matchday-compare-table">
                <div class="matchday-compare-row matchday-compare-row--header">
                  <div class="matchday-compare-team">Jornada</div>
                  <div class="matchday-compare-days">
                    <div v-for="day in matchdayComparison" :key="`header-${day.value}`" class="matchday-compare-cell matchday-compare-cell--header">
                      <span>{{ day.label }}</span>
                    </div>
                  </div>
                </div>

                <div class="matchday-compare-row">
                  <div class="matchday-compare-team">{{ getTeamName(form.homeTeam) }}</div>
                  <div class="matchday-compare-days">
                    <div
                      v-for="day in matchdayComparison"
                      :key="`home-${day.value}`"
                      class="matchday-compare-cell"
                      :class="{
                        'matchday-compare-cell--selected': day.selected,
                        'matchday-compare-cell--done': day.homeDisputed,
                        'matchday-compare-cell--available': !day.homeDisputed && !day.awayDisputed,
                        'matchday-compare-cell--blocked': !day.homeDisputed && day.awayDisputed,
                      }"
                    >
                      {{ day.homeDisputed ? '✓' : '○' }}
                    </div>
                  </div>
                </div>

                <div class="matchday-compare-row">
                  <div class="matchday-compare-team">{{ getTeamName(form.awayTeam) }}</div>
                  <div class="matchday-compare-days">
                    <div
                      v-for="day in matchdayComparison"
                      :key="`away-${day.value}`"
                      class="matchday-compare-cell"
                      :class="{
                        'matchday-compare-cell--selected': day.selected,
                        'matchday-compare-cell--done': day.awayDisputed,
                        'matchday-compare-cell--available': !day.homeDisputed && !day.awayDisputed,
                        'matchday-compare-cell--blocked': day.homeDisputed && !day.awayDisputed,
                      }"
                    >
                      {{ day.awayDisputed ? '✓' : '○' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="q-mt-md">
              <div class="text-subtitle2 text-weight-medium q-mb-sm">Jornadas disponibles para ambos</div>
              <div v-if="availableMatchdays.length" class="matchday-grid">
                <button
                  v-for="day in availableMatchdays"
                  :key="day"
                  type="button"
                  class="matchday-card"
                  :class="{ 'matchday-card--selected': form.matchday === day }"
                  :aria-pressed="form.matchday === day"
                  @click="form.matchday = day"
                >
                  <span class="matchday-card__badge" v-if="form.matchday === day">✓</span>
                  <span class="matchday-card__title">Jornada {{ day }}</span>
                  <span class="matchday-card__status">{{ form.matchday === day ? 'Seleccionada' : 'Disponible' }}</span>
                </button>
              </div>
              <div v-else class="text-caption text-grey-7">No hay jornadas disponibles para ambos equipos en este momento.</div>
            </div>
          </div>

          <div v-else-if="form.homeTeam && form.awayTeam && form.homeTeam === form.awayTeam" class="text-caption text-negative">
            El equipo local y el visitante deben ser distintos.
          </div>

          <div v-else class="text-caption text-grey-7">
            Selecciona ambos equipos para comparar las jornadas disponibles.
          </div>

          <div v-if="!form.matchday && form.homeTeam && form.awayTeam && form.homeTeam !== form.awayTeam" class="text-caption text-negative q-mt-sm">
            Debes elegir una jornada disponible para continuar.
          </div>

          <q-input v-model="form.date" type="datetime-local" label="Fecha y hora" outlined required />

          <div class="row justify-end q-gutter-sm">
            <q-btn flat label="Cancelar" color="grey-7" @click="dialog = false" />
            <q-btn type="submit" label="Programar" color="primary" :loading="saving" :disable="!form.matchday" />
          </div>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 20px;
  border: 1px solid rgba(17, 24, 39, 0.06);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(26, 90, 63, 0.06), rgba(255, 255, 255, 0.9));
  box-shadow: 0 10px 24px rgba(13, 56, 37, 0.04);
}

.page-header__title-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.page-header__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1d5f41, #2ca36d);
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(29, 95, 65, 0.22);
}

.page-header__eyebrow {
  margin: 0 0 4px;
  font-size: 0.73rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #5a6f67;
  font-weight: 800;
}

.page-header__title {
  margin: 0;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0;
  color: #112a1e;
}

.page-header__cta {
  min-height: 44px;
  border-radius: 8px;
  font-weight: 700;
}

.match-dialog {
  width: 92vw;
  max-width: 760px;
}

.match-page {
  display: flex;
  flex-direction: column;
  padding: 6px 0 8px;
}

.match-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.7fr) minmax(200px, 0.8fr);
  gap: 16px;
  align-items: center;
  padding: 18px 18px 14px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(17, 24, 39, 0.05);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(13, 56, 37, 0.03);
}

.match-toolbar__search :deep(.q-field__control),
.match-toolbar__sort :deep(.q-field__control) {
  border-radius: 14px;
}

.match-toolbar__search :deep(.q-field__marginal),
.match-toolbar__sort :deep(.q-field__marginal) {
  color: #2d5c4d;
}

.match-toolbar__filters :deep(.q-btn-group) {
  width: 100%;
  border-radius: 14px;
  background: rgba(240, 246, 243, 0.9);
  border: 1px solid rgba(17, 24, 39, 0.04);
  overflow: hidden;
}

.match-toolbar__filters :deep(.q-btn) {
  min-height: 42px;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.match-toolbar__filters :deep(.q-btn--active) {
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18);
}

.match-groups {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.matchday-selector {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 0 8px;
  scroll-behavior: smooth;
}

.matchday-selector__item {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  height: 36px;
  border: 1px solid #2a374a;
  border-radius: 6px;
  background: #161f30;
  color: #cbd5e1;
  font-size: 0.76rem;
  font-weight: 800;
  text-decoration: none;
}

.matchday-selector__item--current {
  border-color: #10b981;
  background: #10b981;
  color: #0b111e;
}

.match-group {
  display: flex;
  flex-direction: column;
  gap: 18px;
  scroll-margin-top: 84px;
}

.match-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 18px;
  border-radius: 8px;
  background: linear-gradient(135deg, #edf6f2 0%, #f5faf7 100%);
  border: 1px solid rgba(17, 24, 39, 0.06);
  box-shadow: 0 6px 18px rgba(13, 56, 37, 0.02);
}

.match-group__title {
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #1d5f41;
}

.match-group__badge {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.match-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 20px;
}

.matchday-compare-wrapper {
  overflow-x: auto;
  padding-bottom: 8px;
}

.matchday-compare-table {
  min-width: 1000px;
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
  background: #f8faf9;
}

.matchday-compare-row {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  align-items: stretch;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.matchday-compare-row:last-child {
  border-bottom: none;
}

.matchday-compare-row--header {
  background: #eef6f2;
}

.matchday-compare-team {
  min-width: 180px;
  padding: 12px 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.4);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
}

.matchday-compare-days {
  display: grid;
  grid-template-columns: repeat(38, minmax(56px, 1fr));
  min-width: 100%;
}

.matchday-compare-cell {
  min-width: 0;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid rgba(0, 0, 0, 0.05);
  font-weight: 800;
  color: #45514c;
  background: #fff;
  padding: 6px;
  text-align: center;
}

.matchday-compare-cell:last-child {
  border-right: none;
}

.matchday-compare-cell--header {
  font-size: 0.72rem;
  line-height: 1.2;
  background: #eef6f2;
  color: #4f6059;
  min-height: 64px;
}

.matchday-compare-cell--done {
  background: #eafaf1;
  color: #1e8b5f;
}

.matchday-compare-cell--available {
  background: #f4f8ff;
  color: #314f72;
}

.matchday-compare-cell--blocked {
  background: #f3f4f6;
  color: #6b7280;
}

.matchday-compare-cell--selected {
  background: linear-gradient(135deg, #ecfdf5 0%, #d8f4e7 100%);
  color: #0f5132;
  box-shadow: inset 0 0 0 1px rgba(31, 157, 104, 0.18);
}

.matchday-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}

.matchday-card {
  position: relative;
  border: 1px solid #dfe7e1;
  border-radius: 8px;
  background: #f8faf9;
  padding: 16px 12px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 104px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.matchday-card:hover {
  transform: translateY(-1px);
  border-color: #a7d2b8;
  box-shadow: 0 10px 20px rgba(13, 56, 37, 0.08);
}

.matchday-card--selected {
  background: linear-gradient(135deg, #147d4a 0%, #1f9d68 100%);
  border-color: #147d4a;
  box-shadow: 0 16px 26px rgba(20, 125, 74, 0.22);
}

.matchday-card__badge {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 800;
}

.matchday-card__title {
  font-size: 0.94rem;
  font-weight: 800;
  color: #1f2d29;
  text-align: center;
}

.matchday-card--selected .matchday-card__title {
  color: #ffffff;
}

.matchday-card__status {
  margin-top: 8px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #1d5f41;
}

.matchday-card--selected .matchday-card__status {
  color: rgba(255, 255, 255, 0.9);
}

.team-matchdays {
  margin-top: 12px;
}

.team-matchdays__header {
  margin-bottom: 14px;
}

.team-matchdays__title {
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 800;
  color: #29453a;
}

.team-matchdays__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.team-matchdays__card {
  background: #ffffff;
  border: 1px solid rgba(17, 24, 39, 0.06);
  border-radius: 8px;
  padding: 16px 14px;
  box-shadow: 0 8px 20px rgba(18, 61, 44, 0.03);
}

.team-matchdays__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.team-matchdays__team {
  font-weight: 800;
  color: #183126;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-matchdays__count {
  font-size: 0.72rem;
  color: #53615b;
  font-weight: 700;
}

.team-matchdays__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.team-matchdays__empty {
  color: #66756f;
  font-size: 0.8rem;
}

@media (max-width: 768px) {
  .match-toolbar {
    grid-template-columns: 1fr;
  }

  .match-grid {
    grid-template-columns: 1fr;
  }
}
</style>

