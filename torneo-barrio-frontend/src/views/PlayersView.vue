<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentStore } from '@/stores/tournament'
import ImagePreview from '@/components/ImagePreview.vue'
import { isOptionalImageUrl } from '@/utils/imageUrl'

const store = useTournamentStore()
const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const search = ref('')
const teamFilter = ref('ALL')
const positionFilter = ref('ALL')
const dialog = ref(false)
const editingId = ref(null)
const saving = ref(false)

const positionOptions = ['Portero', 'Defensa', 'Mediocampista', 'Delantero']
const numberOptions = Array.from({ length: 99 }, (_, index) => index + 1)
const imageUrlRules = [
  (value) => isOptionalImageUrl(value) || 'Si la URL no es válida, se usará la imagen por defecto.',
]

const form = reactive({
  name: '',
  number: null,
  position: 'Delantero',
  team: '',
  photoUrl: '',
})

const teamFilterOptions = computed(() => [
  { label: '🛡 Todos los equipos', value: 'ALL' },
  ...store.teams.map((team) => ({
    label: `🛡 ${team.name}`,
    value: team._id,
  })),
])

const positionFilterOptions = [
  { label: '🎷 Todas las posiciones', value: 'ALL' },
  { label: '🧤 Portero', value: 'Portero' },
  { label: '🛡 Defensa', value: 'Defensa' },
  { label: '⚙ Mediocampista', value: 'Mediocampista' },
  { label: '⚡ Delantero', value: 'Delantero' },
]

const positionIcon = (position) => {
  if (position === 'Portero') return 'sports_handball'
  if (position === 'Defensa') return 'shield'
  if (position === 'Delantero') return 'bolt'
  return 'settings'
}

const teamOptions = computed(() => store.teams.map((team) => ({
  label: team.name,
  value: team._id,
  logoUrl: team.logoUrl || '/images/default-team.svg',
})))

const occupiedNumbersByTeam = computed(() => {
  const teamId = form.team
  if (!teamId) return new Set()

  return new Set(
    store.players
      .filter((player) => {
        const playerTeamId = typeof player.team === 'object' ? player.team?._id : player.team
        return playerTeamId === teamId && (!editingId.value || player._id !== editingId.value)
      })
      .map((player) => Number(player.number))
      .filter((value) => Number.isInteger(value))
  )
})

const numberOptionsList = computed(() => numberOptions.map((value) => ({
  value,
  selected: Number(form.number) === value,
  disabled: occupiedNumbersByTeam.value.has(value),
})))

const filteredPlayers = computed(() => {
  const query = search.value.trim().toLowerCase()

  return store.players.filter((player) => {
    const playerTeamId = typeof player.team === 'object' ? player.team?._id : player.team
    const matchesSearch = !query || `${player.name} ${player.position} ${player.team?.name || ''}`.toLowerCase().includes(query)
    const matchesTeam = teamFilter.value === 'ALL' || playerTeamId === teamFilter.value
    const matchesPos = positionFilter.value === 'ALL' || player.position === positionFilter.value

    return matchesSearch && matchesTeam && matchesPos
  })
})

const resetForm = () => {
  Object.assign(form, {
    name: '',
    number: null,
    position: 'Delantero',
    team: '',
    photoUrl: '',
  })
  editingId.value = null
}

const openCreateDialog = () => {
  resetForm()
  if (store.teams.length) {
    form.team = store.teams[0]._id
  }
  dialog.value = true
}

const openEditDialog = (player) => {
  Object.assign(form, {
    name: player.name,
    number: player.number,
    position: player.position,
    team: player.team?._id || player.team || '',
    photoUrl: player.photoUrl || '',
  })
  editingId.value = player._id
  dialog.value = true
}

const closeDialog = () => {
  dialog.value = false
  resetForm()

  if (route.query.teamId) {
    router.replace({ name: 'players', query: {} })
  }
}

