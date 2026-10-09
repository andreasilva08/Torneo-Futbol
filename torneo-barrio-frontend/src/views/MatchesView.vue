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
const activeMatchdayFilter = ref(null)

const form = reactive({
  matchday: null,
  matchDate: '',
  matchTime: '16:00',
  stadium: 'Cancha Principal',
  referee: '',
  homeTeam: '',
  awayTeam: '',
})

const teamOptions = computed(() => store.teams.map((team) => ({
  label: team.name,
  value: team._id,
})))

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
    label: `J${value}`,
    homeDisputed,
    awayDisputed,
    available,
    selected,
  }
}))

const availableMatchdays = computed(() => matchdayComparison.value.filter((day) => day.available).map((day) => day.value))

const resetForm = () => {
  const today = new Date().toISOString().split('T')[0]
  Object.assign(form, {
    matchday: null,
    matchDate: today,
    matchTime: '16:00',
    stadium: 'Cancha Principal',
    referee: '',
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

  if (!form.matchDate) {
    $q.notify({ type: 'warning', message: 'Debes ingresar la fecha del encuentro.' })
    return
  }

  saving.value = true

  try {
    const timeStr = form.matchTime || '16:00'
    const matchDateObj = new Date(`${form.matchDate}T${timeStr}:00`)
    const finalDateIso = Number.isNaN(matchDateObj.getTime()) ? new Date().toISOString() : matchDateObj.toISOString()

    const created = await store.createMatch({
      matchday: Number(form.matchday),
      date: finalDateIso,
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

const allMatchdayNumbers = computed(() => {
  const days = new Set()
  for (let i = 1; i <= 38; i++) days.add(i)
  return Array.from(days)
})

const filteredMatches = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return [...store.matches].filter((match) => {
    const teamNames = `${getTeamName(match.homeTeam)} ${getTeamName(match.awayTeam)} ${formatMatchdayLabel(match.matchday)}`.toLowerCase()
    const matchesSearch = !query || teamNames.includes(query)
    const matchesStatus = filterStatus.value === 'ALL' || normalizeMatchStatus(match.status) === filterStatus.value
    const matchesMatchday = !activeMatchdayFilter.value || Number(match.matchday) === activeMatchdayFilter.value
    return matchesSearch && matchesStatus && matchesMatchday
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

const selectMatchday = (day) => {
  if (activeMatchdayFilter.value === day) {
    activeMatchdayFilter.value = null // Deseleccionar para ver todos
  } else {
    activeMatchdayFilter.value = day
  }
}

onMounted(async () => {
  await Promise.all([store.fetchTeams(), store.fetchPlayers(), store.fetchMatches()])
})

</script>

<template>
  <div class="matches-page">
    <!-- PAGE HEADER -->
    <div class="sport-page-header">
      <div class="sport-page-header__left">
        <div class="sport-page-header__icon-box">
          <q-icon name="event" />
        </div>
        <div>
          <div class="sport-page-header__eyebrow">TEMPORADA 2026 · FIXTURE & CALENDARIO</div>
          <h1 class="sport-page-header__title">Partidos y Jornadas</h1>
        </div>
      </div>

      <q-btn
        unelevated
        color="primary"
        icon="add"
        label="Programar Partido"
        :disable="store.teams.length < 2"
        @click="openDialog"
      />
    </div>

    <!-- ERROR & WARNING BANNERS -->
    <q-banner v-if="store.matchesError" rounded class="bg-negative text-white q-mb-md">
      No se pudieron consultar los partidos: {{ store.matchesError }}
    </q-banner>
    <q-banner v-if="store.teams.length < 2" rounded class="bg-info text-white q-mb-md">
      Registra al menos dos equipos antes de programar un encuentro.
    </q-banner>

    <div v-if="store.matchesLoading && !store.matches.length" class="q-gutter-md">
      <q-skeleton v-for="item in 3" :key="item" type="rect" height="120px" />
    </div>

    <div v-else>
      <!-- TOOLBAR & FILTERS -->
      <div class="sports-toolbar q-mb-lg">
        <div class="row q-col-gutter-md items-center">
          <!-- SEARCH INPUT -->
          <div class="col-12 col-md-4">
            <q-input
              v-model="searchQuery"
              dense
              outlined
              clearable
              label="Buscar por equipo o jornada"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>

          <!-- STATUS BUTTON TOGGLE -->
          <div class="col-12 col-md-5">
            <div class="status-btn-group">
              <button
                type="button"
                class="status-btn"
                :class="{ 'status-btn--active': filterStatus === 'ALL' }"
                @click="filterStatus = 'ALL'"
              >
                Todos ({{ store.matches.length }})
              </button>
              <button
                type="button"
                class="status-btn"
                :class="{ 'status-btn--active': filterStatus === 'SCHEDULED' }"
                @click="filterStatus = 'SCHEDULED'"
              >
                Programados
              </button>
              <button
                type="button"
                class="status-btn"
                :class="{ 'status-btn--active': filterStatus === 'IN_PROGRESS' }"
                @click="filterStatus = 'IN_PROGRESS'"
              >
                En Vivo ({{ store.liveMatches.length }})
              </button>
              <button
                type="button"
                class="status-btn"
                :class="{ 'status-btn--active': filterStatus === 'FINISHED' }"
                @click="filterStatus = 'FINISHED'"
              >
                Finalizados
              </button>
            </div>
          </div>

          <!-- SORT SELECT -->
          <div class="col-12 col-md-3">
            <q-select
              v-model="sortMode"
              :options="[
                { label: 'Jornada', value: 'matchday' },
                { label: 'Más recientes primero', value: 'date-desc' },
                { label: 'Fecha y hora', value: 'date-asc' },
              ]"
              emit-value
              map-options
              outlined
              dense
              stack-label
              label="Ordenar por"
            />
          </div>
        </div>
      </div>

      <!-- HORIZONTAL JORNADAS SELECTOR (J1..J38) -->
      <div class="matchdays-bar-container q-mb-xl">
        <div class="matchdays-bar-header">
          <div class="row items-center gap-xs">
            <q-icon name="calendar_month" color="primary" size="18px" />
            <span class="matchdays-bar-title">SELECTOR DE JORNADAS</span>
          </div>
          <span v-if="activeMatchdayFilter" class="text-caption text-primary cursor-pointer" @click="activeMatchdayFilter = null">
            Mostrar todas las jornadas
          </span>
        </div>

        <div class="matchdays-scroll-row">
          <button
            type="button"
            class="matchday-chip-btn"
            :class="{ 'matchday-chip-btn--active': activeMatchdayFilter === null }"
            @click="activeMatchdayFilter = null"
          >
            TODAS
          </button>
          <button
            v-for="day in allMatchdayNumbers"
            :key="`chip-j-${day}`"
            type="button"
            class="matchday-chip-btn"
            :class="{ 'matchday-chip-btn--active': activeMatchdayFilter === day }"
            @click="selectMatchday(day)"
          >
            J{{ day }}
          </button>
        </div>
      </div>

      <!-- JORNADAS DISPUTADAS POR EQUIPO (REGLA 37) -->
      <div class="rule37-container q-mb-xl">
        <!-- ENCABEZADO DE SECCIÓN -->
        <div class="rule37-header q-mb-lg">
          <div class="rule37-icon-box">
            <q-icon name="assignment_turned_in" size="22px" />
          </div>
          <div>
            <div class="rule37-title">JORNADAS DISPUTADAS POR EQUIPO</div>
            <div class="rule37-subtitle">
              Cómputo en tiempo real derivado exclusivamente de partidos con estado FINALIZADO o EN VIVO.
            </div>
          </div>
        </div>

        <!-- GRID DE TARJETAS DE EQUIPO -->
        <div class="row q-col-gutter-md">
          <div
            v-for="item in teamMatchdays"
            :key="item.team._id"
            class="col-12 col-sm-6 col-md-4 col-xl-3"
          >
            <div class="rule37-team-card">
              <!-- TOP: escudo + nombre + contador -->
              <div class="rule37-card-top">
                <div class="rule37-crest-ring">
                  <ImagePreview
                    :src="item.team.logoUrl"
                    fallback="/images/default-team.svg"
                    :alt="item.team.name"
                    width="38px"
                    height="38px"
                  />
                </div>
                <div class="rule37-team-info">
                  <div class="rule37-team-name">{{ item.team.name }}</div>
                </div>
                <div class="rule37-count-block">
                  <span class="rule37-count-value">{{ item.matchdays.length }}</span>
                  <span class="rule37-count-total">/ 38</span>
                </div>
              </div>
              <!-- PIE: descripción -->
              <div class="rule37-card-footer">
                <span v-if="!item.matchdays.length" class="rule37-footer-text">
                  Sin jornadas jugadas aún
                </span>
                <span v-else class="rule37-footer-text">
                  {{ item.matchdays.length }} partido{{ item.matchdays.length > 1 ? 's' : '' }} jugado{{ item.matchdays.length > 1 ? 's' : '' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- GROUPED MATCHES PER JORNADA -->
      <div v-if="groupedMatches.length" class="matchday-groups-list">
        <div
          v-for="group in groupedMatches"
          :id="`matchday-${group.matchday}`"
          :key="group.matchday"
          class="matchday-group-section q-mb-xl"
        >
          <!-- GROUP HEADER -->
          <div class="matchday-group-header">
            <div class="row items-center gap-sm">
              <div class="matchday-header-badge">JORNADA {{ group.matchday }}</div>
              <span class="matchday-matches-count">{{ group.matches.length }} partido{{ group.matches.length > 1 ? 's' : '' }}</span>
            </div>
            <q-badge v-if="group.isCurrent" color="primary" rounded class="text-weight-bold">
              JORNADA ACTUAL
            </q-badge>
          </div>

          <!-- MATCHES GRID -->
          <div class="row q-col-gutter-lg">
            <div
              v-for="match in group.matches"
              :key="match._id"
              class="col-12 col-md-6 col-xl-4"
            >
              <MatchSummaryCard :match="match" />
            </div>
          </div>
        </div>
      </div>

      <!-- EMPTY STATE -->
      <q-card v-else flat class="sports-panel-card q-pa-xl text-center">
        <q-icon name="event_busy" color="grey-6" size="48px" />
        <div class="text-h6 text-weight-bold q-mt-md">No se encontraron partidos</div>
        <div class="text-body2 text-grey-5 q-mt-xs">Prueba seleccionando otro filtro o limpiando el buscador.</div>
      </q-card>
    </div>

    <!-- SCHEDULE MATCH MODAL DIALOG -->
    <q-dialog v-model="dialog" persistent>
      <q-card class="schedule-dialog-card">
        <!-- DIALOG HEADER -->
        <q-card-section class="dialog-header-section">
          <div class="row items-center justify-between">
            <div class="row items-center gap-sm">
              <div class="header-logo-badge">
                <q-icon name="event" size="22px" />
              </div>
              <div>
                <div class="text-h6 text-weight-bold">Programar Partido</div>
                <div class="text-caption text-grey-5">Configuración de nuevo encuentro del torneo</div>
              </div>
            </div>
            <q-btn flat round dense icon="close" color="grey-5" @click="dialog = false" />
          </div>
        </q-card-section>

        <!-- FORM BODY -->
        <q-form class="q-pa-lg q-gutter-y-lg" @submit.prevent="scheduleMatch">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.homeTeam"
                :options="teamOptions"
                emit-value
                map-options
                label="Equipo Local"
                outlined
                stack-label
                required
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.awayTeam"
                :options="teamOptions"
                emit-value
                map-options
                label="Equipo Visitante"
                outlined
                stack-label
                required
              />
            </div>
          </div>

          <!-- COMPARISON MATRIX IF BOTH TEAMS SELECTED -->
          <div v-if="form.homeTeam && form.awayTeam && form.homeTeam !== form.awayTeam" class="comparison-block">
            <div class="text-subtitle2 text-weight-bold q-mb-xs text-white">
              Historial y Disponibilidad de Jornadas
            </div>
            <div class="text-caption text-grey-5 q-mb-sm">
              Comprueba qué jornadas ya han jugado ambos equipos para evitar duplicados.
            </div>

            <!-- COMPARISON TABLE SCROLL -->
            <div class="comparison-table-wrapper">
              <div class="comp-matrix-table">
                <!-- ROW 1: HEADER -->
                <div class="comp-row comp-row--head">
                  <div class="comp-team-cell">Equipo / Jornada</div>
                  <div class="comp-days-track">
                    <div v-for="d in matchdayComparison" :key="`head-${d.value}`" class="comp-day-head">
                      {{ d.label }}
                    </div>
                  </div>
                </div>

                <!-- ROW 2: HOME TEAM -->
                <div class="comp-row">
                  <div class="comp-team-cell text-weight-bold">
                    {{ getTeamName(form.homeTeam) }}
                  </div>
                  <div class="comp-days-track">
                    <div
                      v-for="d in matchdayComparison"
                      :key="`h-${d.value}`"
                      class="comp-cell"
                      :class="{
                        'comp-cell--done': d.homeDisputed,
                        'comp-cell--available': !d.homeDisputed && !d.awayDisputed,
                        'comp-cell--blocked': !d.homeDisputed && d.awayDisputed,
                        'comp-cell--selected': d.selected,
                      }"
                    >
                      {{ d.homeDisputed ? '✔' : '○' }}
                    </div>
                  </div>
                </div>

                <!-- ROW 3: AWAY TEAM -->
                <div class="comp-row">
                  <div class="comp-team-cell text-weight-bold">
                    {{ getTeamName(form.awayTeam) }}
                  </div>
                  <div class="comp-days-track">
                    <div
                      v-for="d in matchdayComparison"
                      :key="`a-${d.value}`"
                      class="comp-cell"
                      :class="{
                        'comp-cell--done': d.awayDisputed,
                        'comp-cell--available': !d.homeDisputed && !d.awayDisputed,
                        'comp-cell--blocked': d.homeDisputed && !d.awayDisputed,
                        'comp-cell--selected': d.selected,
                      }"
                    >
                      {{ d.awayDisputed ? '✔' : '○' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- AVAILABLE MATCHDAYS BUTTON SELECTION -->
            <div class="q-mt-md">
              <div class="text-subtitle2 text-weight-bold text-white q-mb-sm">
                Selecciona la Jornada Oficial
              </div>
              <div v-if="availableMatchdays.length" class="available-days-grid">
                <button
                  v-for="day in availableMatchdays"
                  :key="`avail-${day}`"
                  type="button"
                  class="day-card-btn"
                  :class="{ 'day-card-btn--selected': form.matchday === day }"
                  @click="form.matchday = day"
                >
                  <span class="day-card-title">Jornada {{ day }}</span>
                  <span class="day-card-sub">{{ form.matchday === day ? 'Seleccionada ✔' : 'Disponible' }}</span>
                </button>
              </div>
              <div v-else class="text-caption text-negative">
                No hay jornadas libres simultáneamente para estos dos equipos.
              </div>
            </div>
          </div>

          <div v-else-if="form.homeTeam && form.awayTeam && form.homeTeam === form.awayTeam" class="text-caption text-negative">
            El equipo local y el visitante deben ser diferentes.
          </div>

          <!-- SEPARATED FIELDS: FECHA, HORA, CANCHA, ÁRBITRO -->
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.matchDate"
                type="date"
                label="Fecha del Partido *"
                outlined
                required
                stack-label
              >
                <template #prepend>
                  <q-icon name="event" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.matchTime"
                type="time"
                label="Hora del Partido *"
                outlined
                required
                stack-label
              >
                <template #prepend>
                  <q-icon name="schedule" />
                </template>
              </q-input>
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.stadium"
                label="Cancha / Sede"
                placeholder="Cancha Principal"
                outlined
                stack-label
              >
                <template #prepend>
                  <q-icon name="stadium" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.referee"
                label="Árbitro Principal"
                placeholder="Ej: Carlos Silva"
                outlined
                stack-label
              >
                <template #prepend>
                  <q-icon name="sports" />
                </template>
              </q-input>
            </div>
          </div>

          <!-- ACTIONS -->
          <div class="row justify-end q-gutter-sm q-pt-sm">
            <q-btn flat label="Cancelar" color="grey-5" @click="dialog = false" />
            <q-btn
              type="submit"
              label="Guardar y Programar"
              color="primary"
              :loading="saving"
              :disable="!form.matchday || !form.homeTeam || !form.awayTeam || form.homeTeam === form.awayTeam"
            />
          </div>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.matches-page {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Toolbar */
.sports-toolbar {
  background: var(--tb-surface);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 16px 20px;
}

.status-btn-group {
  display: flex;
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 3px;
  overflow-x: auto;
}

.status-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--tb-muted);
  font-size: 0.74rem;
  font-weight: 700;
  padding: 8px 10px;
  border-radius: var(--tb-radius-sm);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.status-btn:hover {
  color: #ffffff;
}

.status-btn--active {
  background: var(--tb-surface);
  color: var(--tb-primary);
  border: 1px solid var(--tb-border);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

/* Horizontal Matchdays Bar */
.matchdays-bar-container {
  background: var(--tb-surface);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 16px 20px;
}

.matchdays-bar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.matchdays-bar-title {
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ffffff;
}

.matchdays-scroll-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.matchday-chip-btn {
  flex-shrink: 0;
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  color: var(--tb-text-secondary);
  font-size: 0.76rem;
  font-weight: 800;
  padding: 6px 14px;
  border-radius: var(--tb-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.matchday-chip-btn:hover {
  border-color: var(--tb-primary);
  color: #ffffff;
}

.matchday-chip-btn--active {
  background: var(--tb-primary) !important;
  border-color: var(--tb-primary) !important;
  color: #0b111e !important;
  box-shadow: 0 0 12px var(--tb-primary-glow);
}

/* ===== MÓDULO JORNADAS DISPUTADAS — REGLA 37 ===== */
.rule37-container {
  background: #161f30;
  border: 1px solid #2a374a;
  border-radius: 12px;
  padding: 24px;
}

.rule37-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.rule37-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  min-width: 46px;
  background: #3b82f6;
  border-radius: 10px;
  color: #ffffff;
  box-shadow: 0 0 16px rgba(59, 130, 246, 0.35);
  flex-shrink: 0;
}

.rule37-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.2;
}

.rule37-subtitle {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 5px;
  line-height: 1.45;
}

/* Tarjeta individual de equipo */
.rule37-team-card {
  background: #0b111e;
  border: 1px solid #2a374a;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.rule37-team-card:hover {
  border-color: #10b981;
  box-shadow: 0 0 18px rgba(16, 185, 129, 0.18);
}

.rule37-card-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rule37-crest-ring {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  min-width: 52px;
  border-radius: 50%;
  border: 2px solid #10b981;
  box-shadow: 0 0 14px rgba(16, 185, 129, 0.3);
  background: #0b111e;
  overflow: hidden;
  padding: 4px;
  box-sizing: border-box;
}

.rule37-crest-ring img {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
}

.rule37-team-info {
  flex: 1;
  min-width: 0;
}

.rule37-team-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rule37-count-block {
  display: flex;
  align-items: baseline;
  gap: 3px;
  flex-shrink: 0;
}

.rule37-count-value {
  font-size: 1.65rem;
  font-weight: 900;
  color: #10b981;
  line-height: 1;
  letter-spacing: -0.02em;
}

.rule37-count-total {
  font-size: 0.85rem;
  font-weight: 700;
  color: #64748b;
}

.rule37-card-footer {
  border-top: 1px solid #2a374a;
  padding-top: 10px;
}

.rule37-footer-text {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 500;
}


/* Matchday Groups */
.matchday-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: var(--tb-surface);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  margin-bottom: 16px;
}

.matchday-header-badge {
  font-size: 0.84rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: var(--tb-primary);
  text-transform: uppercase;
}

.matchday-matches-count {
  font-size: 0.8rem;
  color: var(--tb-muted);
  font-weight: 600;
  margin-inline: 15px;
}

/* Modal Dialog */
.schedule-dialog-card {
  width: 94vw;
  max-width: 780px;
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-lg);
  color: #ffffff;
}

.dialog-header-section {
  border-bottom: 1px solid var(--tb-border);
  padding: 20px 24px;
}

.comparison-block {
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 16px;
}

.comparison-table-wrapper {
  overflow-x: auto;
}

.comp-matrix-table {
  min-width: 900px;
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-sm);
  background: var(--tb-surface);
  overflow: hidden;
}

.comp-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  align-items: stretch;
  border-bottom: 1px solid var(--tb-border);
}

.comp-row:last-child {
  border-bottom: none;
}

.comp-row--head {
  background: var(--tb-surface-raised);
}

.comp-team-cell {
  padding: 10px 14px;
  font-size: 0.8rem;
  color: #ffffff;
  display: flex;
  align-items: center;
  border-right: 1px solid var(--tb-border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.comp-days-track {
  display: grid;
  grid-template-columns: repeat(38, minmax(42px, 1fr));
}

.comp-day-head {
  padding: 8px 4px;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--tb-muted);
  border-right: 1px solid var(--tb-border);
}

.comp-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  border-right: 1px solid var(--tb-border);
  min-height: 40px;
  color: var(--tb-muted);
}

.comp-cell--done {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.comp-cell--available {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.comp-cell--blocked {
  background: rgba(15, 23, 42, 0.7);
  color: #64748b;
}

.comp-cell--selected {
  background: var(--tb-primary) !important;
  color: #0b111e !important;
}

/* Available Days Grid */
.available-days-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
}

.day-card-btn {
  background: var(--tb-surface);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-sm);
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.day-card-btn:hover {
  border-color: var(--tb-primary);
  background: var(--tb-surface-hover);
}

.day-card-btn--selected {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  border-color: #10b981 !important;
}

.day-card-title {
  font-size: 0.85rem;
  font-weight: 800;
  color: #ffffff;
}

.day-card-btn--selected .day-card-title {
  color: #0b111e;
}

.day-card-sub {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--tb-muted);
  margin-top: 2px;
}

.day-card-btn--selected .day-card-sub {
  color: #0b111e;
}
</style>
