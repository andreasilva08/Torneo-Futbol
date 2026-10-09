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
const viewMode = ref('grid') // 'grid' | 'table'

const imageUrlRules = [
  (value) => isOptionalImageUrl(value) || 'Si la URL no es válida, se usará el escudo por defecto.',
]

const form = reactive({
  name: '',
  shortName: '',
  stadium: 'Cancha Local',
  coach: '',
  neighborhood: '',
  foundationYear: 2026,
  primaryColor: '#15803d',
  secondaryColor: '#facc15',
  description: '',
  logoUrl: '',
})

// Contar jugadores de un equipo de forma segura (por ID o por Nombre)
const getTeamPlayerCount = (teamId) => {
  if (!store.players || store.players.length === 0) return 0

  const targetId = String(teamId)
  
  // Buscar el objeto del equipo en el store para obtener su nombre oficial
  const targetTeamObj = store.teams.find((t) => String(t._id || t.id || '') === targetId)
  const targetName = targetTeamObj 
    ? String(targetTeamObj.name || targetTeamObj.nombre || '').toLowerCase().trim() 
    : ''

  return store.players.filter((player) => {
    // Extraer equipo del jugador (sea objeto, ID o texto en 'team', 'equipo' o 'teamId')
    const rawTeam = player.team || player.equipo || player.teamId
    let pId = ''
    let pName = ''

    if (rawTeam && typeof rawTeam === 'object') {
      pId = String(rawTeam._id || rawTeam.id || '')
      pName = String(rawTeam.name || rawTeam.nombre || '').toLowerCase().trim()
    } else if (rawTeam) {
      pId = String(rawTeam)
      pName = String(rawTeam).toLowerCase().trim()
    }

    // Cuenta al jugador si coincide por ID o por Nombre del club
    return (
      (targetId && pId === targetId) ||
      (targetName && pName === targetName)
    )
  }).length
}

const getTeamStandings = (teamId) => {
  return store.standings.find((s) => s._id === teamId) || null
}

const filteredTeams = computed(() => {
  const value = search.value.trim().toLowerCase()

  if (!value) {
    return store.teams
  }

  return store.teams.filter((team) => {
    return `${team.name} ${team.shortName || ''} ${team.stadium || ''} ${team.coach || ''} ${team.neighborhood || ''}`.toLowerCase().includes(value)
  })
})

const resetForm = () => {
  Object.assign(form, {
    name: '',
    shortName: '',
    stadium: 'Cancha Local',
    coach: '',
    neighborhood: '',
    foundationYear: 2026,
    primaryColor: '#15803d',
    secondaryColor: '#facc15',
    description: '',
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
    shortName: team.shortName || team.name?.substring(0, 4).toUpperCase(),
    stadium: team.stadium || 'Cancha Local',
    coach: team.coach || '',
    neighborhood: team.neighborhood || '',
    foundationYear: team.foundationYear || 2026,
    primaryColor: team.primaryColor || '#15803d',
    secondaryColor: team.secondaryColor || '#facc15',
    description: team.description || '',
    logoUrl: team.logoUrl || '',
  })
  editingId.value = team._id
  dialog.value = true
}

const closeDialog = () => {
  dialog.value = false
  resetForm()
}

const autoGenerateShortName = (name) => {
  if (!name) return 'CLUB'
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0] + (words[2] ? words[2][0] : '')).toUpperCase().substring(0, 4)
  }
  return name.trim().substring(0, 4).toUpperCase()
}