const savePlayer = async () => {
  if (!form.team) {
    $q.notify({ type: 'warning', message: 'Selecciona el equipo al que pertenece el jugador.' })
    return
  }

  saving.value = true
  const nextNumber = Number(form.number)

  if (!Number.isInteger(nextNumber) || nextNumber < 1 || nextNumber > 99) {
    $q.notify({ type: 'warning', message: 'El número de camiseta debe estar entre 1 y 99.' })
    return
  }

  if (occupiedNumbersByTeam.value.has(nextNumber)) {
    $q.notify({ type: 'warning', message: 'Ese número ya está asignado a otro jugador de este equipo.' })
    return
  }

  const payload = {
    ...form,
    number: nextNumber,
    photoUrl: form.photoUrl.trim(),
  }

  try {
    const savedPlayer = editingId.value
      ? await store.updatePlayer(editingId.value, payload)
      : await store.createPlayer(payload)

    if (savedPlayer.photoUrl !== payload.photoUrl) {
      throw new Error('La API no confirmó la URL de la fotografía. Revisa la respuesta del servidor.')
    }

    closeDialog()
    $q.notify({ type: 'positive', message: 'Jugador guardado correctamente.' })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || error.message || 'No se pudo guardar el jugador.',
    })
  } finally {
    saving.value = false
  }
}

const removePlayer = async (playerId, playerName) => {
  $q.dialog({
    title: 'Confirmar eliminación',
    message: `¿Estás seguro de que deseas eliminar a ${playerName}?\n\nEsta acción no se puede deshacer.`,
    cancel: true,
    persistent: true,
    ok: {
      label: 'Eliminar',
      color: 'negative',
    },
    cancel: {
      label: 'Cancelar',
      color: 'grey-5',
      flat: true,
    },
  }).onOk(async () => {
    try {
      await store.deletePlayer(playerId)
      $q.notify({ type: 'positive', message: 'Jugador eliminado correctamente.' })
    } catch (error) {
      $q.notify({ type: 'negative', message: error.response?.data?.message || 'No se pudo eliminar el jugador.' })
    }
  })
}

watch(
  () => route.query.teamId,
  (teamId) => {
    if (!teamId) return
    const teamExists = store.teams.some((team) => team._id === teamId)
    if (!teamExists) return

    resetForm()
    form.team = teamId
    dialog.value = true
  },
  { immediate: true }
)

onMounted(async () => {
  await Promise.all([store.fetchTeams(), store.fetchPlayers()])

  if (route.query.teamId && store.teams.some((team) => team._id === route.query.teamId)) {
    resetForm()
    form.team = route.query.teamId
    dialog.value = true
  }
})
</script>

