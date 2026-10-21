<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentStore } from '@/stores/tournament'
import ImagePreview from '@/components/ImagePreview.vue'
import { isOptionalImageUrl } from '@/utils/imageUrl'
import { getDefaultTeamLogo } from '@/utils/defaultAssets'

const store = useTournamentStore()
const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const search = ref('')
const teamFilter = ref('ALL')
const positionFilter = ref('ALL')
const statusFilter = ref('ALL')
const dialog = ref(false)
const editingId = ref(null)
const saving = ref(false)
const viewMode = ref('table') // 'table' (List View) | 'grid' (Grid View)

// Estados para Edición Rápida en la misma fila
const inlineEditId = ref(null)
const inlineEditSaving = ref(false)
const inlineForm = reactive({
  name: '',
  number: null,
  position: 'Delantero',
  team: '',
  status: 'TITULAR',
})

const positionOptions = ['Portero', 'Defensa', 'Mediocampista', 'Delantero']
const numberOptions = Array.from({ length: 99 }, (_, index) => index + 1)
const imageUrlRules = [
  (value) => isOptionalImageUrl(value) || 'Si la URL no es válida, se usará la imagen por defecto.',
]

// Opciones de condición / estado del jugador
const condicionOptions = [
  {
    label: 'Titular',
    value: 'TITULAR',
    icon: 'check_circle',
    color: 'positive',
    desc: 'Disponible para alineación inicial',
  },
  {
    label: 'Suplente',
    value: 'SUPLENTE',
    icon: 'swap_horiz',
    color: 'info',
    desc: 'Banquillo de suplentes',
  },
  {
    label: 'Lesionado',
    value: 'LESIONADO',
    icon: 'medical_services',
    color: 'warning',
    desc: 'Baja médica / En recuperación',
  },
  {
    label: 'Sancionado (Roja Directa)',
    value: 'SANCIONADO_ROJA',
    icon: 'report',
    color: 'negative',
    desc: 'Suspendido por tarjeta roja directa',
  },
  {
    label: 'Sancionado (Acumulación)',
    value: 'SANCIONADO_AMARILLAS',
    icon: 'warning',
    color: 'amber-9',
    desc: 'Suspendido por acumulación de amarillas',
  },
]

// Metadatos visuales por cada condición
const getCondicionMeta = (val) => {
  const normalized = String(val || 'TITULAR').toUpperCase()
  if (normalized.includes('ROJA') || normalized === 'EXPULSADO') {
    return {
      label: 'SANCIONADO (ROJA)',
      icon: 'report',
      bg: 'rgba(239, 68, 68, 0.18)',
      border: 'rgba(239, 68, 68, 0.45)',
      text: '#f87171',
    }
  }
  if (normalized.includes('AMARILLA') || normalized.includes('AMARILLAS')) {
    return {
      label: 'SANCIONADO (AMARILLAS)',
      icon: 'warning',
      bg: 'rgba(245, 158, 11, 0.18)',
      border: 'rgba(245, 158, 11, 0.45)',
      text: '#fbbf24',
    }
  }
  if (normalized.includes('LESION') || normalized.includes('LESIONADO')) {
    return {
      label: 'LESIONADO',
      icon: 'medical_services',
      bg: 'rgba(251, 146, 60, 0.18)',
      border: 'rgba(251, 146, 60, 0.45)',
      text: '#fb923c',
    }
  }
  if (normalized.includes('SUPLENTE') || normalized === 'BANCA') {
    return {
      label: 'SUPLENTE',
      icon: 'swap_horiz',
      bg: 'rgba(56, 189, 248, 0.18)',
      border: 'rgba(56, 189, 248, 0.45)',
      text: '#38bdf8',
    }
  }
  return {
    label: 'TITULAR',
    icon: 'check_circle',
    bg: 'rgba(16, 185, 129, 0.18)',
    border: 'rgba(16, 185, 129, 0.45)',
    text: '#10b981',
  }
}

const form = reactive({
  name: '',
  number: null,
  position: 'Delantero',
  team: '',
  status: 'TITULAR',
  photoUrl: '',
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
})

const teamFilterOptions = computed(() => [
  { label: '🛡 Todos los equipos', value: 'ALL' },
  ...[...store.teams]
    .sort((a, b) => String(a.name || a.nombre || '').localeCompare(
      String(b.name || b.nombre || ''),
      'es',
      { sensitivity: 'base' },
    ))
    .map((team) => ({
    label: `🛡 ${team.name}`,
    value: team._id,
  })),
])

const positionFilterOptions = [
  { label: '⚽ Todas las posiciones', value: 'ALL' },
  { label: '🧤 Portero', value: 'Portero' },
  { label: '🛡 Defensa', value: 'Defensa' },
  { label: '⚙ Mediocampista', value: 'Mediocampista' },
  { label: '⚡ Delantero', value: 'Delantero' },
]

