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
  shortName: '',
  stadium: 'Cancha Local',
  logoUrl: '',
})

const filteredTeams = computed(() => {
  const value = search.value.trim().toLowerCase()

  if (!value) {
    return store.teams
  }

  return store.teams.filter((team) => {
    return `${team.name} ${team.shortName}`.toLowerCase().includes(value)
  })
})

const resetForm = () => {
  Object.assign(form, {
    name: '',
    shortName: '',
    stadium: 'Cancha Local',
    logoUrl: '',
  })
  editingId.value = null
}

const openCreateDialog = () => {
  resetForm()
  dialog.value = true
}

const openEditDialog = (team) => {
  Object.assign(form, {
    name: team.name,
    shortName: team.shortName,
    stadium: team.stadium || 'Cancha Local',
    logoUrl: team.logoUrl || '',
  })
  editingId.value = team._id
  dialog.value = true
}

const closeDialog = () => {
  dialog.value = false
  resetForm()
}

const saveTeam = async () => {
  saving.value = true

  try {
    const payload = { ...form, logoUrl: form.logoUrl.trim() }
    let savedTeam

    if (editingId.value) {
      savedTeam = await store.updateTeam(editingId.value, payload)
    } else {
      savedTeam = await store.createTeam(payload)
    }

    if (savedTeam.logoUrl !== payload.logoUrl) {
      throw new Error('La API no confirmó la URL del escudo. Revisa la respuesta del servidor.')
    }

    closeDialog()
    $q.notify({ type: 'positive', message: 'Equipo guardado correctamente.' })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || error.message || 'No se pudo guardar el equipo.',
    })
  } finally {
    saving.value = false
  }
}

const removeTeam = async (teamId) => {
  await store.deleteTeam(teamId)
}

onMounted(async () => {
  await store.fetchTeams()
})
</script>

<template>
  <div>
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <p class="text-caption text-uppercase text-grey-7 q-mb-xs">Gestión</p>
        <h1 class="text-h4 text-weight-bold q-ma-none">Equipos</h1>
      </div>

      <q-btn color="primary" icon="add" label="Nuevo equipo" @click="openCreateDialog" />
    </div>

    <q-card flat bordered>
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-input v-model="search" dense outlined clearable label="Buscar equipo" />
        </div>
      </q-card-section>

      <q-table
        :rows="filteredTeams"
        :columns="[
          { name: 'name', label: 'Equipo', field: 'name', align: 'left', sortable: true },
          { name: 'shortName', label: 'Sigla', field: 'shortName', align: 'center', sortable: true },
          { name: 'stadium', label: 'Estadio', field: 'stadium', align: 'left', sortable: true },
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
                :src="props.row.logoUrl"
                fallback="/images/default-team.svg"
                :alt="`Escudo de ${props.row.name}`"
                width="40px"
                height="40px"
                show-error
                class="q-mr-sm"
              />
              <div>
                <div class="text-weight-medium">{{ props.row.name }}</div>
                <div class="text-caption text-grey-7">{{ props.row.shortName }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense icon="visibility" color="primary" :to="`/equipos/${props.row._id}`" />
            <q-btn flat round dense icon="edit" color="secondary" @click="openEditDialog(props.row)" />
            <q-btn flat round dense icon="delete" color="negative" @click="removeTeam(props.row._id)" />
          </q-td>
        </template>
      </q-table>

      <div v-if="!filteredTeams.length" class="q-pa-md text-grey-7">
        No se encontraron equipos con ese criterio de búsqueda.
      </div>
    </q-card>

    <q-dialog v-model="dialog" persistent>
      <q-card style="max-width: 560px; width: 92vw">
        <q-card-section>
          <div class="text-h6">{{ editingId ? 'Editar equipo' : 'Nuevo equipo' }}</div>
        </q-card-section>

        <q-form @submit.prevent="saveTeam" class="q-gutter-md q-pa-md">
          <q-input v-model="form.name" label="Nombre del equipo" outlined />
          <q-input v-model="form.shortName" label="Sigla" outlined maxlength="4" />
          <q-input v-model="form.stadium" label="Estadio" outlined />
          <q-input
            v-model="form.logoUrl"
            label="URL directa del escudo"
            type="url"
            outlined
            :rules="imageUrlRules"
            hint="Debe ser un enlace directo a una imagen accesible."
          />
          <ImagePreview
            :src="form.logoUrl"
            fallback="/images/default-team.svg"
            :alt="form.name ? `Vista previa del escudo de ${form.name}` : 'Vista previa del escudo'"
            height="150px"
            show-status
            class="team-form-preview"
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
.team-form-preview {
  align-items: center;
}
</style>