<template>
  <div class="players-page">
    <!-- PAGE HEADER -->
    <div class="sport-page-header">
      <div class="sport-page-header__left">
        <div class="sport-page-header__icon-box">
          <q-icon name="sports_soccer" />
        </div>
        <div>
          <div class="sport-page-header__eyebrow">PLANTILLAS Y REGISTRO · TEMPORADA 2026</div>
          <h1 class="sport-page-header__title">Listado de Jugadores</h1>
        </div>
      </div>

      <q-btn
        unelevated
        color="primary"
        icon="person_add"
        label="Nuevo Jugador"
        @click="openCreateDialog"
      />
    </div>

    <!-- INTEGRATED FILTER TOOLBAR -->
    <div class="sports-toolbar q-mb-xl">
      <div class="row q-col-gutter-md items-center">
        <!-- FILTER BY TEAM -->
        <div class="col-12 col-md-4">
          <q-select
            v-model="teamFilter"
            :options="teamFilterOptions"
            emit-value
            map-options
            outlined
            dense
            label="Filtrar por Equipo"
          >
            <template #prepend>
              <q-icon name="shield" color="primary" />
            </template>
          </q-select>
        </div>

        <!-- FILTER BY POSITION -->
        <div class="col-12 col-md-4">
          <q-select
            v-model="positionFilter"
            :options="positionFilterOptions"
            emit-value
            map-options
            outlined
            dense
            label="Filtrar por Posición"
          >
            <template #prepend>
              <q-icon name="sports" color="secondary" />
            </template>
          </q-select>
        </div>

        <!-- SEARCH BY NAME -->
        <div class="col-12 col-md-4">
          <q-input
            v-model="search"
            dense
            outlined
            clearable
            label="Buscar por nombre..."
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
      </div>
    </div>

    <!-- PLAYERS TABLE WITH PILL-STYLE ROWS -->
    <q-card flat class="sports-panel-card">
      <q-table
        :rows="filteredPlayers"
        :columns="[
          { name: 'number', label: 'DORSAL', field: 'number', align: 'center', sortable: true },
          { name: 'player', label: 'JUGADOR', field: 'name', align: 'left', sortable: true },
          { name: 'position', label: 'POSICIÓN', field: 'position', align: 'left', sortable: true },
          { name: 'team', label: 'EQUIPO', field: 'team', align: 'left', sortable: true },
          { name: 'status', label: 'CONDICIÓN', field: 'status', align: 'center' },
          { name: 'actions', label: 'ACCIONES', field: 'actions', align: 'right' },
        ]"
        row-key="_id"
        flat
        hide-pagination
        class="players-pill-table"
      >
        <!-- DORSAL (BLUE BOX) -->
        <template #body-cell-number="props">
          <q-td :props="props" class="text-center">
            <span class="dorsal-blue-box">
              {{ props.row.number }}
            </span>
          </q-td>
        </template>

        <!-- PLAYER NAME & AVATAR -->
        <template #body-cell-player="props">
          <q-td :props="props">
            <div class="row items-center no-wrap gap-md">
              <div class="sport-crest-container player-avatar-pill">
                <ImagePreview
                  :src="props.row.photoUrl"
                  fallback="/images/default-player.svg"
                  :alt="`Foto de ${props.row.name}`"
                  width="36px"
                  height="36px"
                />
              </div>
              <div class="player-name-bold">{{ props.row.name }}</div>
            </div>
          </q-td>
        </template>

        <!-- POSITION (NEON GREEN WITH ICON) -->
        <template #body-cell-position="props">
          <q-td :props="props">
            <div class="position-neon-tag">
              <q-icon :name="positionIcon(props.row.position)" size="15px" class="q-mr-xs" />
              <span>{{ props.row.position }}</span>
            </div>
          </q-td>
        </template>

        <!-- TEAM (CIRCULAR BADGE + NAME) -->
        <template #body-cell-team="props">
          <q-td :props="props">
            <div class="team-badge-pill">
              <div class="sport-crest-container team-pill-crest">
                <ImagePreview
                  :src="props.row.team?.logoUrl"
                  fallback="/images/default-team.svg"
                  :alt="props.row.team?.name || 'Equipo'"
                  width="20px"
                  height="20px"
                />
              </div>
              <span class="team-pill-name">{{ props.row.team?.name || 'sin equipo' }}</span>
            </div>
          </q-td>
        </template>

        <!-- CONDICION (NEON TITULAR CHIP) -->
        <template #body-cell-status="props">
          <q-td :props="props" class="text-center">
            <span class="condicion-neon-chip">
              TITULAR
            </span>
          </q-td>
        </template>

        <!-- ACCIONES (BLUE PENCIL & RED TRASH) -->
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn
              flat
              round
              dense
              icon="edit"
              color="secondary"
              @click="openEditDialog(props.row)"
              aria-label="Editar jugador"
              class="q-mr-xs"
            >
              <q-tooltip>Editar Jugador</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              icon="delete"
              color="negative"
              @click="removePlayer(props.row._id, props.row.name)"
              aria-label="Eliminar jugador"
            >
              <q-tooltip>Eliminar Jugador</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <div v-if="!filteredPlayers.length" class="text-caption text-grey-5 text-center q-pa-xl">
        No se encontraron jugadores para los filtros seleccionados.
      </div>
    </q-card>

    <!-- CREATE/EDIT PLAYER MODAL DIALOG -->
    <q-dialog v-model="dialog" persistent>
      <q-card style="max-width: 640px; width: 94vw;">
        <!-- DIALOG HEADER -->
        <q-card-section class="dialog-header-section">
          <div class="row items-center justify-between">
            <div class="row items-center gap-sm">
              <div class="header-logo-badge">
                <q-icon name="sports_soccer" size="22px" />
              </div>
              <div>
                <div class="text-h6 text-weight-bold">{{ editingId ? 'Editar Jugador' : 'Nuevo Jugador' }}</div>
                <div class="text-caption text-grey-5">Ficha técnica y dorsal en el plantel</div>
              </div>
            </div>
            <q-btn flat round dense icon="close" color="grey-5" @click="closeDialog" />
          </div>
        </q-card-section>

        <q-form @submit.prevent="savePlayer" class="q-pa-lg q-gutter-y-lg">
          <q-input v-model="form.name" label="Nombre Completo del Jugador *" outlined required />

          <!-- TEAM SELECTOR -->
          <div>
            <div class="text-subtitle2 text-weight-bold q-mb-xs text-white">Equipo Asignado</div>
            <div class="selector-grid team-selector-grid">
              <button
                v-for="teamOption in teamOptions"
                :key="teamOption.value"
                type="button"
                class="selector-card team-select-card"
                :class="{ 'selector-card--selected': form.team === teamOption.value }"
                @click="form.team = teamOption.value"
              >
                <div class="sport-crest-container" style="width: 32px; height: 32px;">
                  <img :src="teamOption.logoUrl" :alt="teamOption.label" style="width: 28px; height: 28px; border-radius: 50%; object-fit: contain;" />
                </div>
                <span class="team-select-label">{{ teamOption.label }}</span>
              </button>
            </div>
          </div>

          <!-- POSITION SELECTOR -->
          <div>
            <div class="text-subtitle2 text-weight-bold q-mb-xs text-white">Posición en el Campo</div>
            <div class="selector-grid position-selector-grid">
              <button
                v-for="pos in positionOptions"
                :key="pos"
                type="button"
                class="selector-card pos-select-card"
                :class="{ 'selector-card--selected': form.position === pos }"
                @click="form.position = pos"
              >
                {{ pos }}
              </button>
            </div>
          </div>

          <!-- JERSEY NUMBER SELECTOR -->
          <div>
            <div class="row items-center justify-between q-mb-xs">
              <div class="text-subtitle2 text-weight-bold text-white">Número de Camiseta (1 al 99)</div>
              <div class="text-caption text-grey-5">
                Dorsal: <strong class="text-primary">{{ form.number ? '#' + form.number : 'Por elegir' }}</strong>
              </div>
            </div>

            <div class="number-selector-scroll">
              <button
                v-for="numItem in numberOptionsList"
                :key="numItem.value"
                type="button"
                class="num-select-btn"
                :class="{
                  'num-select-btn--selected': numItem.selected,
                  'num-select-btn--disabled': numItem.disabled,
                }"
                :disabled="numItem.disabled"
                @click="form.number = numItem.value"
              >
                {{ numItem.value }}
              </button>
            </div>
          </div>

          <!-- PHOTO URL & PREVIEW -->
          <q-input
            v-model="form.photoUrl"
            label="URL Directa de Fotografía (Opcional)"
            type="url"
            outlined
            :rules="imageUrlRules"
            hint="Enlace directo a una imagen accesible."
          />

          <div class="row justify-center q-my-sm">
            <div class="sport-crest-container" style="width: 80px; height: 80px;">
              <ImagePreview
                :src="form.photoUrl"
                fallback="/images/default-player.svg"
                :alt="form.name ? `Foto de ${form.name}` : 'Foto de jugador'"
                width="72px"
                height="72px"
                show-status
              />
            </div>
          </div>

          <!-- ACTIONS -->
          <div class="row justify-end q-gutter-sm q-pt-md">
            <q-btn flat label="Cancelar" color="grey-5" @click="closeDialog" />
            <q-btn
              type="submit"
              label="Guardar Jugador"
              color="primary"
              :loading="saving"
              :disable="saving || !form.team || !form.number"
            />
          </div>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.players-page {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.sports-toolbar {
  background: var(--tb-surface);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 16px 20px;
}

.sports-panel-card {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-md) !important;
  overflow: hidden;
}