const statusFilterOptions = [
  { label: '📋 Todas las condiciones', value: 'ALL' },
  { label: '🟢 Titular', value: 'TITULAR' },
  { label: '🔵 Suplente', value: 'SUPLENTE' },
  { label: '🏥 Lesionado', value: 'LESIONADO' },
  { label: '🟥 Sancionado (Roja Directa)', value: 'SANCIONADO_ROJA' },
  { label: '🟨 Sancionado (Acumulación)', value: 'SANCIONADO_AMARILLAS' },
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
  const targetValue = String(form.team || '').trim().toLowerCase()
  if (!targetValue) return new Set()

  // 1. Recopilar todos los identificadores (ID y Nombre) del equipo seleccionado en el modal
  const targetIds = new Set([targetValue])
  const targetNames = new Set([targetValue])

  const targetTeamObj = store.teams.find((t) => {
    const tId = String(t._id || t.id || '').toLowerCase()
    const tName = String(t.name || t.nombre || '').toLowerCase().trim()
    return tId === targetValue || tName === targetValue
  })

  if (targetTeamObj) {
    if (targetTeamObj._id) targetIds.add(String(targetTeamObj._id).toLowerCase())
    if (targetTeamObj.id) targetIds.add(String(targetTeamObj.id).toLowerCase())
    if (targetTeamObj.name) targetNames.add(String(targetTeamObj.name).toLowerCase().trim())
    if (targetTeamObj.nombre) targetNames.add(String(targetTeamObj.nombre).toLowerCase().trim())
  }

  const occupied = new Set()

  // 2. Analizar cada jugador de la lista global
  store.players.forEach((player) => {
    // Si estamos editando, ignoramos al mismo jugador para que conserve su dorsal actual
    if (editingId.value && String(player._id || player.id) === String(editingId.value)) {
      return
    }

    // Extraer todos los identificadores de equipo guardados en la ficha del jugador
    const pIds = new Set()
    const pNames = new Set()

    const addIdentifiers = (val) => {
      if (!val) return
      if (typeof val === 'object') {
        if (val._id) pIds.add(String(val._id).toLowerCase())
        if (val.id) pIds.add(String(val.id).toLowerCase())
        if (val.name) pNames.add(String(val.name).toLowerCase().trim())
        if (val.nombre) pNames.add(String(val.nombre).toLowerCase().trim())
      } else {
        const str = String(val).toLowerCase().trim()
        pIds.add(str)
        pNames.add(str)
      }
    }

    addIdentifiers(player.team)
    addIdentifiers(player.equipo)
    addIdentifiers(player.teamId)

    // Comprobar si hay coincidencia por ID o por Nombre con el equipo seleccionado
    let isSameTeam = false
    for (const id of pIds) {
      if (targetIds.has(id)) { isSameTeam = true; break }
    }
    if (!isSameTeam) {
      for (const name of pNames) {
        if (targetNames.has(name)) { isSameTeam = true; break }
      }
    }

    // Si pertenece al equipo, registramos su dorsal como ocupado
    if (isSameTeam) {
      const num = Number(player.number ?? player.dorsal)
      if (Number.isInteger(num) && num > 0) {
        occupied.add(num)
      }
    }
  })

  return occupied
})

const numberOptionsList = computed(() => numberOptions.map((value) => ({
  value,
  selected: Number(form.number) === value,
  disabled: occupiedNumbersByTeam.value.has(value),
})))

// Declarar getTeamId SOLO UNA VEZ
const getTeamId = (player) => {
  const rawTeam = player.teamId || player.team || player.equipo
  if (!rawTeam) return ''
  if (typeof rawTeam === 'object') return String(rawTeam._id || rawTeam.id || '')
  return String(rawTeam)
}

const getCanonicalTeamId = (teamValue) => {
  const rawValue = String(
    teamValue && typeof teamValue === 'object'
      ? teamValue._id || teamValue.id || ''
      : teamValue || '',
  ).trim()
  if (!rawValue) return ''

  const normalizedValue = rawValue.toLowerCase()
  const team = store.teams.find((item) => (
    String(item._id || item.id || '') === rawValue ||
    String(item.name || item.nombre || '').trim().toLowerCase() === normalizedValue
  ))
  return String(team?._id || team?.id || rawValue)
}

const getPlayerTeam = (player) => {
  const playerTeam = player.team
  const teamId = player.teamId || (
    playerTeam && typeof playerTeam === 'object'
      ? playerTeam._id || playerTeam.id
      : ''
  )
  if (teamId) {
    const teamById = store.teams.find((team) => String(team._id || team.id) === String(teamId))
    if (teamById) return teamById
  }

  if (playerTeam && typeof playerTeam === 'object' && (playerTeam._id || playerTeam.id)) {
    const teamByReference = store.teams.find((team) => String(team._id || team.id) === String(playerTeam._id || playerTeam.id))
    if (teamByReference) return teamByReference
    return playerTeam
  }

  const rawTeam = player.equipo || playerTeam
  if (!rawTeam) return null

  const teamValue = String(rawTeam).trim()
  return store.teams.find((team) => String(team._id || team.id) === teamValue) ||
    store.teams.find((team) => (team.name || team.nombre || '').toLowerCase().trim() === teamValue.toLowerCase()) ||
    null
}

const getPlayerTeamName = (player) => {
  const team = getPlayerTeam(player)
  if (team) return team.name || team.nombre || 'Equipo'
  return player.equipo || (typeof player.team === 'string' ? player.team : 'Sin equipo')
}

