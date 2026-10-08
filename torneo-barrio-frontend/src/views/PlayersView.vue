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
const dialog = ref(false)
const editingId = ref(null)
const saving = ref(false)
const positionOptions = ['Portero', 'Defensa', 'Mediocampista', 'Delantero']
const numberOptions = Array.from({ length: 99 }, (_, index) => index + 1)
const imageUrlRules = [
  (value) => isOptionalImageUrl(value) || 'Si la URL no es válida, se usará la imagen por defecto.',
]

const positionColor = (position) => {
  if (position === 'Portero') return 'warning'
  if (position === 'Defensa') return 'secondary'
  if (position === 'Delantero') return 'positive'
  return 'info'
}

const form = reactive({
  name: '',
  number: null,
  position: 'Delantero',
  team: '',
  photoUrl: '',
})

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
  const value = search.value.trim().toLowerCase()

  if (!value) {
    return store.players
  }

  return store.players.filter((player) => {
    return `${player.name} ${player.position} ${player.team?.name || ''}`.toLowerCase().includes(value)
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
      color: 'grey-7',
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
    if (!teamId) {
      return
    }

    const teamExists = store.teams.some((team) => team._id === teamId)
    if (!teamExists) {
      return
    }

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
  <div>
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <p class="text-caption text-uppercase text-grey-7 q-mb-xs">Plantilla</p>
        <h1 class="text-h4 text-weight-bold q-ma-none">Jugadores</h1>
      </div>

      <q-btn color="primary" icon="add" label="Nuevo jugador" @click="openCreateDialog" />
    </div>

    <q-card flat bordered>
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-input v-model="search" dense outlined clearable label="Buscar jugador" />
        </div>
      </q-card-section>

      <q-table
        :rows="filteredPlayers"
        :columns="[
          { name: 'name', label: 'Nombre', field: 'name', align: 'left', sortable: true },
          { name: 'team', label: 'Equipo', field: 'team', align: 'left', sortable: true },
          { name: 'number', label: 'Dorsal', field: 'number', align: 'center', sortable: true },
          { name: 'position', label: 'Posición', field: 'position', align: 'left', sortable: true },
          { name: 'actions', label: 'Acciones', field: 'actions', align: 'right' },
        ]"
        row-key="_id"
        flat
        hide-pagination
      >
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <ImagePreview
                :src="props.row.photoUrl"
                fallback="/images/default-player.svg"
                :alt="`Fotografía de ${props.row.name}`"
                width="40px"
                height="40px"
                show-error
                class="q-mr-sm"
              />
              <div>
                <div class="text-weight-medium">{{ props.row.name }}</div>
                <q-chip dense size="sm" :color="positionColor(props.row.position)" text-color="white">
                  {{ props.row.position }}
                </q-chip>
              </div>
            </div>
          </q-td>
        </template>

        <template #body-cell-team="props">
          <q-td :props="props">
            {{ props.row.team?.name || 'Sin equipo' }}
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense icon="edit" color="secondary" @click="openEditDialog(props.row)" />
            <q-btn flat round dense icon="delete" color="negative" @click="removePlayer(props.row._id, props.row.name)" />
          </q-td>
        </template>
      </q-table>

      <div v-if="!filteredPlayers.length" class="q-pa-md text-grey-7">
        No hay jugadores registrados para este filtro.
      </div>
    </q-card>

    <q-dialog v-model="dialog" persistent>
      <q-card style="max-width: 560px; width: 92vw">
        <q-card-section>
          <div class="row items-center q-gutter-sm">
            <q-icon name="sports_soccer" color="positive" size="1.5rem" />
            <div class="text-h6">{{ editingId ? 'Editar jugador' : 'Nuevo jugador' }}</div>
          </div>
        </q-card-section>

        <q-form @submit.prevent="savePlayer" class="q-gutter-md q-pa-md">
          <q-input v-model="form.name" label="Nombre" outlined />

          <div>
            <div class="text-subtitle2 text-weight-medium q-mb-sm">Equipo</div>
            <div class="selector-grid team-grid">
              <button
                v-for="teamOption in teamOptions"
                :key="teamOption.value"
                type="button"
                class="selector-card team-card"
                :class="{ 'selector-card--selected': form.team === teamOption.value }"
                @click="form.team = teamOption.value"
              >
                <img :src="teamOption.logoUrl" :alt="teamOption.label" class="selector-card__crest" />
                <span>{{ teamOption.label }}</span>
              </button>
            </div>
          </div>

          <div>
            <div class="text-subtitle2 text-weight-medium q-mb-sm">Posición</div>
            <div class="selector-grid position-grid">
              <button
                v-for="positionOption in positionOptions"
                :key="positionOption"
                type="button"
                class="selector-card"
                :class="{ 'selector-card--selected': form.position === positionOption }"
                @click="form.position = positionOption"
              >
                {{ positionOption }}
              </button>
            </div>
          </div>

          <div>
            <div class="text-subtitle2 text-weight-medium q-mb-sm">Número</div>
            <div class="selector-grid number-grid">
              <button
                v-for="numberOption in numberOptionsList"
                :key="numberOption.value"
                type="button"
                class="selector-card number-card"
                :class="{
                  'selector-card--selected': numberOption.selected,
                  'selector-card--disabled': numberOption.disabled,
                }"
                :disabled="numberOption.disabled"
                @click="form.number = numberOption.value"
              >
                {{ numberOption.value }}
              </button>
            </div>
          </div>

          <q-input
            v-model="form.photoUrl"
            label="URL directa de la fotografía"
            type="url"
            outlined
            :rules="imageUrlRules"
            hint="Debe ser un enlace directo a una imagen accesible."
          />
          <ImagePreview
            :src="form.photoUrl"
            fallback="/images/default-player.svg"
            :alt="form.name ? `Vista previa de ${form.name}` : 'Vista previa del jugador'"
            height="150px"
            show-status
            class="player-form-preview"
          />

          <div class="row justify-end q-gutter-sm">
            <q-btn flat label="Cancelar" color="grey-7" @click="closeDialog" />
            <q-btn type="submit" label="Guardar" color="primary" :loading="saving" :disable="saving" />
          </div>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.player-form-preview {
  align-items: center;
}

.selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(74px, 1fr));
  gap: 8px;
}

.selector-card {
  border: 1px solid #dfe7e1;
  border-radius: 12px;
  background: #f6faf8;
  color: #213329;
  min-height: 52px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.18s ease;
}

.selector-card:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #a7d2b8;
  box-shadow: 0 8px 18px rgba(13, 56, 37, 0.08);
}

.selector-card--selected {
  border-color: #1f9d68;
  background: linear-gradient(135deg, #ecfdf5 0%, #d8f4e7 100%);
  box-shadow: 0 8px 18px rgba(31, 157, 104, 0.12);
}

.selector-card--disabled {
  cursor: not-allowed;
  opacity: 0.55;
  background: #f3f4f6;
  border-color: #d1d5db;
}

.team-card {
  flex-direction: column;
  gap: 6px;
  min-height: 82px;
  padding: 10px 8px;
}

.number-card {
  font-weight: 700;
}

.selector-card__crest {
  width: 28px;
  height: 28px;
  object-fit: contain;
  border-radius: 8px;
}
</style>