.players-pill-table :deep(thead th) {
  background: var(--tb-surface-raised) !important;
  color: var(--tb-muted) !important;
  font-size: 0.8rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  padding: 14px 16px !important;
}

.players-pill-table :deep(tbody tr) {
  height: 66px;
}

.players-pill-table :deep(tbody tr:nth-child(even)) {
  background: rgba(30, 41, 59, 0.4) !important;
}

.players-pill-table :deep(tbody tr:hover) {
  background: rgba(16, 185, 129, 0.08) !important;
}

/* Dorsal Blue Box */
.dorsal-blue-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 900;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
}

.player-avatar-pill {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.player-name-bold {
  font-size: 1rem;
  font-weight: 800;
  color: #ffffff;
}

/* Neon Green Position */
.position-neon-tag {
  display: inline-flex;
  align-items: center;
  color: #10b981;
  font-size: 0.86rem;
  font-weight: 800;
}

/* Team Badge Pill */
.team-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  padding: 4px 12px 4px 6px;
  border-radius: 9999px;
}

.team-pill-crest {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
}

.team-pill-name {
  font-size: 0.86rem;
  font-weight: 700;
  color: #ffffff;
}

/* Condicion Neon Chip */
.condicion-neon-chip {
  display: inline-flex;
  align-items: center;
  background: rgba(34, 197, 94, 0.18);
  border: 1px solid rgba(34, 197, 94, 0.45);
  color: #22c55e;
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  padding: 4px 12px;
  border-radius: 6px;
}

