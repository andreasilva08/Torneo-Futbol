<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useTournamentStore } from '@/stores/tournament'
import ImagePreview from '@/components/ImagePreview.vue'
import { isOptionalImageUrl } from '@/utils/imageUrl'

const store = useTournamentStore()
const $q = useQuasar()
const search = ref('')
const dialog = ref(false)
const editingId = ref(null)
const saving = ref(false)
const imageUrlRules = [
  (value) => isOptionalImageUrl(value) || 'Usa una URL completa http:// o https:// que apunte a una imagen.',
]

const form = reactive({
  name: '',
  number: null,
  position: 'Delantero',
  team: '',
  photoUrl: '',
})

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
}

const savePlayer = async () => {
  if (!form.team) {
    $q.notify({ type: 'warning', message: 'Selecciona el equipo al que pertenece el jugador.' })
    return
  }

  saving.value = true
  const payload = {
    ...form,
    number: Number(form.number),
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

const removePlayer = async (playerId) => {
  await store.deletePlayer(playerId)
}

onMounted(async () => {
  await Promise.all([store.fetchTeams(), store.fetchPlayers()])
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
                <div class="text-caption text-grey-7">{{ props.row.position }}</div>
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
            <q-btn flat round dense icon="delete" color="negative" @click="removePlayer(props.row._id)" />
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
          <div class="text-h6">{{ editingId ? 'Editar jugador' : 'Nuevo jugador' }}</div>
        </q-card-section>

        <q-form @submit.prevent="savePlayer" class="q-gutter-md q-pa-md">
          <q-input v-model="form.name" label="Nombre" outlined />
          <q-input v-model.number="form.number" type="number" label="Número" outlined />
          <q-select v-model="form.position" :options="['Portero', 'Defensa', 'Mediocampista', 'Delantero']" label="Posición" outlined />
          <q-select v-model="form.team" :options="store.teams.map((team) => ({ label: team.name, value: team._id }))" emit-value map-options label="Equipo" outlined />
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
</style>