const getPlayerTeamLogo = (player) => {
  const team = getPlayerTeam(player)
  if (team) return team.logoUrl || team.escudo_url || team.logo || getDefaultTeamLogo(team)
  return getDefaultTeamLogo(getTeamId(player) || player)
}

const handlePlayerAvatarError = (event) => {
  const image = event.target
  if (!image.src.endsWith('/images/default-avatar.svg')) {
    image.src = '/images/default-avatar.svg'
  }
}

// Lógica de Edición Rápida en la Fila para el Organizador
const startInlineEdit = (player) => {
  inlineEditId.value = player._id
  const teamObj = getPlayerTeam(player)
  inlineForm.name = player.name || player.nombre || ''
  inlineForm.number = Number(player.number ?? player.dorsal) || null
  inlineForm.position = player.position || player.posicion || 'Delantero'
  inlineForm.team = teamObj?._id || getTeamId(player) || (store.teams[0]?._id || '')
  inlineForm.status = player.status || player.condicion || 'TITULAR'
}

const cancelInlineEdit = () => {
  inlineEditId.value = null
}

const saveInlineEdit = async (player) => {
  if (!inlineForm.name.trim()) {
    $q.notify({ type: 'warning', message: 'El nombre del jugador no puede estar vacío.' })
    return
  }

  const newNum = Number(inlineForm.number)
  if (!newNum || newNum < 1 || newNum > 99) {
    $q.notify({ type: 'warning', message: 'El dorsal debe ser un número válido entre 1 y 99.' })
    return
  }

  // Validar si el dorsal ya está ocupado por otro jugador en el mismo club
  const targetTeamId = getCanonicalTeamId(inlineForm.team)
  const isDorsalTaken = store.players.some((p) => {
    if (String(p._id || p.id) === String(player._id || player.id)) return false
    const playerTeamId = getCanonicalTeamId(getPlayerTeam(p) || getTeamId(p))
    return playerTeamId === targetTeamId && Number(p.number ?? p.dorsal) === newNum
  })

  if (isDorsalTaken) {
    $q.notify({
      type: 'negative',
      message: `El dorsal ${newNum} ya pertenece a otro jugador de este equipo`,
    })
    return
  }

  inlineEditSaving.value = true
  try {
    const payload = {
      name: inlineForm.name.trim(),
      number: newNum,
      position: inlineForm.position,
      team: inlineForm.team,
      status: inlineForm.status,
    }
    await store.updatePlayer(player._id, payload)
    $q.notify({ type: 'positive', message: `Jugador ${payload.name} actualizado.` })
    inlineEditId.value = null
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Error al actualizar jugador.' })
  } finally {
    inlineEditSaving.value = false
  }
}

const goToPlayerTeam = (player) => {
  const team = getPlayerTeam(player)
  if (team?._id) {
    router.push({ name: 'team-detail', params: { id: team._id } })
  } else if (team?.id) {
    router.push({ name: 'team-detail', params: { id: team.id } })
  }
}

const filteredPlayers = computed(() => {
  const query = search.value.trim().toLowerCase()

  // 1. Obtener ID y Nombre del equipo seleccionado en el filtro desplegable
  const selectedTeamObj = store.teams.find((t) => String(t._id) === String(teamFilter.value))
  const selectedTeamId = String(teamFilter.value)
  const selectedTeamName = selectedTeamObj ? String(selectedTeamObj.name).toLowerCase().trim() : ''

  return store.players.filter((player) => {
    // 2. Extraer ID y Nombre del equipo guardado en el registro del jugador
    const rawTeam = player.team || player.equipo
    let playerTeamId = ''
    let playerTeamName = ''

    if (rawTeam && typeof rawTeam === 'object') {
      playerTeamId = String(rawTeam._id || rawTeam.id || '')
      playerTeamName = String(rawTeam.name || rawTeam.nombre || '').toLowerCase().trim()
    } else if (rawTeam) {
      playerTeamId = String(rawTeam)
      playerTeamName = String(rawTeam).toLowerCase().trim()
    }

    const playerNameStr = player.name || player.nombre || ''
    const playerPosStr = player.position || player.posicion || ''
    const playerCond = String(player.status || player.condicion || 'TITULAR').toUpperCase()

    // 3. Buscador general por texto (nombre, posición o equipo)
    const matchesSearch = !query || `${playerNameStr} ${playerPosStr} ${playerTeamName}`.toLowerCase().includes(query)

    // 4. Filtro por Equipo (Compara por ID Y por Nombre simultáneamente)
    let matchesTeam = true
    if (teamFilter.value !== 'ALL') {
      matchesTeam = (
        (selectedTeamId && playerTeamId === selectedTeamId) ||
        (selectedTeamName && playerTeamName === selectedTeamName)
      )
    }

    // 5. Filtro por Posición
    const matchesPos = positionFilter.value === 'ALL' || 
      playerPosStr.toLowerCase().trim() === String(positionFilter.value).toLowerCase().trim()

    // 6. Filtro por Condición
    let matchesStatus = true
    if (statusFilter.value !== 'ALL') {
      const meta = getCondicionMeta(playerCond)
      const targetMeta = getCondicionMeta(statusFilter.value)
      matchesStatus = meta.label === targetMeta.label
    }

    return matchesSearch && matchesTeam && matchesPos && matchesStatus
  })
})