/* Modal Form Styles */
.dialog-header-section {
  border-bottom: 1px solid var(--tb-border);
  padding: 18px 22px;
}

.selector-grid {
  display: grid;
  gap: 8px;
}

.team-selector-grid {
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
}

.position-selector-grid {
  grid-template-columns: repeat(4, 1fr);
}

.selector-card {
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
  transition: all 0.15s ease;
}

.selector-card:hover {
  background: var(--tb-surface-hover);
  border-color: var(--tb-primary);
}

.selector-card--selected {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  border-color: #10b981 !important;
  color: #0b111e !important;
  box-shadow: 0 0 12px var(--tb-primary-glow);
}

.team-select-card {
  flex-direction: column;
  gap: 6px;
  padding: 12px 8px;
  text-align: center;
}

.team-select-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.pos-select-card {
  padding: 10px 8px;
}

/* Number selector scroll */
.number-selector-scroll {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
  padding: 6px;
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
}

.num-select-btn {
  height: 38px;
  background: var(--tb-surface);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-sm);
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.num-select-btn:hover:not(:disabled) {
  border-color: var(--tb-primary);
  background: var(--tb-surface-hover);
}

.num-select-btn--selected {
  background: #10b981 !important;
  border-color: #10b981 !important;
  color: #0b111e !important;
  box-shadow: 0 0 8px var(--tb-primary-glow);
}

.num-select-btn--disabled {
  opacity: 0.25;
  cursor: not-allowed;
  background: #0b111e;
  border-color: transparent;
  color: #64748b;
}

@media (max-width: 600px) {
  .position-selector-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