const saveTeam = async () => {
  if (!form.name.trim()) {
    $q.notify({ type: 'warning', message: 'El nombre del equipo es obligatorio.' })
    return
  }

  saving.value = true

  try {
    const payload = {
      ...form,
      shortName: form.shortName.trim() || autoGenerateShortName(form.name),
      logoUrl: form.logoUrl.trim(),
    }
    let savedTeam

    if (editingId.value) {
      savedTeam = await store.updateTeam(editingId.value, payload)
    } else {
      savedTeam = await store.createTeam(payload)
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

const removeTeam = async (teamId, teamName) => {
  $q.dialog({
    title: 'Confirmar eliminación',
    message: `¿Estás seguro de que deseas eliminar a ${teamName}?\n\nEsta acción puede afectar a los jugadores asociados al equipo.`,
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
      await store.deleteTeam(teamId)
      $q.notify({ type: 'positive', message: 'Equipo eliminado correctamente.' })
    } catch (error) {
      $q.notify({ type: 'negative', message: error.response?.data?.message || 'No se pudo eliminar el equipo.' })
    }
  })
}

onMounted(async () => {
  if (!store.teams.length) await store.fetchTeams()
  if (!store.players.length) await store.fetchPlayers() 
  if (!store.matches.length) await store.fetchMatches()
})
</script>

<template>
  <div class="teams-page">
    <!-- PAGE HEADER -->
    <div class="sport-page-header">
      <div class="sport-page-header__left">
        <div class="sport-page-header__icon-box">
          <q-icon name="groups" />
        </div>
        <div>
          <div class="sport-page-header__eyebrow">GESTIÓN DE CLUBES · TEMPORADA 2026</div>
          <h1 class="sport-page-header__title">Equipos Participantes</h1>
        </div>
      </div>

      <div class="row items-center q-gutter-sm">
        <div class="view-mode-toggle">
          <button
            type="button"
            class="view-mode-btn"
            :class="{ 'view-mode-btn--active': viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            aria-label="Vista de tarjetas"
          >
            <q-icon name="grid_view" size="18px" />
          </button>
          <button
            type="button"
            class="view-mode-btn"
            :class="{ 'view-mode-btn--active': viewMode === 'table' }"
            @click="viewMode = 'table'"
            aria-label="Vista de tabla"
          >
            <q-icon name="view_list" size="18px" />
          </button>
        </div>

        <q-btn
          unelevated
          color="primary"
          icon="add"
          label="Agregar Equipo"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- SEARCH & FILTER TOOLBAR -->
    <div class="sports-toolbar q-mb-xl">
      <div class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-6">
          <q-input
            v-model="search"
            dense
            outlined
            clearable
            label="Buscar por nombre, barrio, DT o sigla"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-md-6 text-right text-caption text-grey-5">
          Total de clubes registrados: <strong class="text-white">{{ filteredTeams.length }}</strong>
        </div>
      </div>
    </div>

    <!-- VIEW 1: GRID OF 1:1 SPORTS TEAM CARDS -->
    <div v-if="viewMode === 'grid'">
      <div v-if="filteredTeams.length" class="row q-col-gutter-lg">
        <div
          v-for="team in filteredTeams"
          :key="team._id"
          class="col-12 col-sm-6 col-lg-4"
        >
          <q-card flat class="sports-team-reference-card">
            <q-card-section class="q-pa-md">
              <!-- TOP HEADER OF CARD -->
              <div class="team-ref-header">
                <!-- Circular Crest with team color border -->
                <div
                  class="sport-crest-container team-ref-crest-box"
                  :style="{ borderColor: team.primaryColor || '#10b981' }"
                >
                  <ImagePreview
                    :src="team.logoUrl"
                    fallback="/images/default-team.svg"
                    :alt="`Escudo de ${team.name}`"
                    width="44px"
                    height="44px"
                  />
                </div>

                <!-- Team Name and Neighborhood -->
                <div class="col min-width-0 q-ml-sm">
                  <div class="team-ref-title">{{ team.name }}</div>
                  <div class="team-ref-neighborhood">
                    {{ team.neighborhood || 'Sector del Barrio' }}
                  </div>
                </div>

                <!-- 3-Dots Action Menu -->
                <q-btn flat round dense icon="more_vert" color="grey-5" class="team-ref-menu-btn">
                  <q-menu cover auto-close anchor="bottom end" self="top end">
                    <q-list style="min-width: 140px;">
                      <q-item clickable :to="`/equipos/${team._id}`">
                        <q-item-section avatar style="min-width: 30px;">
                          <q-icon name="visibility" color="primary" size="18px" />
                        </q-item-section>
                        <q-item-section>Ver Plantel</q-item-section>
                      </q-item>
                      <q-item clickable @click="openEditDialog(team)">
                        <q-item-section avatar style="min-width: 30px;">
                          <q-icon name="edit" color="secondary" size="18px" />
                        </q-item-section>
                        <q-item-section>Editar</q-item-section>
                      </q-item>
                      <q-separator style="background: var(--tb-border);" />
                      <q-item clickable @click="removeTeam(team._id, team.name)">
                        <q-item-section avatar style="min-width: 30px;">
                          <q-icon name="delete" color="negative" size="18px" />
                        </q-item-section>
                        <q-item-section class="text-negative">Eliminar</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </div>

              <!-- CENTRAL DETAILS (DT, FOUNDATION, MOTTO) -->
              <div class="team-ref-details q-mt-md">
                <div class="team-ref-detail-item">
                  <q-icon name="person" size="16px" class="q-mr-xs text-grey-5" />
                  <span class="detail-label">DT:</span>
                  <span class="detail-value">{{ team.coach || 'Por definir' }}</span>
                </div>
                <div class="team-ref-detail-item">
                  <q-icon name="schedule" size="16px" class="q-mr-xs text-grey-5" />
                  <span class="detail-label">Fundación:</span>
                  <span class="detail-value">{{ team.foundationYear || '2026' }}</span>
                </div>
                <div class="team-ref-motto q-mt-xs">
                  <em>"{{ team.description || 'Juntos por el barrio' }}"</em>
                </div>
              </div>

              <!-- BOTTOM STATS BAR -->
              <div class="team-ref-stats-bar q-mt-md">
                <div class="ref-stat-block">
                  <div class="ref-stat-label">PLANTEL</div>
                  <div class="ref-stat-value text-white">{{ getTeamPlayerCount(team._id) }} jug.</div>
                </div>
                <div class="ref-stat-block">
                  <div class="ref-stat-label">PJ</div>
                  <div class="ref-stat-value text-secondary">{{ getTeamStandings(team._id)?.played ?? 0 }}</div>
                </div>
                <div class="ref-stat-block">
                  <div class="ref-stat-label">PUNTOS</div>
                  <div class="ref-stat-value text-accent">{{ getTeamStandings(team._id)?.points ?? 0 }} PTS</div>
                </div>
                <div class="ref-stat-block">
                  <div class="ref-stat-label">DIF. GOL</div>
                  <div
                    class="ref-stat-value"
                    :class="{
                      'text-positive': (getTeamStandings(team._id)?.goalDifference ?? 0) > 0,
                      'text-negative': (getTeamStandings(team._id)?.goalDifference ?? 0) < 0,
                      'text-white': (getTeamStandings(team._id)?.goalDifference ?? 0) === 0
                    }"
                  >
                    {{ (getTeamStandings(team._id)?.goalDifference ?? 0) > 0 ? '+' : '' }}{{ getTeamStandings(team._id)?.goalDifference ?? 0 }}
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div v-else class="sports-panel-card q-pa-xl text-center">
        <q-icon name="groups" color="grey-6" size="48px" />
        <div class="text-h6 text-weight-bold q-mt-md">No se encontraron equipos</div>
        <div class="text-caption text-grey-5 q-mt-xs">Prueba con otro término de búsqueda.</div>
      </div>
    </div>

    <!-- VIEW 2: SPORTS DATA TABLE -->
    <div v-else>
      <q-card flat class="sports-panel-card">
        <q-table
          :rows="filteredTeams"
          :columns="[
            { name: 'logo', label: 'ESCUDO', field: 'logoUrl', align: 'center' },
            { name: 'name', label: 'EQUIPO', field: 'name', align: 'left', sortable: true },
            { name: 'neighborhood', label: 'BARRIO / SECTOR', field: 'neighborhood', align: 'left', sortable: true },
            { name: 'coach', label: 'DIRECTOR TÉCNICO', field: 'coach', align: 'left', sortable: true },
            { name: 'players', label: 'PLANTEL', field: 'players', align: 'center' },
            { name: 'actions', label: 'ACCIONES', field: 'actions', align: 'right' },
          ]"
          row-key="_id"
          flat
          hide-pagination
        >
          <template #body-cell-logo="props">
            <q-td :props="props" class="text-center">
              <div class="sport-crest-container" style="width: 38px; height: 38px;">
                <ImagePreview
                  :src="props.row.logoUrl"
                  fallback="/images/default-team.svg"
                  :alt="`Escudo de ${props.row.name}`"
                  width="34px"
                  height="34px"
                />
              </div>
            </q-td>
          </template>

          <template #body-cell-name="props">
            <q-td :props="props">
              <div class="text-weight-bold text-white">{{ props.row.name }}</div>
            </q-td>
          </template>

          <template #body-cell-neighborhood="props">
            <q-td :props="props">
              <span class="text-positive text-weight-medium">{{ props.row.neighborhood || 'Sector del Barrio' }}</span>
            </q-td>
          </template>

          <template #body-cell-coach="props">
            <q-td :props="props">
              <span class="text-grey-4">{{ props.row.coach || 'Por definir' }}</span>
            </q-td>
          </template>

          <template #body-cell-players="props">
            <q-td :props="props" class="text-center">
              <span class="text-weight-bold text-white">{{ getTeamPlayerCount(props.row._id) }} jug.</span>
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props" class="text-right">
              <q-btn flat round dense icon="visibility" color="primary" :to="`/equipos/${props.row._id}`" />
              <q-btn flat round dense icon="edit" color="secondary" @click="openEditDialog(props.row)" />
              <q-btn flat round dense icon="delete" color="negative" @click="removeTeam(props.row._id, props.row.name)" />
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>

    <!-- 1:1 REFERENCE MODAL DIALOG ("AGREGAR EQUIPO") -->
    <q-dialog v-model="dialog" persistent>
      <q-card class="team-modal-card">
        <!-- MODAL HEADER -->
        <q-card-section class="dialog-header-section">
          <div class="row items-center justify-between">
            <div class="row items-center gap-sm">
              <div class="header-logo-badge">
                <q-icon name="shield" size="22px" />
              </div>
              <div class="text-h6 text-weight-bold">
                {{ editingId ? 'EDITAR EQUIPO' : '🛡 AGREGAR EQUIPO' }}
              </div>
            </div>
            <q-btn flat round dense icon="close" color="grey-5" @click="closeDialog" />
          </div>
        </q-card-section>

        <!-- FORM BODY (2 COLUMNS) -->
        <q-form @submit.prevent="saveTeam" class="q-pa-lg q-gutter-y-md">
          <!-- FILA 1: Nombre del equipo (ancho completo con ícono pelota) -->
          <q-input
            v-model="form.name"
            label="Nombre del equipo *"
            placeholder="Ej: Corral FC, Atlético San José..."
            outlined
            stack-label
            required
          >
            <template #prepend>
              <q-icon name="sports_soccer" />
            </template>
          </q-input>

          <!-- FILA 2: DT | Barrio / Sector -->
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.coach"
                label="Director Técnico (DT)"
                placeholder="Ej: Carlos Mendoza"
                outlined
                stack-label
              >
                <template #prepend>
                  <q-icon name="person" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.neighborhood"
                label="Barrio / Sector"
                placeholder="Ej: Sector Norte"
                outlined
                stack-label
              >
                <template #prepend>
                  <q-icon name="place" />
                </template>
              </q-input>
            </div>
          </div>

          <!-- FILA 3: Año Fundación | URL del Escudo -->
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="form.foundationYear"
                type="number"
                label="Año Fundación"
                placeholder="2026"
                outlined
                stack-label
              >
                <template #prepend>
                  <q-icon name="schedule" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.logoUrl"
                label="URL del Escudo (Opcional)"
                placeholder="https://... (o dejar vacío)"
                outlined
                stack-label
                clearable
              >
                <template #prepend>
                  <q-icon name="image" />
                </template>
              </q-input>
            </div>
          </div>

          <!-- FILA 4: Color Principal | Color Secundario -->
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <div class="color-picker-box">
                <span class="text-caption text-grey-4">Color Principal</span>
                <div class="row items-center gap-sm q-mt-xs">
                  <input
                    type="color"
                    v-model="form.primaryColor"
                    class="native-color-input"
                  />
                  <q-input
                    v-model="form.primaryColor"
                    dense
                    outlined
                    class="col"
                  />
                </div>
              </div>
            </div>
            <div class="col-12 col-sm-6">
              <div class="color-picker-box">
                <span class="text-caption text-grey-4">Color Secundario</span>
                <div class="row items-center gap-sm q-mt-xs">
                  <input
                    type="color"
                    v-model="form.secondaryColor"
                    class="native-color-input"
                  />
                  <q-input
                    v-model="form.secondaryColor"
                    dense
                    outlined
                    class="col"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- FILA 5: VISTA PREVIA DE ESCUDO -->
          <div class="shield-preview-container q-my-sm text-center">
            <div class="text-caption text-grey-5 q-mb-sm text-uppercase text-weight-bold" style="letter-spacing: 0.08em;">
              VISTA PREVIA DE ESCUDO
            </div>
            <div
              class="sport-crest-container preview-shield-circle"
              :style="{
                borderColor: form.primaryColor || '#15803d',
                boxShadow: `0 0 16px ${form.primaryColor}55`
              }"
            >
              <ImagePreview
                :src="form.logoUrl"
                fallback="/images/default-team.svg"
                :alt="form.name || 'Vista previa'"
                width="74px"
                height="74px"
              />
            </div>
          </div>

          <!-- FILA 6: Reseña o Historia del Equipo -->
          <q-input
            v-model="form.description"
            type="textarea"
            rows="3"
            label="Reseña o Historia del Equipo"
            placeholder="Breve reseña del equipo, lema o historia en el barrio..."
            outlined
            stack-label
          />

          <!-- FOOTER: CANCELAR + REGISTRAR EQUIPO -->
          <div class="row justify-end q-gutter-sm q-pt-md">
            <q-btn flat label="Cancelar" color="grey-5" @click="closeDialog" />
            <q-btn
              type="submit"
              color="primary"
              icon="shield"
              :label="editingId ? 'Guardar Cambios' : 'Registrar Equipo'"
              :loading="saving"
              :disable="saving || !form.name.trim()"
            />
          </div>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.teams-page {
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

.view-mode-toggle {
  display: inline-flex;
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 3px;
  gap: 3px;
}

.view-mode-btn {
  background: transparent;
  border: none;
  color: var(--tb-muted);
  padding: 6px 10px;
  border-radius: var(--tb-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.view-mode-btn:hover {
  color: #ffffff;
}

.view-mode-btn--active {
  background: var(--tb-surface);
  color: var(--tb-primary);
  border: 1px solid var(--tb-border);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

/* Reference Team Card (Dark Blue / Slate) */
.sports-team-reference-card {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-lg) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35) !important;
  transition: all 0.2s ease;
}

.sports-team-reference-card:hover {
  border-color: #3b82f6 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
  transform: translateY(-2px);
}

.team-ref-header {
  display: flex;
  align-items: center;
}

.team-ref-crest-box {
  width: 52px;
  height: 52px;
  border-width: 2px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.team-ref-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.team-ref-neighborhood {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--tb-primary);
  margin-top: 2px;
}

.team-ref-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.team-ref-detail-item {
  display: flex;
  align-items: center;
  font-size: 0.84rem;
}

.detail-label {
  color: var(--tb-muted);
  font-weight: 600;
  margin-right: 6px;
}

.detail-value {
  color: #ffffff;
  font-weight: 700;
}

.team-ref-motto {
  font-size: 0.8rem;
  color: var(--tb-muted);
  line-height: 1.3;
}

/* Bottom Stats Bar */
.team-ref-stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--tb-border);
  text-align: center;
}

.ref-stat-block {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ref-stat-label {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--tb-muted);
  text-transform: uppercase;
}

.ref-stat-value {
  font-size: 0.94rem;
  font-weight: 900;
  margin-top: 2px;
}

/* Modal styling */
.team-modal-card {
  max-width: 680px;
  width: 95vw;
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-lg);
  color: #ffffff;
}

.dialog-header-section {
  border-bottom: 1px solid var(--tb-border);
  padding: 18px 22px;
}

.color-picker-box {
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 8px 12px;
}

.native-color-input {
  width: 42px;
  height: 38px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
}

.shield-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
}

.preview-shield-circle {
  width: 86px;
  height: 86px;
  border-width: 3px;
}
</style>