const resetForm = () => {
  Object.assign(form, {
    name: '',
    number: null,
    position: 'Delantero',
    team: '',
    status: 'TITULAR',
    photoUrl: '',
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
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
    name: player.name || player.nombre || '',
    number: player.number ?? player.dorsal ?? null,
    position: player.position || player.posicion || 'Delantero',
    team: player.team?._id || player.team || '',
    status: player.status || player.condicion || 'TITULAR',
    photoUrl: player.photoUrl || '',
    goals: player.goals ?? player.goles ?? 0,
    assists: player.assists ?? player.asistencias ?? 0,
    yellowCards: player.yellowCards ?? player.tarjetasAmarillas ?? 0,
    redCards: player.redCards ?? player.tarjetasRojas ?? 0,
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
    saving.value = false
    return
  }

  if (occupiedNumbersByTeam.value.has(nextNumber)) {
    $q.notify({ type: 'warning', message: 'Ese número ya está asignado a otro jugador de este equipo.' })
    saving.value = false
    return
  }

  const payload = {
    ...form,
    name: form.name.trim(),
    nombre: form.name.trim(),
    number: nextNumber,
    dorsal: nextNumber,
    position: form.position,
    posicion: form.position,
    status: form.status,
    condicion: form.status,
    photoUrl: form.photoUrl.trim(),
    goals: Math.max(0, Number(form.goals) || 0),
    goles: Math.max(0, Number(form.goals) || 0),
    assists: Math.max(0, Number(form.assists) || 0),
    asistencias: Math.max(0, Number(form.assists) || 0),
    yellowCards: Math.max(0, Number(form.yellowCards) || 0),
    tarjetasAmarillas: Math.max(0, Number(form.yellowCards) || 0),
    redCards: Math.max(0, Number(form.redCards) || 0),
    tarjetasRojas: Math.max(0, Number(form.redCards) || 0),
  }

  try {
    await (editingId.value
      ? store.updatePlayer(editingId.value, payload)
      : store.createPlayer(payload))

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
  await Promise.all([store.fetchTeams(), store.fetchMatches(), store.fetchPlayers()])

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

      <div class="row items-center q-gutter-sm">
        <div class="view-mode-toggle">
          <button
            type="button"
            class="view-mode-btn"
            :class="{ 'view-mode-btn--active': viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            aria-label="Vista de tarjetas (Grid View)"
          >
            <q-icon name="grid_view" size="18px" />
          </button>
          <button
            type="button"
            class="view-mode-btn"
            :class="{ 'view-mode-btn--active': viewMode === 'table' }"
            @click="viewMode = 'table'"
            aria-label="Vista de lista (List View)"
          >
            <q-icon name="view_list" size="18px" />
          </button>
        </div>

        <q-btn
          unelevated
          color="primary"
          icon="person_add"
          label="Nuevo Jugador"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- INTEGRATED FILTER TOOLBAR -->
    <div class="sports-toolbar q-mb-xl">
      <div class="row q-col-gutter-md items-center">
        <!-- FILTER BY TEAM -->
        <div class="col-12 col-sm-6 col-md-3">
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
        <div class="col-12 col-sm-6 col-md-3">
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

        <!-- FILTER BY CONDITION (TITULAR, SUPLENTE, LESIONADO, SANCIONADO) -->
        <div class="col-12 col-sm-6 col-md-3">
          <q-select
            v-model="statusFilter"
            :options="statusFilterOptions"
            emit-value
            map-options
            outlined
            dense
            label="Condición / Estado"
          >
            <template #prepend>
              <q-icon name="verified_user" color="accent" />
            </template>
          </q-select>
        </div>

        <!-- SEARCH BY NAME -->
        <div class="col-12 col-sm-6 col-md-3">
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

    <!-- LIST VIEW: PLAYERS TABLE WITH INLINE EDIT -->
    <q-card v-if="viewMode === 'table'" flat class="sports-panel-card">
      <q-table
        :rows="filteredPlayers"
        :columns="[
          { name: 'number', label: 'DORSAL', field: (row) => row.number ?? row.dorsal, align: 'center', sortable: true },
          { name: 'player', label: 'JUGADOR', field: (row) => row.name || row.nombre, align: 'left', sortable: true },
          { name: 'position', label: 'POSICIÓN', field: (row) => row.position || row.posicion, align: 'left', sortable: true },
          { name: 'team', label: 'EQUIPO', field: (row) => row.team?.name || row.equipo, align: 'left', sortable: true },
          { name: 'status', label: 'CONDICIÓN', field: (row) => row.status || row.condicion, align: 'center', sortable: true },
          { name: 'stats', label: 'ESTADÍSTICAS', field: (row) => row.goals ?? row.goles ?? 0, align: 'center', sortable: true },
          { name: 'actions', label: 'ACCIONES', field: 'actions', align: 'right' },
        ]"
        row-key="_id"
        flat
        hide-pagination
        :pagination="{ rowsPerPage: 0 }"
        class="players-pill-table"
      >
        <!-- DORSAL (NORMAL O INLINE INPUT) -->
        <template #body-cell-number="props">
          <q-td :props="props" class="text-center">
            <div v-if="inlineEditId === props.row._id" class="inline-edit-box">
              <q-input
                v-model.number="inlineForm.number"
                type="number"
                dense
                outlined
                min="1"
                max="99"
                style="width: 65px; margin: 0 auto;"
                @keydown.enter="saveInlineEdit(props.row)"
                @keydown.esc="cancelInlineEdit"
              />
            </div>
            <span v-else class="dorsal-blue-box">
              {{ props.row.number ?? props.row.dorsal ?? '-' }}
            </span>
          </q-td>
        </template>

        <!-- PLAYER NAME & AVATAR UNIFICADO -->
        <template #body-cell-player="props">
          <q-td :props="props">
            <div v-if="inlineEditId === props.row._id" class="row items-center no-wrap gap-sm">
              <div class="sport-crest-container player-avatar-pill">
                <img
                  :src="props.row.photoUrl || props.row.foto_url || '/images/default-avatar.svg'"
                  :alt="`Escudo de ${props.row.name || props.row.nombre}`"
                  class="player-avatar-image"
                  @error="handlePlayerAvatarError"
                />
              </div>
              <q-input
                v-model="inlineForm.name"
                dense
                outlined
                class="full-width"
                placeholder="Nombre del jugador"
                autofocus
                @keydown.enter="saveInlineEdit(props.row)"
                @keydown.esc="cancelInlineEdit"
              />
            </div>
            <div v-else class="row items-center no-wrap gap-md">
              <div class="sport-crest-container player-avatar-pill">
                <img
                  :src="props.row.photoUrl || props.row.foto_url || '/images/default-avatar.svg'"
                  :alt="`Foto de ${props.row.name || props.row.nombre}`"
                  class="player-avatar-image"
                  @error="handlePlayerAvatarError"
                />
              </div>
              <div class="player-name-bold">{{ props.row.name || props.row.nombre }}</div>
            </div>
          </q-td>
        </template>

        <!-- POSITION (NORMAL O INLINE SELECT) -->
        <template #body-cell-position="props">
          <q-td :props="props">
            <div v-if="inlineEditId === props.row._id">
              <q-select
                v-model="inlineForm.position"
                :options="positionOptions"
                dense
                outlined
                style="min-width: 140px;"
              />
            </div>
            <div v-else class="position-neon-tag">
              <q-icon :name="positionIcon(props.row.position || props.row.posicion)" size="15px" class="q-mr-xs" />
              <span>{{ props.row.position || props.row.posicion }}</span>
            </div>
          </q-td>
        </template>

        <!-- TEAM (NORMAL O INLINE SELECT) -->
        <template #body-cell-team="props">
          <q-td :props="props">
            <div v-if="inlineEditId === props.row._id">
              <q-select
                v-model="inlineForm.team"
                :options="teamOptions"
                emit-value
                map-options
                dense
                outlined
                style="min-width: 170px;"
              />
            </div>
            <div
              v-else
              class="team-badge-pill"
              :class="{ 'team-badge-pill--interactive': Boolean(getPlayerTeam(props.row)) }"
              @click="goToPlayerTeam(props.row)"
              :title="getPlayerTeam(props.row) ? `Ver plantel oficial de ${getPlayerTeamName(props.row)}` : ''"
            >
              <div class="sport-crest-container team-pill-crest">
                <ImagePreview
                  :src="getPlayerTeamLogo(props.row)"
                  :fallback="getDefaultTeamLogo(getPlayerTeam(props.row) || props.row)"
                  :alt="`Escudo de ${getPlayerTeamName(props.row)}`"
                  width="20px"
                  height="20px"
                />
              </div>
              <span class="team-pill-name">{{ getPlayerTeamName(props.row) }}</span>
              <q-icon
                v-if="getPlayerTeam(props.row)"
                name="open_in_new"
                size="12px"
                class="q-ml-xs hover-icon"
              />
            </div>
          </q-td>
        </template>

        <!-- CONDICIÓN (NORMAL O INLINE SELECT) -->
        <template #body-cell-status="props">
          <q-td :props="props" class="text-center">
            <div v-if="inlineEditId === props.row._id">
              <q-select
                v-model="inlineForm.status"
                :options="condicionOptions"
                emit-value
                map-options
                dense
                outlined
                style="min-width: 160px; margin: 0 auto;"
              />
            </div>
            <span
              v-else
              class="condicion-dynamic-chip"
              :style="{
                background: getCondicionMeta(props.row.status || props.row.condicion).bg,
                borderColor: getCondicionMeta(props.row.status || props.row.condicion).border,
                color: getCondicionMeta(props.row.status || props.row.condicion).text,
              }"
            >
              <q-icon :name="getCondicionMeta(props.row.status || props.row.condicion).icon" size="13px" class="q-mr-xs" />
              {{ getCondicionMeta(props.row.status || props.row.condicion).label }}
            </span>
          </q-td>
        </template>

        <!-- ESTADÍSTICAS -->
        <template #body-cell-stats="props">
          <q-td :props="props" class="text-center">
            <div class="row items-center justify-center gap-xs no-wrap">
              <q-badge color="positive" class="q-px-xs q-py-xs" :title="`${props.row.goals ?? props.row.goles ?? 0} Goles anotados`">
                ⚽ {{ props.row.goals ?? props.row.goles ?? 0 }}
              </q-badge>
              <q-badge color="info" class="q-px-xs q-py-xs" :title="`${props.row.assists ?? props.row.asistencias ?? 0} Asistencias`">
                👟 {{ props.row.assists ?? props.row.asistencias ?? 0 }}
              </q-badge>
              <q-badge color="warning" text-color="dark" class="q-px-xs q-py-xs" :title="`${props.row.yellowCards ?? props.row.tarjetasAmarillas ?? 0} Amarillas`">
                🟨 {{ props.row.yellowCards ?? props.row.tarjetasAmarillas ?? 0 }}
              </q-badge>
              <q-badge color="negative" class="q-px-xs q-py-xs" :title="`${props.row.redCards ?? props.row.tarjetasRojas ?? 0} Rojas`">
                🟥 {{ props.row.redCards ?? props.row.tarjetasRojas ?? 0 }}
              </q-badge>
            </div>
          </q-td>
        </template>

        <!-- ACCIONES (BOTONES DE EDICIÓN RÁPIDA O NORMAL) -->
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <template v-if="inlineEditId === props.row._id">
              <q-btn
                flat
                round
                dense
                icon="check_circle"
                color="positive"
                :loading="inlineEditSaving"
                @click="saveInlineEdit(props.row)"
                aria-label="Guardar cambios rápidos"
                class="q-mr-xs"
              >
                <q-tooltip>Guardar en la Fila (Enter)</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="cancel"
                color="grey-5"
                :disable="inlineEditSaving"
                @click="cancelInlineEdit"
                aria-label="Cancelar edición rápida"
              >
                <q-tooltip>Cancelar (Esc)</q-tooltip>
              </q-btn>
            </template>
            <template v-else>
              <q-btn
                flat
                round
                dense
                icon="edit"
                color="secondary"
                @click="startInlineEdit(props.row)"
                aria-label="Edición rápida en fila"
                class="q-mr-xs"
              >
                <q-tooltip>Edición Rápida en Fila</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="tune"
                color="primary"
                @click="openEditDialog(props.row)"
                aria-label="Ficha completa del jugador"
                class="q-mr-xs"
              >
                <q-tooltip>Ficha y Datos Completos</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="removePlayer(props.row._id, props.row.name || props.row.nombre)"
                aria-label="Eliminar jugador"
              >
                <q-tooltip>Eliminar Jugador</q-tooltip>
              </q-btn>
            </template>
          </q-td>
        </template>
      </q-table>

      <div v-if="!filteredPlayers.length" class="text-caption text-grey-5 text-center q-pa-xl">
        No se encontraron jugadores para los filtros seleccionados.
      </div>
    </q-card>

    <!-- GRID VIEW: CARDS DEPORTIVAS DE JUGADORES -->
    <div v-else class="players-cards-grid row q-col-gutter-lg">
      <div
        v-for="player in filteredPlayers"
        :key="player._id"
        class="col-12 col-sm-6 col-md-4 col-lg-3"
      >
        <q-card flat class="player-card sports-panel-card">
          <!-- TOP BAR: DORSAL Y ESCUDO DE CLUB -->
          <div class="player-card__top">
            <span class="dorsal-blue-box text-weight-bolder player-card__number">
              #{{ player.number ?? player.dorsal ?? '-' }}
            </span>
            <div class="sport-crest-container player-card__avatar shadow-2">
              <img
                :src="player?.photoUrl || player?.foto_url || player?.photo || '/images/default-avatar.svg'"
                :alt="`Foto de ${player.name || player.nombre}`"
                class="player-avatar-image"
                @error="(e) => e.target.src = '/images/default-avatar.svg'"
              />
            </div>
            <div
              class="sport-crest-container player-card__crest"
              :title="getPlayerTeamName(player)"
              @click="goToPlayerTeam(player)"
            >
              <img
                :src="getPlayerTeam(player)?.logoUrl || getPlayerTeam(player)?.escudo_url || getPlayerTeam(player)?.logo || getDefaultTeamLogo(getPlayerTeam(player))"
                :alt="`Escudo de ${getPlayerTeamName(player)}`"
                class="player-card__crest-image"
                @error="(e) => e.target.src = getDefaultTeamLogo(getPlayerTeam(player))"
              />
            </div>
          </div>

          <div class="player-card__avatar-wrap text-center q-pb-md">
            <div class="player-card__name text-subtitle1 text-weight-bold text-white q-mt-sm">
              {{ player.name || player.nombre }}
            </div>
            <div class="text-caption text-grey-4 text-weight-medium">
              {{ getPlayerTeamName(player) }}
            </div>
          </div>

          <!-- BADGES: POSICIÓN Y CONDICIÓN -->
          <div class="player-card__meta row items-center justify-center q-px-md q-pb-md">
            <div class="position-neon-tag">
              <q-icon :name="positionIcon(player.position || player.posicion)" size="14px" class="q-mr-xs" />
              <span>{{ player.position || player.posicion }}</span>
            </div>
            <span
              class="condicion-dynamic-chip"
              :style="{
                background: getCondicionMeta(player.status || player.condicion).bg,
                borderColor: getCondicionMeta(player.status || player.condicion).border,
                color: getCondicionMeta(player.status || player.condicion).text,
              }"
            >
              <q-icon :name="getCondicionMeta(player.status || player.condicion).icon" size="12px" class="q-mr-xs" />
              {{ getCondicionMeta(player.status || player.condicion).label }}
            </span>
          </div>

          <!-- ESTADÍSTICAS RÁPIDAS -->
          <div class="player-card__stats row items-center justify-around q-py-sm q-px-md border-top-dark">
            <div class="text-center" title="Goles anotados">
              <div class="text-caption text-grey-5">Goles</div>
              <div class="text-weight-bold text-positive">⚽ {{ player.goals ?? player.goles ?? 0 }}</div>
            </div>
            <div class="text-center" title="Asistencias">
              <div class="text-caption text-grey-5">Asist.</div>
              <div class="text-weight-bold text-info">👟 {{ player.assists ?? player.asistencias ?? 0 }}</div>
            </div>
            <div class="text-center" title="Tarjetas">
              <div class="text-caption text-grey-5">Tarjetas</div>
              <div class="text-weight-bold text-warning">
                🟨 {{ player.yellowCards ?? player.tarjetasAmarillas ?? 0 }}
                <span class="text-negative q-ml-xs">🟥 {{ player.redCards ?? player.tarjetasRojas ?? 0 }}</span>
              </div>
            </div>
          </div>

          <!-- FOOTER: BOTONES DE ACCIÓN -->
          <div class="player-card__actions row items-center justify-end gap-xs q-pa-sm border-top-dark">
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              icon="edit"
              color="secondary"
              label="Editar"
              @click="openEditDialog(player)"
            />
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="delete"
              color="negative"
              @click="removePlayer(player._id, player.name || player.nombre)"
              aria-label="Eliminar jugador"
            >
              <q-tooltip>Eliminar Jugador</q-tooltip>
            </q-btn>
          </div>
        </q-card>
      </div>

      <div v-if="!filteredPlayers.length" class="col-12 text-caption text-grey-5 text-center q-pa-xl">
        No se encontraron jugadores para los filtros seleccionados.
      </div>
    </div>

    <!-- CREATE/EDIT PLAYER MODAL DIALOG -->
    <q-dialog v-model="dialog" persistent>
      <q-card style="max-width: 680px; width: 94vw;">
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

          <!-- CONDICIÓN / ESTADO SELECTOR (TITULAR, SUPLENTE, LESIONADO, SANCIONADO) -->
          <div>
            <div class="text-subtitle2 text-weight-bold q-mb-xs text-white">Condición / Estado en el Plantel</div>
            <div class="selector-grid condicion-selector-grid">
              <button
                v-for="cond in condicionOptions"
                :key="cond.value"
                type="button"
                class="selector-card cond-select-card"
                :class="{ 'selector-card--selected': form.status === cond.value }"
                @click="form.status = cond.value"
              >
                <q-icon :name="cond.icon" size="18px" :color="form.status === cond.value ? 'dark' : cond.color" />
                <div class="text-left">
                  <div class="cond-title">{{ cond.label }}</div>
                  <div class="cond-desc">{{ cond.desc }}</div>
                </div>
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

          <!-- ESTADÍSTICAS OFICIALES DEL JUGADOR (GOLES, ASISTENCIAS, TARJETAS) -->
          <div class="stats-form-section">
            <div class="text-subtitle2 text-weight-bold q-mb-xs text-white">Estadísticas Acumuladas del Jugador</div>
            <div class="text-caption text-grey-5 q-mb-sm">Modifica o ajusta el registro de goles, asistencias y sanciones disciplinarias.</div>
            <div class="row q-col-gutter-sm">
              <div class="col-6 col-sm-3">
                <q-input
                  v-model.number="form.goals"
                  type="number"
                  min="0"
                  outlined
                  dense
                  label="Goles (GF) ⚽"
                />
              </div>
              <div class="col-6 col-sm-3">
                <q-input
                  v-model.number="form.assists"
                  type="number"
                  min="0"
                  outlined
                  dense
                  label="Asistencias 👟"
                />
              </div>
              <div class="col-6 col-sm-3">
                <q-input
                  v-model.number="form.yellowCards"
                  type="number"
                  min="0"
                  outlined
                  dense
                  label="Amarillas 🟨"
                />
              </div>
              <div class="col-6 col-sm-3">
                <q-input
                  v-model.number="form.redCards"
                  type="number"
                  min="0"
                  outlined
                  dense
                  label="Rojas 🟥"
                />
              </div>
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

          <!-- FORM ACTIONS -->
          <div class="row justify-end gap-sm q-pt-md">
            <q-btn flat label="Cancelar" color="grey-5" @click="closeDialog" />
            <q-btn
              unelevated
              color="primary"
              :label="editingId ? 'Guardar Cambios' : 'Registrar Jugador'"
              type="submit"
              :loading="saving"
            />
          </div>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.players-page {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Page Header Styles */
.sport-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.sport-page-header__left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sport-page-header__icon-box {
  width: 48px;
  height: 48px;
  border-radius: var(--tb-radius-md);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(56, 189, 248, 0.2) 100%);
  border: 1px solid rgba(16, 185, 129, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10b981;
  font-size: 26px;
}

.sport-page-header__eyebrow {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #10b981;
  margin-bottom: 2px;
}

.sport-page-header__title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: -0.02em;
}

/* Toolbar Filter Box */
.sports-toolbar {
  background: var(--tb-surface);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

/* Players Pill Table */
.players-pill-table {
  background: transparent !important;
}

.players-pill-table :deep(thead tr th) {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #94a3b8;
  border-bottom: 1px solid var(--tb-border);
  padding: 14px 16px;
}

.players-pill-table :deep(tbody tr) {
  transition: all 0.15s ease;
}

.players-pill-table :deep(tbody tr:hover) {
  background: rgba(255, 255, 255, 0.03) !important;
}

.players-pill-table :deep(tbody tr td) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px 16px;
}

/* Dorsal Blue Box */
.dorsal-blue-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  font-size: 0.92rem;
  font-weight: 900;
  border-radius: 6px;
}

/* Player Avatar and Name */
.player-avatar-pill {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--tb-border);
  flex-shrink: 0;
}

.player-avatar-image {
  display: block;
  width: 100% !important;
  height: 100% !important;
  border-radius: 50%;
  object-fit: cover !important;
}

.player-name-bold {
  margin-left: 8px;
  font-size: 0.95rem;
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
  transition: all 0.2s ease;
}

.team-badge-pill--interactive {
  cursor: pointer;
}

.team-badge-pill--interactive:hover {
  background: var(--tb-surface-hover);
  border-color: var(--tb-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}

.team-badge-pill--interactive:hover .team-pill-name {
  color: var(--tb-primary);
}

.team-badge-pill--interactive:hover .team-pill-crest {
  transform: scale(1.08);
}

.team-badge-pill .hover-icon {
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.team-badge-pill--interactive:hover .hover-icon {
  opacity: 1;
  color: var(--tb-primary);
  transform: translate(2px, -2px);
}

.team-pill-crest {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.team-pill-name {
  font-size: 0.86rem;
  font-weight: 700;
  color: #ffffff;
  transition: color 0.15s ease;
}

/* Condicion Dynamic Chip */
.condicion-dynamic-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 6px;
  border-width: 1px;
  border-style: solid;
}

/* Modal Form Styles */
.dialog-header-section {
  border-bottom: 1px solid var(--tb-border);
  padding: 18px 22px;
}

.header-logo-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
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

.condicion-selector-grid {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
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

.cond-select-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  text-align: left;
}

.cond-title {
  font-size: 0.82rem;
  font-weight: 800;
}

.cond-desc {
  font-size: 0.68rem;
  opacity: 0.75;
  font-weight: 500;
}

/* Number selector scroll */
.number-selector-scroll {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: 6px;
  max-height: 150px;
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

/* Resaltar números bloqueados en rojo tachado */
.num-select-btn--disabled,
.num-select-btn:disabled {
  opacity: 1 !important;
  cursor: not-allowed !important;
  background: rgba(239, 68, 68, 0.22) !important;
  border: 1px solid rgba(239, 68, 68, 0.7) !important;
  color: #f87171 !important;
  text-decoration: line-through !important;
  font-weight: 900 !important;
  pointer-events: none !important;
}

.view-mode-toggle {
  display: flex;
  align-items: center;
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 3px;
  gap: 2px;
}

.view-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--tb-radius-sm);
  background: transparent;
  border: none;
  color: var(--tb-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-mode-btn:hover {
  color: #ffffff;
}

.view-mode-btn--active {
  background: var(--tb-primary);
  color: #0b111e !important;
  font-weight: 700;
}

.player-card {
  border-radius: var(--tb-radius-lg);
  border: 1px solid var(--tb-border);
  background: var(--tb-surface-raised);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  overflow: hidden;
}

.player-card:hover {
  transform: translateY(-4px);
  border-color: var(--tb-primary);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
}

.player-card__top {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  width: 100%;
  padding: 0 8px;
  box-sizing: border-box;
}

.player-card__number {
  flex: 0 0 36px;
  text-align: center;
}

.player-card__avatar {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  border: 2px solid var(--tb-border);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
}

.player-card__avatar .player-avatar-image {
  width: 100% !important;
  height: 100% !important;
  border-radius: 50%;
  object-fit: cover !important;
}

.player-card__crest {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border: 1px solid var(--tb-border);
  cursor: pointer;
}

.player-card__crest-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.player-card__meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 12px;
}

.border-top-dark {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.inline-edit-box {
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 600px) {
  .position-selector-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
