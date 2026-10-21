<script setup>
import { computed, reactive, ref, watch } from 'vue'
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
import { getDefaultTeamLogo } from '@/utils/defaultAssets'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const store = useTournamentStore()

// Formularios de registro
const goalForm = reactive({ team: '', player: '', assistPlayer: '', minute: 1, isOwnGoal: false })
const eventForm = reactive({
  type: '',
  team: '',
  player: '',
  playerIn: '',
  playerOut: '',
  injuryTime: '',
  minute: 1,
})

const goalSaving = reactive({ value: false })
const eventSaving = reactive({ value: false })
const matchEditDialog = ref(false)
const matchEditSaving = ref(false)
const deletingMatch = ref(false)
const showMatchdayHistory = ref(false)
const matchEditForm = reactive({
  matchday: 1,
  matchDate: '',
  matchTime: '',
  stadium: '',
  referee: '',
  status: 'SCHEDULED',
})

// Modal de edición de eventos o goles
const editDialog = ref(false)
const editSaving = ref(false)
const editForm = reactive({
  isGoal: false,
  index: -1,
  id: '',
  team: '',
  player: '',
  assistPlayer: '',
  isOwnGoal: false,
  type: 'ASSIST',
  playerIn: '',
  playerOut: '',
  injuryTime: '',
  minute: 1,
})

const match = computed(() => store.matchDetail)
const isFinished = computed(() => normalizeMatchStatus(match.value?.status) === 'FINISHED')
const isMatchLive = computed(() => ['IN_PROGRESS', 'LIVE', 'EN VIVO', 'INICIADO']
  .includes(normalizeMatchStatus(match.value?.status)))
const isLive = computed(() => isMatchLive.value)
const isSuspended = computed(() => ['SUSPENDED', 'POSTPONED'].includes(normalizeMatchStatus(match.value?.status)))
const isPostponed = computed(() => normalizeMatchStatus(match.value?.status) === 'POSTPONED')
const hasValidScheduleDate = computed(() => {
  if (!match.value?.date) return false
  const date = new Date(match.value.date)
  return !Number.isNaN(date.getTime())
})
const hasUnfinishedPriorMatchday = computed(() => Boolean(match.value && store.matches.some((item) => (
  Number(item.matchday) < Number(match.value.matchday) &&
  normalizeMatchStatus(item.status) !== 'FINISHED'
))))
const canStartMatch = computed(() => hasValidScheduleDate.value && !hasUnfinishedPriorMatchday.value)
const requiresRescheduledDate = computed(() => (
  ['SUSPENDED', 'POSTPONED'].includes(normalizeMatchStatus(matchEditForm.status)) &&
  normalizeMatchStatus(matchEditForm.status) !== normalizeMatchStatus(match.value?.status)
))
const participantTeams = computed(() => [match.value?.homeTeam, match.value?.awayTeam].filter(Boolean))
const matchdayOptions = computed(() => {
  const expectedRounds = store.teams.length > 1 ? 2 * (store.teams.length - 1) : 1
  const existingMax = Math.max(0, ...store.matches.map((item) => Number(item.matchday) || 0))
  return Array.from({ length: Math.max(expectedRounds, existingMax) }, (_, index) => index + 1)
})
const headToHeadMatches = computed(() => {
  const homeId = getId(match.value?.homeTeam)
  const awayId = getId(match.value?.awayTeam)
  if (!homeId || !awayId) return []

  return store.matches
    .filter((item) => {
      if (item._id === match.value?._id) return false
      const itemHomeId = getId(item.homeTeam)
      const itemAwayId = getId(item.awayTeam)
      return (itemHomeId === homeId && itemAwayId === awayId) ||
        (itemHomeId === awayId && itemAwayId === homeId)
    })
    .sort((first, second) => Number(first.matchday) - Number(second.matchday))
})
const playedHeadToHeadMatches = computed(() => headToHeadMatches.value
  .filter((item) => normalizeMatchStatus(item.status) === 'FINISHED'))
const upcomingHeadToHeadMatches = computed(() => headToHeadMatches.value
  .filter((item) => normalizeMatchStatus(item.status) !== 'FINISHED'))
const freeMatchdays = computed(() => {
  const homeId = getId(match.value?.homeTeam)
  const awayId = getId(match.value?.awayTeam)
  const usedMatchdays = new Set(
    store.matches
      .filter((item) => item._id !== match.value?._id && (
        [getId(item.homeTeam), getId(item.awayTeam)].includes(homeId) ||
        [getId(item.homeTeam), getId(item.awayTeam)].includes(awayId)
      ))
      .map((item) => Number(item.matchday)),
  )
  return matchdayOptions.value.filter((matchday) => !usedMatchdays.has(matchday))
})

const teamOptions = computed(() => participantTeams.value.map((team) => ({
  label: team.name || team.nombre || store.teams.find((item) => item._id === getId(team))?.name || 'Equipo',
  value: getId(team),
})))

const formatPlayerOption = (player) => {
  const num = player.number ?? player.dorsal ?? '?'
  const name = player.name || player.nombre || 'Jugador'
  const cond = player.status || player.condicion || 'TITULAR'
  const isExpelled = expelledPlayerIds.value.has(getId(player))
  const tag = isExpelled ? ' [EXPULSADO]' : cond !== 'TITULAR' ? ` [${cond}]` : ''
  return `#${num} ${name}${tag}`
}

// Helper que compara si el jugador pertenece al equipo seleccionado (por ID o por Nombre)
const isPlayerInTeam = (player, selectedTeamId) => {
  if (!selectedTeamId) return false
  const targetId = String(selectedTeamId)

  const targetTeamObj = store.teams.find((t) => String(t._id) === targetId) ||
                        participantTeams.value.find((t) => String(getId(t)) === targetId)

  const targetName = targetTeamObj
    ? String(targetTeamObj.name || targetTeamObj.nombre || '').toLowerCase().trim()
    : ''

  const rawTeam = player.team || player.equipo
  let pTeamId = ''
  let pTeamName = ''

  if (rawTeam && typeof rawTeam === 'object') {
    pTeamId = String(rawTeam._id || rawTeam.id || '')
    pTeamName = String(rawTeam.name || rawTeam.nombre || '').toLowerCase().trim()
  } else if (rawTeam) {
    pTeamId = String(rawTeam)
    pTeamName = String(rawTeam).toLowerCase().trim()
  }

  return (
    (targetId && pTeamId === targetId) ||
    (targetName && pTeamName === targetName)
  )
}

// ─── Control Disciplinario y Expulsiones ──────────────────────────────────────
// Detecta jugadores expulsados en este partido (Roja directa o 2 amarillas)
const expelledPlayerIds = computed(() => {
  const expelled = new Set()
  const yellowCounts = new Map()

  const events = match.value?.events || []
  for (const ev of events) {
    const pId = getId(ev.player)
    if (!pId) continue

    const evType = String(ev.type || '').toUpperCase()
    if (evType === 'RED_CARD' || evType.includes('ROJA')) {
      expelled.add(pId)
    } else if (evType === 'YELLOW_CARD' || evType.includes('AMARILLA')) {
      const count = (yellowCounts.get(pId) || 0) + 1
      yellowCounts.set(pId, count)
      if (count >= 2) {
        expelled.add(pId)
      }
    }
  }

  return expelled
})

// Jugadores que ya salieron de cancha por sustitución o lesión
const substitutedOutIds = computed(() => {
  const out = new Set()
  const events = match.value?.events || []
  for (const ev of events) {
    const evType = String(ev.type || '').toUpperCase()
    if (evType === 'SUBSTITUTION' || evType.includes('SUSTITUCION')) {
      const outId = getId(ev.playerOut) || getId(ev.player)
      if (outId) out.add(outId)
    } else if (evType === 'INJURY' || evType.includes('LESION')) {
      const outId = getId(ev.playerOut) || getId(ev.player)
      if (outId) out.add(outId)
    }
  }
  return out
})

// Validación de elegibilidad: Solo TITULAR o SUPLENTE, sin expulsión ni sustitución previa
const isPlayerEligible = (player, targetTeamId, options = {}) => {
  if (!isPlayerInTeam(player, targetTeamId)) return false

  const pId = getId(player)

  // No debe estar expulsado
  if (expelledPlayerIds.value.has(pId)) return false

  // La condición en el plantel debe ser TITULAR o SUPLENTE
  const status = String(player.status || player.condicion || 'TITULAR').toUpperCase()
  if (status !== 'TITULAR' && status !== 'SUPLENTE') {
    return false
  }

  // Si se exige que esté en cancha (no haber sido sustituido previamente)
  if (!options.allowSubstitutedOut && substitutedOutIds.value.has(pId)) {
    return false
  }

  return true
}

// Opciones de jugadores para goleador
const goalPlayerOptions = computed(() => store.players
  .filter((player) => isPlayerEligible(player, goalForm.team))
  .map((player) => ({ label: formatPlayerOption(player), value: getId(player) })))

// Opciones de jugadores para asistencia
const assistPlayerOptions = computed(() => store.players
  .filter((player) => isPlayerEligible(player, goalForm.team) && String(getId(player)) !== String(goalForm.player))
  .map((player) => ({ label: formatPlayerOption(player), value: getId(player) })))

// Opciones de jugador principal para eventos (tarjeta, asistencia, lesionado)
const eventPlayerOptions = computed(() => store.players
  .filter((player) => isPlayerEligible(player, eventForm.team))
  .map((player) => ({ label: formatPlayerOption(player), value: getId(player) })))

// Opciones de jugador que sale en sustitución (debe estar en cancha)
const playerOutOptions = computed(() => store.players
  .filter((player) => isPlayerEligible(player, eventForm.team))
  .map((player) => ({ label: formatPlayerOption(player), value: getId(player) })))

// Opciones de jugador que ingresa en sustitución (suplente disponible)
const playerInOptions = computed(() => store.players
  .filter((player) => {
    if (!isPlayerInTeam(player, eventForm.team)) return false
    const pId = getId(player)
    if (expelledPlayerIds.value.has(pId)) return false
    if (String(pId) === String(eventForm.playerOut || eventForm.player)) return false
    const status = String(player.status || player.condicion || 'TITULAR').toUpperCase()
    return status === 'TITULAR' || status === 'SUPLENTE'
  })
  .map((player) => ({ label: formatPlayerOption(player), value: getId(player) })))

// Mantiene disponibles los jugadores de la incidencia abierta aunque su estado actual haya cambiado.
const editTeamForPlayer = computed(() => {
  if (!editForm.isGoal || !editForm.isOwnGoal) return editForm.team
  return getId(match.value?.homeTeam) === editForm.team
    ? getId(match.value?.awayTeam)
    : getId(match.value?.homeTeam)
})

const isSelectedEditPlayer = (player) => (
  [editForm.player, editForm.assistPlayer, editForm.playerIn, editForm.playerOut].includes(getId(player))
)

const editPlayerOptions = computed(() => store.players
  .filter((player) => (
    (isPlayerInTeam(player, editTeamForPlayer.value) || isSelectedEditPlayer(player)) &&
    (
      ['TITULAR', 'SUPLENTE'].includes(String(player.status || player.condicion || 'TITULAR').toUpperCase()) ||
      isSelectedEditPlayer(player)
    )
  ))
  .map((player) => ({ label: formatPlayerOption(player), value: getId(player) })))

const editAssistOptions = computed(() => store.players
  .filter((player) => isPlayerInTeam(player, editForm.team) && (
    ['TITULAR', 'SUPLENTE'].includes(String(player.status || player.condicion || 'TITULAR').toUpperCase()) ||
    getId(player) === editForm.assistPlayer
  ) && String(getId(player)) !== String(editForm.player))
  .map((player) => ({ label: formatPlayerOption(player), value: getId(player) })))

const playerName = (value) => {
  if (value && typeof value === 'object') {
    return value.name || value.nombre || 'Jugador'
  }
  const found = store.players.find((player) => getId(player) === getId(value))
  return found?.name || found?.nombre || 'Jugador'
}

const teamName = (value) => {
  if (value && typeof value === 'object') {
    return value.name || value.nombre || 'Equipo'
  }
  const found = store.teams.find((team) => getId(team) === getId(value))
  return found?.name || found?.nombre || 'Equipo'
}

const teamStadium = (value) => {
  const teamId = getId(value)
  const team = (value && typeof value === 'object')
    ? value
    : store.teams.find((item) => getId(item) === teamId)
  const venues = [team?.cancha, team?.estadio, team?.stadium]
    .map((venue) => String(venue || '').trim())
    .filter((venue) => venue && !['cancha local', 'cancha principal'].includes(venue.toLowerCase()))
  return venues[0] || 'Cancha Local'
}

// ─── Cronología del Encuentro (Timeline) ──────────────────────────────────────
const timeline = computed(() => {
  if (!match.value) {
    return []
  }

  const homeId = getId(match.value.homeTeam)
  const awayId = getId(match.value.awayTeam)

  const buildEvent = (item, type, sourceOrder) => {
    let teamId = getId(item.team)
    const isOwnGoal = type === 'OWN_GOAL' || Boolean(item.isOwnGoal) || Boolean(item.isAutogol)

    // Resolver nombre del jugador
    let pName = ''
    if (item.player) {
      pName = playerName(item.player)
    } else if (item.scorer) {
      pName = item.scorer
    }

    // Resolver equipo si venía vacío (ej. datos precargados)
    if (!teamId && pName) {
      const foundP = store.players.find((p) =>
        (p.name && p.name.trim().toLowerCase() === pName.trim().toLowerCase()) ||
        (p.nombre && p.nombre.trim().toLowerCase() === pName.trim().toLowerCase())
      )
      if (foundP) {
        if (isPlayerInTeam(foundP, homeId)) teamId = homeId
        else if (isPlayerInTeam(foundP, awayId)) teamId = awayId
      }
    }

    // Nombre de asistente si existe
    let assistName = ''
    if (item.assistPlayer) {
      assistName = playerName(item.assistPlayer)
    } else if (item.assist) {
      assistName = item.assist
    }

    // Nombres para sustitución
    const playerInName = item.playerIn ? playerName(item.playerIn) : ''
    const playerOutName = item.playerOut ? playerName(item.playerOut) : (pName || '')

    // Normalizar tipo de evento
    const normType = String(type || '').toUpperCase()
    let displayType = normType
    let icon = 'sports_soccer'
    let color = 'positive'

    if (isOwnGoal) {
      displayType = 'OWN_GOAL'
      icon = 'sports_soccer'
      color = 'negative'
    } else if (normType === 'GOAL') {
      displayType = 'GOAL'
      icon = 'sports_soccer'
      color = 'positive'
    } else if (normType === 'ASSIST' || normType.includes('ASISTENCIA')) {
      displayType = 'ASSIST'
      icon = 'assistant'
      color = 'info'
    } else if (normType === 'YELLOW_CARD' || normType.includes('AMARILLA')) {
      displayType = 'YELLOW_CARD'
      icon = 'warning'
      color = 'warning'
    } else if (normType === 'RED_CARD' || normType.includes('ROJA')) {
      displayType = 'RED_CARD'
      icon = 'cancel'
      color = 'negative'
    } else if (normType === 'SUBSTITUTION' || normType.includes('SUSTITUCION') || normType.includes('CAMBIO')) {
      displayType = 'SUBSTITUTION'
      icon = 'swap_horiz'
      color = 'primary'
    } else if (normType === 'INJURY' || normType.includes('LESION')) {
      displayType = 'INJURY'
      icon = 'medical_services'
      color = 'deep-orange'
    }

    // Determinación de lado en la cancha
    let side = 'neutral'
    if (teamId === homeId) side = 'home'
    else if (teamId === awayId) side = 'away'

    return {
      ...item,
      rawItem: item,
      isGoal: type === 'GOAL' || isOwnGoal,
      type: displayType,
      teamId,
      playerId: getId(item.player),
      playerName: pName || 'Jugador',
      assistName,
      playerInName,
      playerOutName,
      minute: Number(item.minute) || 0,
      label: isOwnGoal ? 'Autogol (Gol en contra)' : eventTypeLabel(displayType),
      icon,
      color,
      side,
      sourceOrder,
    }
  }

  const goals = (match.value.goals || []).map((goal, index) =>
    buildEvent(goal, goal.isOwnGoal || goal.isAutogol ? 'OWN_GOAL' : 'GOAL', index)
  )

  const events = (match.value.events || [])
    .filter((event) => {
      if (event.type === 'OWN_GOAL') {
        return !(match.value.goals || []).some(
          (g) => (g.isOwnGoal || g.isAutogol) && getId(g.player) === getId(event.player) && Number(g.minute) === Number(event.minute)
        )
      }
      return true
    })
    .map((event, index) => buildEvent(event, event.type, goals.length + index))

  return [...goals, ...events].sort(
    (a, b) => Number(a.minute) - Number(b.minute) || Number(a.sourceOrder) - Number(b.sourceOrder)
  )
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
  eventForm.playerIn = ''
  eventForm.playerOut = ''
})

const apiGoals = () => (match.value?.goals || []).map((goal) => ({
  _id: getId(goal._id) || undefined,
  player: getId(goal.player) || null,
  scorer: goal.scorer || '',
  team: getId(goal.team),
  minute: Number.isFinite(Number(goal.minute)) ? Number(goal.minute) : 1,
  isOwnGoal: Boolean(goal.isOwnGoal || goal.isAutogol),
  isAutogol: Boolean(goal.isOwnGoal || goal.isAutogol),
  ...(goal.assistPlayer ? { assistPlayer: getId(goal.assistPlayer) } : {}),
  ...(goal.assist ? { assist: goal.assist } : {}),
}))

const apiEvents = () => (match.value?.events || []).map((event) => ({
  _id: getId(event._id) || undefined,
  type: event.type,
  player: getId(event.player) || null,
  team: getId(event.team) || null,
  minute: Number.isFinite(Number(event.minute)) ? Number(event.minute) : 1,
  playerIn: getId(event.playerIn) || null,
  playerOut: getId(event.playerOut) || null,
  injuryTime: event.injuryTime || '',
  description: event.description || '',
}))

const scoreFor = (teamId, goals) => goals.filter((goal) => String(goal.team) === String(teamId)).length
const notifyIfMatchNotLive = () => {
  if (!isMatchLive.value) {
    $q.notify({ type: 'warning', message: 'Debes iniciar el partido para poder registrar eventos' })
  }
}
const matchStatusOptions = [
  { label: 'Programado', value: 'SCHEDULED' },
  { label: 'En vivo', value: 'IN_PROGRESS' },
  { label: 'Finalizado', value: 'FINISHED' },
  { label: 'Suspendido', value: 'SUSPENDED' },
]

const getLocalDateInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const getLocalTimeInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part) => String(part).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const openMatchEditDialog = () => {
  if (!match.value) return
  if (isFinished.value) {
    $q.notify({ type: 'warning', message: 'El partido finalizado no se puede editar.' })
    return
  }
  Object.assign(matchEditForm, {
    matchday: Number(match.value.matchday) || 1,
    matchDate: getLocalDateInput(match.value.date),
    matchTime: getLocalTimeInput(match.value.date),
    stadium: match.value.stadium || teamStadium(match.value.homeTeam) || 'Cancha Local',
    referee: match.value.referee || '',
    status: normalizeMatchStatus(match.value.status) || 'SCHEDULED',
  })
  matchEditDialog.value = true
}

const saveMatchEdits = async () => {
  if (!match.value) return
  if (Boolean(matchEditForm.matchDate) !== Boolean(matchEditForm.matchTime)) {
    $q.notify({ type: 'warning', message: 'Completa tanto la fecha como la hora, o deja ambos campos vacíos.' })
    return
  }
  if (['SUSPENDED', 'POSTPONED'].includes(normalizeMatchStatus(matchEditForm.status)) ||
      ['SUSPENDED', 'POSTPONED'].includes(normalizeMatchStatus(match.value.status))) {
    if (!matchEditForm.matchDate || !matchEditForm.matchTime) {
      $q.notify({
        type: 'warning',
        message: '⚠️ PARTIDO SUSPENDIDO: Este encuentro debe ser reagendado con una nueva fecha y hora para no afectar la continuidad del torneo.',
      })
      return
    }
    const proposedDate = new Date(`${matchEditForm.matchDate}T${matchEditForm.matchTime}:00`)
    const originalDate = match.value.originalDate || match.value.date
    if (originalDate && proposedDate < new Date(originalDate)) {
      $q.notify({ type: 'warning', message: 'La nueva fecha no puede ser anterior a la fecha original del encuentro.' })
      return
    }
  }
  if (requiresRescheduledDate.value) {
    const previousDate = getLocalDateInput(match.value.date)
    const previousTime = getLocalTimeInput(match.value.date)
    const dateChanged = matchEditForm.matchDate !== previousDate || matchEditForm.matchTime !== previousTime
    if (!matchEditForm.matchDate || !matchEditForm.matchTime || !dateChanged) {
      $q.notify({
        type: 'warning',
        message: '⚠️ PARTIDO SUSPENDIDO: Este encuentro debe ser reagendado con una nueva fecha y hora para no afectar la continuidad del torneo.',
      })
      return
    }
  }
  if (normalizeMatchStatus(matchEditForm.status) === 'IN_PROGRESS' &&
      (!matchEditForm.matchDate || !matchEditForm.matchTime)) {
    $q.notify({ type: 'warning', message: 'No se puede iniciar un partido sin fecha y hora válidas.' })
    return
  }

  matchEditSaving.value = true
  try {
    const matchDate = matchEditForm.matchDate
      ? new Date(`${matchEditForm.matchDate}T${matchEditForm.matchTime}:00`)
      : null
    if (matchDate && Number.isNaN(matchDate.getTime())) {
      throw new Error('La fecha y la hora ingresadas no son válidas.')
    }

    await store.updateMatch(match.value._id, {
      matchday: Number(matchEditForm.matchday),
      matchdayDate: matchEditForm.matchDate,
      date: matchDate ? matchDate.toISOString() : null,
      stadium: matchEditForm.stadium.trim(),
      referee: matchEditForm.referee.trim(),
      status: matchEditForm.status,
    })
    matchEditDialog.value = false
    $q.notify({ type: 'positive', message: 'Datos generales y estado del partido actualizados.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
  } finally {
    matchEditSaving.value = false
  }
}

watch(() => matchEditForm.status, (status) => {
  const normalizedStatus = normalizeMatchStatus(status)
  if (!['SUSPENDED', 'POSTPONED'].includes(normalizedStatus) ||
      normalizedStatus === normalizeMatchStatus(match.value?.status)) return

  $q.dialog({
    title: '⚠️ PARTIDO SUSPENDIDO',
    message: '⚠️ PARTIDO SUSPENDIDO: Este encuentro debe ser reagendado con una nueva fecha y hora para no afectar la continuidad del torneo.',
    ok: { label: 'Entendido', color: 'warning' },
    persistent: true,
  })
})

const confirmDeleteMatch = () => {
  if (isMatchLive.value) {
    $q.notify({
      type: 'warning',
      message: 'No se puede eliminar un partido en juego. Debes cambiar su estado a PROGRAMADO antes de eliminarlo.',
    })
    return
  }
  if (!match.value || deletingMatch.value || isFinished.value) {
    if (isFinished.value) {
      $q.notify({
        type: 'negative',
        message: 'Inmutabilidad de encuentros concluidos: Un partido FINALIZADO no puede ser eliminado.',
      })
    }
    return
  }
  const matchId = match.value._id

  $q.dialog({
    title: 'Eliminar partido',
    message: '¿Estás seguro de eliminar este partido? Esta acción no se puede deshacer.',
    cancel: { label: 'Cancelar', flat: true, color: 'grey-5' },
    ok: { label: 'Eliminar Partido', color: 'negative', icon: 'delete' },
    persistent: true,
  }).onOk(async () => {
    deletingMatch.value = true
    try {
      await store.deleteMatch(matchId)
      matchEditDialog.value = false
      $q.notify({ type: 'positive', message: 'Partido eliminado correctamente.' })
      await router.push('/partidos')
    } catch (error) {
      $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
    } finally {
      deletingMatch.value = false
    }
  })
}

// ─── Registro de Goles ────────────────────────────────────────────────────────
const registerGoal = async () => {
  if (!isMatchLive.value) {
    notifyIfMatchNotLive()
    return
  }
  if (!match.value) return

  goalSaving.value = true
  try {
    const homeTeamId = getId(match.value.homeTeam)
    const awayTeamId = getId(match.value.awayTeam)

    const isOwnGoal = Boolean(goalForm.isOwnGoal)
    const scoringTeam = isOwnGoal
      ? (goalForm.team === homeTeamId ? awayTeamId : homeTeamId)
      : goalForm.team

    const newGoal = {
      player: goalForm.player,
      team: scoringTeam,
      minute: Number(goalForm.minute),
      isOwnGoal,
      isAutogol: isOwnGoal,
      ...(goalForm.assistPlayer && !isOwnGoal ? { assistPlayer: goalForm.assistPlayer } : {}),
    }

    const goals = [...apiGoals(), newGoal]

    // Si tiene asistencia y no es autogol, registramos la asistencia en los eventos
    if (goalForm.assistPlayer && !isOwnGoal) {
      const existingEvents = apiEvents()
      const newEvent = {
        type: 'ASSIST',
        player: goalForm.assistPlayer,
        team: scoringTeam,
        minute: Number(goalForm.minute),
      }
      await store.updateMatchEvents(match.value._id, [...existingEvents, newEvent])
    }

    await store.updateMatchResult(match.value._id, {
      homeScore: scoreFor(homeTeamId, goals),
      awayScore: scoreFor(awayTeamId, goals),
      status: isFinished.value ? 'FINISHED' : isSuspended.value ? normalizeMatchStatus(match.value.status) : 'IN_PROGRESS',
      goals,
    })

    $q.notify({
      type: 'positive',
      message: isOwnGoal
        ? 'Autogol registrado: el tanto sumó al marcador del equipo rival.'
        : 'Gol registrado y marcador actualizado en vivo.',
    })
    Object.assign(goalForm, { team: '', player: '', assistPlayer: '', minute: 1, isOwnGoal: false })
  } catch (error) {
    $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
  } finally {
    goalSaving.value = false
  }
}

// ─── Registro de Incidencias / Eventos ─────────────────────────────────────────
const registerEvent = async () => {
  if (!isMatchLive.value) {
    notifyIfMatchNotLive()
    return
  }
  if (!match.value) return

  eventSaving.value = true
  try {
    const existingEvents = apiEvents()

    const newEvent = {
      type: eventForm.type,
      team: eventForm.team,
      minute: Number(eventForm.minute),
      player: eventForm.player || (eventForm.type === 'SUBSTITUTION' ? eventForm.playerOut : null),
      playerIn: eventForm.playerIn || null,
      playerOut: eventForm.playerOut || (eventForm.type === 'INJURY' ? eventForm.player : null),
      injuryTime: eventForm.injuryTime || '',
    }

    // Si es lesión, validamos que haya jugador que entra en sustitución
    if (eventForm.type === 'INJURY') {
      if (!eventForm.player) {
        $q.notify({ type: 'warning', message: 'Selecciona el jugador lesionado.' })
        eventSaving.value = false
        return
      }
      if (!eventForm.playerIn) {
        $q.notify({ type: 'warning', message: 'Para un jugador lesionado es obligatorio registrar el jugador sustituto que ingresa.' })
        eventSaving.value = false
        return
      }
    }

    // Si es sustitución directa, validamos ambos jugadores
    if (eventForm.type === 'SUBSTITUTION') {
      if (!eventForm.playerOut || !eventForm.playerIn) {
        $q.notify({ type: 'warning', message: 'Debes seleccionar el jugador que sale y el jugador que ingresa.' })
        eventSaving.value = false
        return
      }
    }

    const updatedEvents = [...existingEvents, newEvent]
    await store.updateMatchEvents(match.value._id, updatedEvents)

    // Si fue tarjeta roja directa o lesión, actualizar también condición en la store/bd
    if (eventForm.type === 'RED_CARD' && eventForm.player) {
      await store.updatePlayer(eventForm.player, { status: 'SANCIONADO_ROJA', condicion: 'SANCIONADO_ROJA' })
    } else if (eventForm.type === 'INJURY' && eventForm.player) {
      await store.updatePlayer(eventForm.player, { status: 'LESIONADO', condicion: 'LESIONADO' })
    }

    $q.notify({
      type: 'positive',
      message: `${eventTypeLabel(eventForm.type)} registrado con éxito en el acta.`,
    })

    Object.assign(eventForm, {
      type: 'ASSIST',
      team: '',
      player: '',
      playerIn: '',
      playerOut: '',
      injuryTime: '',
      minute: 1,
    })
  } catch (error) {
    $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
  } finally {
    eventSaving.value = false
  }
}

// ─── Edición y Corrección de Eventos / Goles Erróneos ────────────────────────
const openEditItem = (event) => {
  Object.assign(editForm, {
    isGoal: event.isGoal,
    id: getId(event.rawItem?._id) || '',
    index: event.isGoal
      ? event.sourceOrder
      : event.sourceOrder - (match.value?.goals?.length || 0),
    team: event.teamId || '',
    player: event.playerId || '',
    assistPlayer: getId(event.rawItem?.assistPlayer) || '',
    isOwnGoal: Boolean(event.rawItem?.isOwnGoal || event.rawItem?.isAutogol),
    type: event.type,
    playerIn: getId(event.rawItem?.playerIn) || '',
    playerOut: getId(event.rawItem?.playerOut) || '',
    injuryTime: event.rawItem?.injuryTime || '',
    minute: Number(event.minute) || 1,
  })

  editDialog.value = true
}

const saveEditedItem = async () => {
  if (!isMatchLive.value) {
    notifyIfMatchNotLive()
    return
  }
  editSaving.value = true
  try {
    const homeTeamId = getId(match.value.homeTeam)
    const awayTeamId = getId(match.value.awayTeam)

    if (editForm.isGoal) {
      // Modificar gol
      const currentGoals = apiGoals()
      let targetIndex = currentGoals.findIndex((goal) => goal._id && String(goal._id) === editForm.id)
      if (targetIndex < 0 && editForm.index >= 0 && editForm.index < currentGoals.length) {
        targetIndex = editForm.index
      }
      if (targetIndex < 0) throw new Error('No se encontró el gol que deseas corregir.')

      currentGoals[targetIndex] = {
        ...currentGoals[targetIndex],
        player: editForm.player || null,
        team: editForm.team,
        minute: Number(editForm.minute),
        isOwnGoal: Boolean(editForm.isOwnGoal),
        isAutogol: Boolean(editForm.isOwnGoal),
        assistPlayer: editForm.assistPlayer && !editForm.isOwnGoal ? editForm.assistPlayer : null,
        assist: '',
      }

      await store.updateMatchResult(match.value._id, {
        homeScore: scoreFor(homeTeamId, currentGoals),
        awayScore: scoreFor(awayTeamId, currentGoals),
        goals: currentGoals,
      })

      $q.notify({ type: 'positive', message: 'Gol modificado y marcador recalculado correctamente.' })
    } else {
      // Modificar evento disciplinario o sustitución
      const currentEvents = apiEvents()

      let targetIndex = currentEvents.findIndex((event) => event._id && String(event._id) === editForm.id)
      if (targetIndex < 0 && editForm.index >= 0 && editForm.index < currentEvents.length) {
        targetIndex = editForm.index
      }
      if (targetIndex < 0) throw new Error('No se encontró la incidencia que deseas corregir.')

      currentEvents[targetIndex] = {
        ...currentEvents[targetIndex],
        type: editForm.type,
        player: editForm.player || editForm.playerOut || null,
        team: editForm.team,
        minute: Number(editForm.minute),
        playerIn: editForm.playerIn || null,
        playerOut: editForm.playerOut || null,
        injuryTime: editForm.injuryTime || '',
      }

      await store.updateMatchEvents(match.value._id, currentEvents)
      $q.notify({ type: 'positive', message: 'Incidencia modificada correctamente.' })
    }

    editDialog.value = false
  } catch (error) {
    $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
  } finally {
    editSaving.value = false
  }
}

// ─── Eliminación de Evento o Gol Erróneo ──────────────────────────────────────
const removeItem = (event) => {
  $q.dialog({
    title: 'Confirmar corrección',
    message: `¿Deseas eliminar este registro (${event.label} de ${event.playerName} al minuto ${event.minute}')? Si es un gol, el marcador del encuentro se ajustará de inmediato.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Eliminar', color: 'negative' },
    cancel: { label: 'Cancelar', flat: true, color: 'grey-5' },
  }).onOk(async () => {
    try {
      const homeTeamId = getId(match.value.homeTeam)
      const awayTeamId = getId(match.value.awayTeam)

      if (event.isGoal) {
        const currentGoals = apiGoals()
        const targetIndex = event.sourceOrder
        if (targetIndex >= 0 && targetIndex < currentGoals.length) {
          currentGoals.splice(targetIndex, 1)
        }
        await store.updateMatchResult(match.value._id, {
          homeScore: scoreFor(homeTeamId, currentGoals),
          awayScore: scoreFor(awayTeamId, currentGoals),
          goals: currentGoals,
        })
        $q.notify({ type: 'positive', message: 'Gol eliminado y marcador ajustado.' })
      } else {
        const currentEvents = apiEvents()
        let eventIndex = currentEvents.findIndex(
          (item) => item._id && String(item._id) === getId(event.rawItem?._id),
        )
        if (eventIndex < 0) {
          eventIndex = event.sourceOrder - (match.value.goals || []).length
        }
        if (eventIndex >= 0 && eventIndex < currentEvents.length) {
          currentEvents.splice(eventIndex, 1)
        }
        await store.updateMatchEvents(match.value._id, currentEvents)
        $q.notify({ type: 'positive', message: 'Incidencia eliminada del acta.' })
      }
    } catch (error) {
      $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
    }
  })
}

// ─── Inicio del Encuentro (Poner EN VIVO con Bandera Verde) ─────────────────
const startMatch = () => {
  if (!canStartMatch.value) {
    $q.notify({
      type: 'warning',
      message: !hasValidScheduleDate.value
        ? 'Asigna una fecha y hora válidas antes de iniciar el partido.'
        : 'Completa primero los partidos pendientes de jornadas anteriores.',
    })
    return
  }
  const isResuming = isSuspended.value
  $q.dialog({
    title: isResuming ? 'Reanudar Partido (Poner EN VIVO)' : 'Iniciar Partido (Poner EN VIVO)',
    message: isResuming
      ? '¿Confirmas la reprogramación e inicio del partido? El estado cambiará a EN VIVO.'
      : '¿Confirmas el inicio del partido? El estado cambiará a EN VIVO (Bandera Verde) y se habilitará el registro de incidencias en tiempo real.',
    cancel: { label: 'Cancelar', color: 'grey-5', flat: true },
    ok: { label: isResuming ? 'Reanudar Partido' : '🏁 Iniciar Partido (EN VIVO)', color: 'positive' },
    persistent: true,
  }).onOk(async () => {
    try {
      const goals = apiGoals()
      await store.updateMatchResult(match.value._id, {
        homeScore: scoreFor(getId(match.value.homeTeam), goals),
        awayScore: scoreFor(getId(match.value.awayTeam), goals),
        status: 'IN_PROGRESS',
        goals,
      })
      $q.notify({
        type: 'positive',
        message: isResuming
          ? 'Partido reanudado; encuentro oficialmente EN VIVO 🟢 🏁'
          : '¡Partido iniciado! Encuentro oficialmente EN VIVO 🟢 🏁',
        icon: 'flag',
      })
    } catch (error) {
      $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
    }
  })
}

// ─── Finalización del Encuentro (Bandera Roja) ───────────────────────────────
const finishMatch = () => {
  $q.dialog({
    title: 'Finalizar Encuentro (Bandera Roja)',
    message: '¿Confirmas la finalización del partido? Una vez finalizado (Bandera Roja), el resultado será oficial e impactará la tabla general de posiciones.',
    cancel: { label: 'Cancelar', color: 'grey-5', flat: true },
    ok: { label: '🏁 Sí, Finalizar Encuentro', color: 'negative' },
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
      $q.notify({
        type: 'positive',
        message: 'Partido finalizado con éxito 🔴 🏁.',
        icon: 'flag',
      })
    } catch (error) {
      $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
    }
  })
}
</script>

<template>
  <div class="match-detail-page">
    <!-- PAGE HEADER -->
    <div class="sport-page-header">
      <div class="sport-page-header__left">
        <q-btn flat round icon="arrow_back" color="grey-4" @click="router.push('/partidos')" class="q-mr-xs" />
        <div class="sport-page-header__icon-box">
          <q-icon name="sports" />
        </div>
        <div>
          <div class="sport-page-header__eyebrow">DETALLE DEL PARTIDO OFICIAL</div>
          <h1 class="sport-page-header__title">
            {{ match ? `${teamName(match.homeTeam)} vs ${teamName(match.awayTeam)}` : 'Partido' }}
          </h1>
        </div>
      </div>
    </div>

    <!-- ERROR BANNER -->
    <q-banner v-if="store.matchError" rounded class="bg-negative text-white q-mb-md">
      {{ store.matchError }}
    </q-banner>

    <div v-if="store.matchLoading && !match" class="q-pa-xl text-center">
      <q-spinner color="primary" size="48px" />
      <div class="text-caption text-grey-5 q-mt-md">Cargando acta oficial del encuentro...</div>
    </div>

    <template v-else-if="match">
      <!-- SCOREBOARD HERO BANNER -->
      <q-card flat class="sports-match-banner q-mb-xl">
        <q-card-section class="q-pa-lg">
          <div class="row items-center justify-between q-mb-md">
            <div class="row items-center gap-sm">
              <span class="matchday-tag">JORNADA {{ match.matchday }}</span>
              <span class="text-caption text-grey-4">{{ match.stadium || teamStadium(match.homeTeam) || 'Cancha Local' }}</span>
              <span v-if="match.referee" class="text-caption text-grey-5">
                <q-icon name="sports" size="14px" class="q-mr-xs" />Árbitro: {{ match.referee }}
              </span>
            </div>

            <!-- STATUS BADGE CON BANDERAS DEPORTIVAS -->
            <div class="row items-center gap-xs">
              <div v-if="isLive" class="match-flag-badge match-flag-badge--live">
                <span class="live-dot-pulse"></span>
                <span class="flag-symbol">🏁</span>
                <span>EN VIVO</span>
              </div>
              <div v-else-if="isFinished" class="match-flag-badge match-flag-badge--finished">
                <span class="flag-symbol">🏁</span>
                <span>FINALIZADO</span>
              </div>
              
              <div v-else class="match-flag-badge match-flag-badge--scheduled" style= "display: inline-flex;
    align-items: center;
    background: rgba(59, 130, 246, 0.12);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #60a5fa;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    padding: 4px 9px;
    border-radius: var(--tb-radius-full)">
                <q-icon name="schedule" size="14px" class="q-mr-xs" />
                <span>PROGRAMADO</span>
              </div>
            </div>
          </div>

          <div class="match-banner-grid">
            <!-- HOME TEAM -->
            <div class="banner-team banner-team--home">
              <div class="sport-crest-container banner-crest-box">
                <ImagePreview
                  :src="match.homeTeam?.logoUrl || match.homeTeam?.escudo_url"
                  :fallback="getDefaultTeamLogo(match.homeTeam)"
                  :alt="`Escudo de ${teamName(match.homeTeam)}`"
                  width="72px"
                  height="72px"
                />
              </div>
              <div class="banner-team-name">{{ teamName(match.homeTeam) }}</div>
              <div class="banner-team-role">LOCAL</div>
            </div>

            <!-- SCORE / VS -->
            <div class="banner-score text-center">
              <div v-if="match.status === 'SCHEDULED' || isSuspended" class="banner-vs-label">VS</div>
              <div v-else class="banner-digits">
                <span>{{ match.homeScore ?? 0 }}</span>
                <span class="banner-digits-dash">-</span>
                <span>{{ match.awayScore ?? 0 }}</span>
              </div>
              <div class="banner-date-text">
                {{ formatMatchDate(match.date) }}
              </div>
            </div>

            <!-- AWAY TEAM -->
            <div class="banner-team banner-team--away">
              <div class="sport-crest-container banner-crest-box">
                <ImagePreview
                  :src="match.awayTeam?.logoUrl || match.awayTeam?.escudo_url"
                  :fallback="getDefaultTeamLogo(match.awayTeam)"
                  :alt="`Escudo de ${teamName(match.awayTeam)}`"
                  width="72px"
                  height="72px"
                />
              </div>
              <div class="banner-team-name">{{ teamName(match.awayTeam) }}</div>
              <div class="banner-team-role">VISITANTE</div>
            </div>
          </div>

          <!-- CONTROLES DE PARTIDO CON BANDERAS DEPORTIVAS (INICIAR / FINALIZAR) -->
          <div class="row items-center justify-between q-mt-lg q-pt-md match-action-controls-bar">
            <!-- INDICADOR VISUAL / EXPLICATIVO DE BANDERAS -->
            <div class="row items-center gap-sm">
              <div v-if="isLive" class="sports-flag-indicator sports-flag-indicator--live">
                <span class="sports-flag-icon">🏁</span>
                <span class="text-caption text-weight-bold text-positive">Encuentro EN VIVO</span>
              </div>
              <div v-else-if="isFinished" class="sports-flag-indicator sports-flag-indicator--finished">
                <span class="sports-flag-icon">🏁</span>
                <span class="text-caption text-weight-bold text-negative">Encuentro FINALIZADO</span>
              </div>
              <div v-else class="sports-flag-indicator sports-flag-indicator--scheduled">
                <q-icon name="flag" color="grey-5" size="18px" />
                <span class="text-caption text-grey-4">
                  {{ isSuspended ? 'Partido suspendido' : 'En espera para inicio oficial' }}
                </span>
              </div>
            </div>

            <!-- BOTONES DE ACCIÓN: INICIAR (BANDERA VERDE) / FINALIZAR (BANDERA ROJA) -->
            <div class="row items-center gap-sm">
              <!-- BOTÓN INICIAR PARTIDO (BANDERA VERDE) -->
              <q-btn
                v-if="match.status === 'SCHEDULED' || isSuspended"
                unelevated
                class="flag-btn flag-btn--start"
                icon="flag"
                :label="isSuspended ? 'Reanudar Partido (EN VIVO)' : 'Iniciar Partido (EN VIVO)'"
                :disable="!canStartMatch"
                @click="startMatch"
              >
                <q-tooltip>
                  {{ !canStartMatch
                    ? !hasValidScheduleDate
                      ? 'Asigna fecha y hora válidas antes de iniciar'
                      : 'Completa primero los partidos pendientes de jornadas anteriores'
                    : isSuspended
                      ? 'Reprogramar/iniciar el encuentro nuevamente'
                      : 'Poner el partido EN VIVO con Bandera Verde' }}
                </q-tooltip>
              </q-btn>

              <!-- BOTÓN FINALIZAR PARTIDO (BANDERA ROJA) -->
              <q-btn
                v-if="isLive"
                unelevated
                class="flag-btn flag-btn--finish"
                icon="flag"
                label="Finalizar Partido"
                @click="finishMatch"
              >
                <q-tooltip>Dar por concluido el encuentro con Bandera Roja</q-tooltip>
              </q-btn>
              <q-btn
                v-if="!isFinished"
                unelevated
                color="secondary"
                icon="edit"
                label="Editar Partido"
                @click="openMatchEditDialog"
              />
              <q-btn
                v-if="!isFinished"
                flat
                color="negative"
                icon="delete"
                label="Eliminar Partido"
                :loading="deletingMatch"
                @click="confirmDeleteMatch"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- REGISTRATION FORMS (GOAL & EVENT) IF NOT FINISHED -->
      <div v-if="!isFinished" class="row q-col-gutter-lg q-mb-xl">
        <!-- FORM 1: GOAL REGISTRATION -->
        <div class="col-12 col-lg-6">
          <q-card flat class="sports-panel-card full-height">
            <q-card-section class="q-pa-lg">
              <div class="row items-center gap-sm q-mb-xs">
                <q-icon name="sports_soccer" color="primary" size="20px" />
                <div class="text-subtitle1 text-weight-bold text-white">Registrar Gol</div>
              </div>
              <div class="text-caption text-grey-5 q-mb-md">
                Solo jugadores titulares o suplentes habilitados (no expulsados ni lesionados).
              </div>

              <q-banner v-if="!isMatchLive" dense class="bg-warning text-dark q-mb-md">
                Debes iniciar el partido para poder registrar eventos.
              </q-banner>
              <q-form class="q-gutter-y-md" @submit.prevent="registerGoal" @click.capture="notifyIfMatchNotLive">
                <!-- TOGGLE AUTOGOL -->
                <div class="row items-center justify-between q-pa-sm rounded-borders" style="background: rgba(239, 68, 68, 0.08); border: 1px dashed rgba(239, 68, 68, 0.35);">
                  <div class="row items-center gap-xs">
                    <q-icon name="sports_soccer" :color="goalForm.isOwnGoal ? 'negative' : 'grey-5'" size="20px" />
                    <div>
                      <div class="text-caption text-weight-bold" :class="goalForm.isOwnGoal ? 'text-negative' : 'text-white'">
                        {{ goalForm.isOwnGoal ? '⚽ Marcando Autogol (Gol en contra)' : '¿Es Gol en propia puerta (Autogol)?' }}
                      </div>
                      <div class="text-caption text-grey-5" style="font-size: 0.72rem;">
                        {{ goalForm.isOwnGoal ? 'El gol se sumará automáticamente al marcador del equipo rival.' : 'Activa si el jugador anotó en su propia portería.' }}
                      </div>
                    </div>
                  </div>
                  <q-toggle v-model="goalForm.isOwnGoal" color="negative" dense :disable="!isMatchLive" />
                </div>

                <q-select
                  v-model="goalForm.team"
                  :options="teamOptions"
                  emit-value
                  map-options
                  :label="goalForm.isOwnGoal ? 'Equipo que cometió el autogol *' : 'Equipo que anota *'"
                  outlined
                  stack-label
                  required
                  :disable="!isMatchLive"
                />
                <q-select
                  v-model="goalForm.player"
                  :options="goalPlayerOptions"
                  emit-value
                  map-options
                  :label="goalForm.isOwnGoal ? 'Jugador que anotó en contra *' : 'Goleador (Anotador) *'"
                  outlined
                  stack-label
                  required
                  :disable="!isMatchLive || !goalForm.team"
                  options-dense
                  behavior="menu"
                  popup-content-style="max-height: 280px; overflow-y: auto;"
                />
                <q-select
                  v-if="!goalForm.isOwnGoal"
                  v-model="goalForm.assistPlayer"
                  :options="assistPlayerOptions"
                  emit-value
                  map-options
                  label="Asistencia / Pase de Gol (Opcional)"
                  outlined
                  stack-label
                  clearable
                  :disable="!isMatchLive || !goalForm.team"
                  options-dense
                  behavior="menu"
                  popup-content-style="max-height: 280px; overflow-y: auto;"
                />
                <q-input
                  v-model.number="goalForm.minute"
                  type="number"
                  min="0"
                  max="120"
                  label="Minuto del Gol"
                  outlined
                  stack-label
                  required
                  :disable="!isMatchLive"
                />
                <q-btn
                  type="submit"
                  :color="goalForm.isOwnGoal ? 'negative' : 'primary'"
                  icon="sports_soccer"
                  :label="goalForm.isOwnGoal ? 'Guardar Autogol' : 'Guardar Gol'"
                  class="full-width q-py-sm"
                  :loading="goalSaving.value"
                  :disable="!isMatchLive || !goalForm.team || !goalForm.player"
                />
              </q-form>
            </q-card-section>
          </q-card>
        </div>

        <!-- FORM 2: EVENT (INCIDENCIAS: TARJETAS, SUSTITUCIONES, LESIONES) -->
        <div class="col-12 col-lg-6">
          <q-card flat class="sports-panel-card full-height">
            <q-card-section class="q-pa-lg">
              <div class="row items-center gap-sm q-mb-xs">
                <q-icon name="style" color="secondary" size="20px" />
                <div class="text-subtitle1 text-weight-bold text-white">Registrar Incidencia / Disciplina</div>
              </div>
              <div class="text-caption text-grey-5 q-mb-md">Sanciones, asistencias, sustituciones y bajas médicas.</div>

              <q-banner v-if="!isMatchLive" dense class="bg-warning text-dark q-mb-md">
                Debes iniciar el partido para poder registrar eventos.
              </q-banner>
              <q-form class="q-gutter-y-md" @submit.prevent="registerEvent" @click.capture="notifyIfMatchNotLive">
                <q-select
                  v-model="eventForm.type"
                  :options="[
                    { label: 'Tarjeta amarilla 🟨', value: 'YELLOW_CARD' },
                    { label: 'Tarjeta roja directa 🟥', value: 'RED_CARD' },
                    { label: 'Sustitución de jugador 🔄', value: 'SUBSTITUTION' },
                    { label: 'Baja por lesión (con sustitución) 🏥', value: 'INJURY' },
                  ]"
                  emit-value
                  map-options
                  label="Tipo de Incidencia"
                  outlined
                  stack-label
                  :disable="!isMatchLive"
                />

                <q-select
                  v-model="eventForm.team"
                  :options="teamOptions"
                  emit-value
                  map-options
                  label="Equipo involucrado *"
                  outlined
                  stack-label
                  required
                  :disable="!isMatchLive"
                />

                <!-- JUGADOR PARA TARJETA O ASISTENCIA -->
                <q-select
                  v-if="eventForm.type !== 'SUBSTITUTION' && eventForm.type !== 'INJURY'"
                  v-model="eventForm.player"
                  :options="eventPlayerOptions"
                  emit-value
                  map-options
                  label="Jugador involucrado *"
                  outlined
                  stack-label
                  required
                  :disable="!isMatchLive || !eventForm.team"
                  options-dense
                  behavior="menu"
                  popup-content-style="max-height: 280px; overflow-y: auto;"
                />

                <!-- PARÁMETROS PARA SUSTITUCIÓN NORMAL -->
                <template v-if="eventForm.type === 'SUBSTITUTION'">
                  <q-select
                    v-model="eventForm.playerOut"
                    :options="playerOutOptions"
                    emit-value
                    map-options
                    label="Jugador que sale (En cancha) ⬇️ *"
                    outlined
                    stack-label
                    required
                    :disable="!isMatchLive || !eventForm.team"
                    options-dense
                    behavior="menu"
                    popup-content-style="max-height: 280px; overflow-y: auto;"
                  />
                  <q-select
                    v-model="eventForm.playerIn"
                    :options="playerInOptions"
                    emit-value
                    map-options
                    label="Jugador que ingresa (Banca) ⬆️ *"
                    outlined
                    stack-label
                    required
                    :disable="!isMatchLive || !eventForm.team"
                    options-dense
                    behavior="menu"
                    popup-content-style="max-height: 280px; overflow-y: auto;"
                  />
                </template>

                <!-- PARÁMETROS PARA JUGADOR LESIONADO -->
                <template v-if="eventForm.type === 'INJURY'">
                  <q-select
                    v-model="eventForm.player"
                    :options="eventPlayerOptions"
                    emit-value
                    map-options
                    label="Jugador lesionado 🏥 *"
                    outlined
                    stack-label
                    required
                    :disable="!isMatchLive || !eventForm.team"
                    options-dense
                    behavior="menu"
                    popup-content-style="max-height: 280px; overflow-y: auto;"
                  />
                  <q-input
                    v-model="eventForm.injuryTime"
                    label="Tiempo estimado de baja médica (Ej: 15 días, 3 semanas) *"
                    outlined
                    stack-label
                    placeholder="Ej: 15 días"
                    required
                    :disable="!isMatchLive"
                  />
                  <q-select
                    v-model="eventForm.playerIn"
                    :options="playerInOptions"
                    emit-value
                    map-options
                    label="Jugador sustituto que ingresa ⬆️ *"
                    outlined
                    stack-label
                    required
                    :disable="!isMatchLive || !eventForm.team"
                    options-dense
                    behavior="menu"
                    popup-content-style="max-height: 280px; overflow-y: auto;"
                  />
                </template>

                <q-input
                  v-model.number="eventForm.minute"
                  type="number"
                  min="0"
                  max="120"
                  label="Minuto del Suceso"
                  outlined
                  stack-label
                  required
                  :disable="!isMatchLive"
                />

                <q-btn
                  type="submit"
                  color="secondary"
                  icon="add_task"
                  label="Guardar Incidencia"
                  class="full-width q-py-sm"
                  :loading="eventSaving.value"
                  :disable="!isMatchLive || !eventForm.team"
                />
              </q-form>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- MATCH TIMELINE / CRONOLOGÍA DEL ENCUENTRO -->
      <q-card flat class="sports-panel-card q-mb-xl">
        <q-card-section class="q-pa-lg">
          <div class="row items-center justify-between q-mb-md">
            <div class="row items-center gap-sm">
              <q-icon name="history" color="primary" size="22px" />
              <div class="text-subtitle1 text-weight-bold text-white">Cronología del Encuentro</div>
            </div>
            <div class="text-caption text-grey-4">
              Los goles e incidencias quedan bloqueados al finalizar el encuentro.
            </div>
          </div>

          <div v-if="timeline.length" class="sports-timeline">
            <!-- TIMELINE HEADER -->
            <div class="sports-timeline__header">
              <div class="timeline-team-head text-left">{{ teamName(match.homeTeam) }} (LOCAL)</div>
              <div class="timeline-min-head">MIN</div>
              <div class="timeline-team-head text-right">{{ teamName(match.awayTeam) }} (VISITANTE)</div>
            </div>

            <!-- TIMELINE ROWS -->
            <div
              v-for="event in timeline"
              :key="`${event.type}-${event.playerId}-${event.minute}-${event.teamId}-${event.sourceOrder}`"
              class="sports-timeline__row"
            >
              <!-- LEFT SIDE (HOME TEAM) -->
              <div class="timeline-side timeline-side--left">
                <div v-if="event.side === 'home'" class="timeline-event-card timeline-event-card--home">
                  <div class="timeline-icon-pill" :class="`timeline-icon-pill--${event.type.toLowerCase()}`">
                    <q-icon :name="event.icon" :color="event.color" size="16px" />
                  </div>
                  <div class="timeline-event-details text-left">
                    <div class="row items-center gap-xs">
                      <span class="timeline-event-title" :class="{ 'text-negative': event.type === 'OWN_GOAL' }">
                        {{ event.label }}
                      </span>
                      <q-badge v-if="event.type === 'OWN_GOAL'" color="negative" class="text-weight-bolder q-px-xs">
                        ⚽ (AG)
                      </q-badge>
                    </div>

                    <!-- DETALLES DE SUSTITUCIÓN -->
                    <template v-if="event.type === 'SUBSTITUTION'">
                      <div class="timeline-event-player text-primary">
                        ⬆️ Entra: {{ event.playerInName || 'Suplente' }}
                      </div>
                      <div class="text-caption text-grey-5" style="font-size: 0.72rem;">
                        ⬇️ Sale: {{ event.playerOutName || event.playerName }}
                      </div>
                    </template>

                    <!-- DETALLES DE LESIÓN -->
                    <template v-else-if="event.type === 'INJURY'">
                      <div class="timeline-event-player text-deep-orange">
                        🏥 Lesión: {{ event.playerName }}
                      </div>
                      <div class="text-caption text-grey-4" style="font-size: 0.72rem;">
                        Baja estimada: {{ event.rawItem?.injuryTime || 'En observación' }}
                      </div>
                      <div v-if="event.playerInName" class="text-caption text-primary" style="font-size: 0.72rem;">
                        🔄 Reemplazado por: {{ event.playerInName }}
                      </div>
                    </template>

                    <!-- GOL O EVENTO REGULAR -->
                    <template v-else>
                      <span class="timeline-event-player">{{ event.playerName }}</span>
                      <div v-if="event.assistName" class="text-caption text-info" style="font-size: 0.72rem;">
                        👟 Asistencia: {{ event.assistName }}
                      </div>
                    </template>
                  </div>

                  <!-- ACCIONES PARA CORREGIR EL ACTA -->
                  <div v-if="isMatchLive" class="row items-center q-ml-xs">
                    <q-btn flat round dense icon="edit" color="secondary" size="11px" @click="openEditItem(event)">
                      <q-tooltip>Editar suceso</q-tooltip>
                    </q-btn>
                    <q-btn flat round dense icon="delete" color="negative" size="11px" @click="removeItem(event)">
                      <q-tooltip>Eliminar suceso</q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </div>

              <!-- CENTER MINUTE PILL -->
              <div class="timeline-center-minute">
                <span>{{ event.minute }}'</span>
              </div>

              <!-- RIGHT SIDE (AWAY TEAM) -->
              <div class="timeline-side timeline-side--right">
                <div v-if="event.side === 'away'" class="timeline-event-card timeline-event-card--away">
                  <!-- ACCIONES PARA CORREGIR EL ACTA -->
                  <div v-if="isMatchLive" class="row items-center q-mr-xs">
                    <q-btn flat round dense icon="edit" color="secondary" size="11px" @click="openEditItem(event)">
                      <q-tooltip>Editar suceso</q-tooltip>
                    </q-btn>
                    <q-btn flat round dense icon="delete" color="negative" size="11px" @click="removeItem(event)">
                      <q-tooltip>Eliminar suceso</q-tooltip>
                    </q-btn>
                  </div>

                  <div class="timeline-event-details text-right">
                    <div class="row items-center justify-end gap-xs">
                      <q-badge v-if="event.type === 'OWN_GOAL'" color="negative" class="text-weight-bolder q-px-xs">
                        ⚽ (AG)
                      </q-badge>
                      <span class="timeline-event-title" :class="{ 'text-negative': event.type === 'OWN_GOAL' }">
                        {{ event.label }}
                      </span>
                    </div>

                    <!-- DETALLES DE SUSTITUCIÓN -->
                    <template v-if="event.type === 'SUBSTITUTION'">
                      <div class="timeline-event-player text-primary">
                        ⬆️ Entra: {{ event.playerInName || 'Suplente' }}
                      </div>
                      <div class="text-caption text-grey-5" style="font-size: 0.72rem;">
                        ⬇️ Sale: {{ event.playerOutName || event.playerName }}
                      </div>
                    </template>

                    <!-- DETALLES DE LESIÓN -->
                    <template v-else-if="event.type === 'INJURY'">
                      <div class="timeline-event-player text-deep-orange">
                        🏥 Lesión: {{ event.playerName }}
                      </div>
                      <div class="text-caption text-grey-4" style="font-size: 0.72rem;">
                        Baja estimada: {{ event.rawItem?.injuryTime || 'En observación' }}
                      </div>
                      <div v-if="event.playerInName" class="text-caption text-primary" style="font-size: 0.72rem;">
                        🔄 Reemplazado por: {{ event.playerInName }}
                      </div>
                    </template>

                    <!-- GOL O EVENTO REGULAR -->
                    <template v-else>
                      <span class="timeline-event-player">{{ event.playerName }}</span>
                      <div v-if="event.assistName" class="text-caption text-info" style="font-size: 0.72rem;">
                        👟 Asistencia: {{ event.assistName }}
                      </div>
                    </template>
                  </div>

                  <div class="timeline-icon-pill" :class="`timeline-icon-pill--${event.type.toLowerCase()}`">
                    <q-icon :name="event.icon" :color="event.color" size="16px" />
                  </div>
                </div>
              </div>

              <!-- NEUTRAL FALLBACK (Para registros históricos o de equipo no mapeado) -->
              <div v-if="event.side === 'neutral'" class="col-12 q-my-xs text-center">
                <div class="timeline-neutral-card">
                  <q-icon :name="event.icon" :color="event.color" size="16px" class="q-mr-xs" />
                  <strong class="q-mr-xs">{{ event.label }}:</strong>
                  <span>{{ event.playerName }}</span>
                  <span v-if="event.assistName" class="text-info q-ml-xs">(Asistencia: {{ event.assistName }})</span>
                  <template v-if="isMatchLive">
                    <q-btn flat round dense icon="edit" color="secondary" size="10px" class="q-ml-sm" @click="openEditItem(event)" />
                    <q-btn flat round dense icon="delete" color="negative" size="10px" @click="removeItem(event)" />
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-caption text-grey-5 text-center q-pa-lg">
            Todavía no hay goles ni incidencias registradas en este partido.
          </div>
        </q-card-section>
      </q-card>

      <q-dialog v-model="matchEditDialog" persistent>
        <q-card style="max-width: 660px; width: 94vw;">
          <q-card-section class="dialog-header-section">
            <div class="row items-center justify-between">
              <div class="row items-center gap-sm">
                <q-icon name="edit" size="22px" color="primary" />
                <div class="text-subtitle1 text-weight-bold">Editar Partido</div>
              </div>
              <q-btn flat round dense icon="close" color="grey-5" @click="matchEditDialog = false" />
            </div>
          </q-card-section>

          <q-form @submit.prevent="saveMatchEdits" class="q-pa-lg q-gutter-y-md">
            <div class="match-edit-teams">
              <div class="match-edit-team">
                <div class="sport-crest-container match-edit-team__crest">
                  <ImagePreview
                    :src="match.homeTeam?.logoUrl || match.homeTeam?.escudo_url"
                    :fallback="getDefaultTeamLogo(match.homeTeam)"
                    :alt="`Escudo de ${teamName(match.homeTeam)}`"
                    width="42px"
                    height="42px"
                  />
                </div>
                <span>{{ teamName(match.homeTeam) }}</span>
              </div>
              <span class="match-edit-vs">VS</span>
              <div class="match-edit-team">
                <div class="sport-crest-container match-edit-team__crest">
                  <ImagePreview
                    :src="match.awayTeam?.logoUrl || match.awayTeam?.escudo_url"
                    :fallback="getDefaultTeamLogo(match.awayTeam)"
                    :alt="`Escudo de ${teamName(match.awayTeam)}`"
                    width="42px"
                    height="42px"
                  />
                </div>
                <span>{{ teamName(match.awayTeam) }}</span>
              </div>
            </div>

            <div class="row items-end q-col-gutter-md q-col-gutter-y-md">
              <div class="col-12 col-sm-6">
                <label class="text-caption text-weight-bold text-grey-4 block q-mb-xs" for="match-edit-matchday">Jornada</label>
                <q-input
                  id="match-edit-matchday"
                  v-model.number="matchEditForm.matchday"
                  aria-label="Jornada"
                  type="number"
                  min="1"
                  outlined
                  dense
                  required
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-btn
                  flat
                  dense
                  no-caps
                  color="primary"
                  icon="analytics"
                  label="Consultar Jornadas del Enfrentamiento"
                  class="matchday-history-trigger"
                >
                  <q-menu v-model="showMatchdayHistory" anchor="bottom left" self="top left">
                    <q-card class="matchday-history-menu">
                      <q-card-section class="q-pb-sm">
                        <div class="text-subtitle2 text-weight-bold">Historial del enfrentamiento</div>
                        <div class="text-caption text-grey-5">
                          {{ teamName(match.homeTeam) }} vs {{ teamName(match.awayTeam) }}
                        </div>
                      </q-card-section>
                      <q-separator dark />
                      <q-card-section class="q-pt-sm">
                        <div class="row items-center q-gutter-xs q-mb-sm">
                          <div class="text-caption text-weight-bold text-grey-4">Jornadas disputadas</div>
                          <q-badge color="positive" rounded>{{ playedHeadToHeadMatches.length }}</q-badge>
                        </div>
                        <div v-if="playedHeadToHeadMatches.length" class="column q-gutter-y-xs">
                          <q-btn
                            v-for="previous in playedHeadToHeadMatches"
                            :key="`played-${previous._id}`"
                            flat
                            dense
                            no-caps
                            align="left"
                            class="matchday-history-item matchday-history-item--played"
                          >
                            J{{ previous.matchday }} · {{ teamName(previous.homeTeam) }} {{ previous.homeScore ?? 0 }}–{{ previous.awayScore ?? 0 }} {{ teamName(previous.awayTeam) }}
                            <q-badge color="positive" class="q-ml-xs">Disputada</q-badge>
                          </q-btn>
                        </div>
                        <div v-else class="text-caption text-grey-5">Aún no han disputado un encuentro.</div>

                        <template v-if="upcomingHeadToHeadMatches.length">
                          <div class="text-caption text-weight-bold text-grey-4 q-mt-md q-mb-xs">Otros cruces programados</div>
                          <div class="column q-gutter-y-xs">
                            <div
                              v-for="upcoming in upcomingHeadToHeadMatches"
                              :key="`upcoming-${upcoming._id}`"
                              class="matchday-history-upcoming"
                            >
                              <span>J{{ upcoming.matchday }} · {{ formatMatchDate(upcoming.date) }}</span>
                              <q-badge :color="matchStatusColor(upcoming.status)">{{ matchStatusLabel(upcoming.status) }}</q-badge>
                            </div>
                          </div>
                        </template>

                        <div class="row items-center q-gutter-xs q-mt-md q-mb-xs">
                          <div class="text-caption text-weight-bold text-grey-4">Jornadas libres para ambos equipos</div>
                          <q-badge color="primary" rounded>{{ freeMatchdays.length }}</q-badge>
                        </div>
                        <div v-if="freeMatchdays.length" class="row wrap q-gutter-xs">
                          <q-chip
                            v-for="day in freeMatchdays"
                            :key="`free-${day}`"
                            clickable
                            color="primary"
                            text-color="white"
                            size="sm"
                            @click="matchEditForm.matchday = day; showMatchdayHistory = false"
                          >
                            J{{ day }}
                          </q-chip>
                        </div>
                        <div v-else class="text-caption text-grey-5">No hay jornadas libres.</div>
                      </q-card-section>
                    </q-card>
                  </q-menu>
                </q-btn>
              </div>
            </div>

            <div class="row q-col-gutter-md q-col-gutter-y-md">
              <div class="col-12 col-sm-6">
                <label class="text-caption text-weight-bold text-grey-4 block q-mb-xs" for="match-edit-date">Fecha</label>
                <q-input
                  id="match-edit-date"
                  v-model="matchEditForm.matchDate"
                  aria-label="Fecha"
                  type="date"
                  outlined
                  dense
                />
              </div>
              <div class="col-12 col-sm-6">
                <label class="text-caption text-weight-bold text-grey-4 block q-mb-xs" for="match-edit-time">Hora</label>
                <q-input
                  id="match-edit-time"
                  v-model="matchEditForm.matchTime"
                  aria-label="Hora"
                  type="time"
                  outlined
                  dense
                />
              </div>
            </div>

            <div class="match-edit-field">
              <label class="text-caption text-weight-bold text-grey-4 block q-mb-xs" for="match-edit-stadium">Cancha</label>
              <q-input
                id="match-edit-stadium"
                v-model="matchEditForm.stadium"
                aria-label="Cancha"
                placeholder="Cancha del equipo local"
                outlined
                dense
              />
            </div>
            <div class="match-edit-field">
              <label class="text-caption text-weight-bold text-grey-4 block q-mb-xs" for="match-edit-referee">Árbitro</label>
              <q-input
                id="match-edit-referee"
                v-model="matchEditForm.referee"
                aria-label="Árbitro"
                placeholder="Nombre del árbitro"
                outlined
                dense
              />
            </div>
            <div class="match-edit-field">
              <label class="text-caption text-weight-bold text-grey-4 block q-mb-xs" for="match-edit-status">Estado</label>
              <q-select
                id="match-edit-status"
                v-model="matchEditForm.status"
                :options="matchStatusOptions"
                aria-label="Estado"
                emit-value
                map-options
                outlined
                dense
                required
              />
            </div>
            <q-banner
              v-if="['SUSPENDED', 'POSTPONED'].includes(matchEditForm.status)"
              rounded
              class="match-reschedule-warning"
            >
              <template #avatar><q-icon name="warning" color="warning" /></template>
              <div class="text-weight-bold">⚠️ PARTIDO SUSPENDIDO</div>
              <div>Este encuentro debe ser reagendado con una nueva fecha y hora para no afectar la continuidad del torneo.</div>
              <div v-if="requiresRescheduledDate" class="text-weight-bold q-mt-xs">
                Selecciona una fecha y hora distintas a la programación anterior para guardar este estado.
              </div>
            </q-banner>

            <div class="row items-center justify-between q-gutter-sm q-pt-sm">
              <q-btn
                v-if="!isFinished"
                flat
                color="negative"
                icon="delete"
                label="Eliminar Partido"
                :loading="deletingMatch"
                :disable="matchEditSaving"
                @click="confirmDeleteMatch"
              />
              <div class="row justify-end q-gutter-sm">
                <q-btn flat label="Cancelar" color="grey-5" @click="matchEditDialog = false" />
                <q-btn
                  unelevated
                  color="primary"
                  icon="save"
                  label="Guardar Cambios"
                  type="submit"
                  :loading="matchEditSaving"
                  :disable="deletingMatch"
                />
              </div>
            </div>
          </q-form>
        </q-card>
      </q-dialog>

      <!-- MODAL DE EDICIÓN / CORRECCIÓN DE SUCESO -->
      <q-dialog v-model="editDialog" persistent>
        <q-card style="max-width: 500px; width: 92vw;">
          <q-card-section class="dialog-header-section">
            <div class="row items-center justify-between">
              <div class="row items-center gap-sm">
                <q-icon :name="editForm.isGoal ? 'sports_soccer' : 'edit'" size="22px" color="primary" />
                <div class="text-subtitle1 text-weight-bold">
                  {{ editForm.isGoal ? 'Editar Gol Registrado' : 'Editar Incidencia' }}
                </div>
              </div>
              <q-btn flat round dense icon="close" color="grey-5" v-close-popup />
            </div>
          </q-card-section>

          <q-form @submit.prevent="saveEditedItem" class="q-pa-lg q-gutter-y-md">
            <!-- SELECCIÓN DE EQUIPO -->
            <q-select
              v-model="editForm.team"
              :options="teamOptions"
              emit-value
              map-options
              label="Equipo"
              outlined
              stack-label
              required
            />

            <!-- SI ES GOL -->
            <template v-if="editForm.isGoal">
              <q-select
                v-model="editForm.player"
                :options="editPlayerOptions"
                emit-value
                map-options
                label="Goleador"
                outlined
                stack-label
                required
                options-dense
                behavior="menu"
                popup-content-style="max-height: 280px; overflow-y: auto;"
              />
              <q-select
                v-if="!editForm.isOwnGoal"
                v-model="editForm.assistPlayer"
                :options="editAssistOptions"
                emit-value
                map-options
                label="Asistente (Opcional)"
                outlined
                stack-label
                clearable
                options-dense
                behavior="menu"
                popup-content-style="max-height: 280px; overflow-y: auto;"
              />
              <q-checkbox v-model="editForm.isOwnGoal" label="¿Es autogol (gol en contra)?" color="negative" />
            </template>

            <!-- SI ES INCIDENCIA -->
            <template v-else>
              <q-select
                v-model="editForm.type"
                :options="[
                  { label: 'Tarjeta amarilla 🟨', value: 'YELLOW_CARD' },
                  { label: 'Tarjeta roja directa 🟥', value: 'RED_CARD' },
                  { label: 'Sustitución de jugador 🔄', value: 'SUBSTITUTION' },
                  { label: 'Baja por lesión 🏥', value: 'INJURY' },
                ]"
                emit-value
                map-options
                label="Tipo de Incidencia"
                outlined
                stack-label
              />

              <q-select
                v-if="editForm.type !== 'SUBSTITUTION'"
                v-model="editForm.player"
                :options="editPlayerOptions"
                emit-value
                map-options
                label="Jugador involucrado"
                outlined
                stack-label
                options-dense
                behavior="menu"
                popup-content-style="max-height: 280px; overflow-y: auto;"
              />

              <template v-if="editForm.type === 'SUBSTITUTION' || editForm.type === 'INJURY'">
                <q-select
                  v-model="editForm.playerOut"
                  :options="editPlayerOptions"
                  emit-value
                  map-options
                  label="Jugador que sale ⬇️"
                  outlined
                  stack-label
                  options-dense
                  behavior="menu"
                  popup-content-style="max-height: 280px; overflow-y: auto;"
                />
                <q-select
                  v-model="editForm.playerIn"
                  :options="editPlayerOptions"
                  emit-value
                  map-options
                  label="Jugador que ingresa ⬆️"
                  outlined
                  stack-label
                  options-dense
                  behavior="menu"
                  popup-content-style="max-height: 280px; overflow-y: auto;"
                />
              </template>

              <q-input
                v-if="editForm.type === 'INJURY'"
                v-model="editForm.injuryTime"
                label="Tiempo de baja estimada"
                outlined
                stack-label
              />
            </template>

            <q-input
              v-model.number="editForm.minute"
              type="number"
              min="0"
              max="120"
              label="Minuto"
              outlined
              stack-label
              required
            />

            <div class="row justify-end gap-sm q-pt-md">
              <q-btn flat label="Cancelar" color="grey-5" v-close-popup />
              <q-btn unelevated color="primary" label="Guardar Corrección" type="submit" :loading="editSaving" :disable="!isMatchLive" />
            </div>
          </q-form>
        </q-card>
      </q-dialog>
    </template>
  </div>
</template>

<style scoped>
.text-caption {
  font-size: .9rem;
}
.row.items-center.gap-sm {
  display: flex;
  gap: 10px;
}
.match-detail-page {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.sports-match-banner {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-lg) !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4) !important;
}

/* Sports Flags Indicators & Badges */
.match-flag-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.match-flag-badge--live {
  background: rgba(16, 185, 129, 0.18);
  border: 1px solid rgba(16, 185, 129, 0.5);
  color: #10b981;
}

.match-flag-badge--finished {
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #ef4444;
}

.match-flag-badge--suspended {
  background: rgba(245, 158, 11, 0.16);
  border: 1px solid rgba(245, 158, 11, 0.45);
  color: #fbbf24;
}

.match-flag-badge--scheduled {
  background: rgba(100, 116, 139, 0.18);
  border: 1px solid rgba(100, 116, 139, 0.4);
  color: #94a3b8;
}

.match-action-controls-bar {
  border-top: 1px solid var(--tb-border);
}

.sports-flag-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--tb-radius-sm);
  background: var(--tb-surface-raised);
}

.sports-flag-indicator--live {
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.sports-flag-indicator--finished {
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.sports-flag-indicator--scheduled {
  border: 1px solid var(--tb-border);
}

.flag-btn {
  font-weight: 800 !important;
  font-size: 0.85rem !important;
  border-radius: var(--tb-radius-md) !important;
  padding: 8px 18px !important;
  transition: all 0.2s ease !important;
}

.flag-btn--start {
  background: rgba(16, 185, 129, 0.15) !important;
  border: 1.5px solid #10b981 !important;
  color: #22c55e !important;
}

.flag-btn--start:hover {
  background: #10b981 !important;
  color: #0b111e !important;
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.6) !important;
}

.flag-btn--finish {
  background: rgba(239, 68, 68, 0.15) !important;
  border: 1.5px solid #ef4444 !important;
  color: #ef4444 !important;
}

.flag-btn--finish:hover {
  background: #ef4444 !important;
  color: #ffffff !important;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.6) !important;
}

.matchday-tag {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #10b981;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 4px;
  letter-spacing: 0.06em;
}

.match-banner-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
  padding: 16px 0;
}

.banner-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.banner-crest-box {
  width: 80px;
  height: 80px;
  margin-bottom: 10px;
}

.banner-team-name {
  font-size: 1.15rem;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 2px;
}

.banner-team-role {
  font-size: 0.7rem;
  color: var(--tb-muted);
  font-weight: 700;
  letter-spacing: 0.08em;
}

.banner-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 140px;
}

.banner-vs-label {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--tb-muted);
}

.banner-digits {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 2.8rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1;
  background: rgba(15, 23, 42, 0.6);
  padding: 8px 20px;
  border-radius: 12px;
  border: 1px solid var(--tb-border);
}

.banner-digits-dash {
  color: var(--tb-muted);
}

.banner-date-text {
  font-size: 0.75rem;
  color: var(--tb-muted);
  margin-top: 8px;
}

.sports-panel-card {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-md) !important;
}

/* Timeline */
.sports-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sports-timeline__header {
  display: grid;
  grid-template-columns: 1fr 60px 1fr;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--tb-border);
  margin-bottom: 6px;
}

.timeline-team-head {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--tb-muted);
  letter-spacing: 0.04em;
}

.timeline-min-head {
  font-size: 0.7rem;
  font-weight: 900;
  color: var(--tb-muted);
  text-align: center;
}

.sports-timeline__row {
  display: grid;
  grid-template-columns: 1fr 60px 1fr;
  align-items: center;
  position: relative;
}

.timeline-side {
  display: flex;
  min-width: 0;
}

.timeline-side--left {
  justify-content: flex-end;
}

.timeline-side--right {
  justify-content: flex-start;
}

.timeline-event-card {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-sm);
  padding: 8px 12px;
  max-width: 90%;
  transition: all 0.2s ease;
}

.timeline-event-card:hover {
  border-color: rgba(16, 185, 129, 0.4);
}

.timeline-icon-pill {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid var(--tb-border);
  flex-shrink: 0;
}

.timeline-icon-pill--goal {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.15);
}

.timeline-icon-pill--own_goal {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.15);
}

.timeline-icon-pill--yellow_card {
  border-color: rgba(234, 179, 8, 0.4);
  background: rgba(234, 179, 8, 0.15);
}

.timeline-icon-pill--red_card {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.15);
}

.timeline-icon-pill--substitution {
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.15);
}

.timeline-icon-pill--injury {
  border-color: rgba(249, 115, 22, 0.4);
  background: rgba(249, 115, 22, 0.15);
}

.timeline-event-details {
  min-width: 0;
}

.timeline-event-title {
  font-size: 1rem;
  font-weight: 800;
  margin-right: 4px;
  color: #ffffff;
  text-transform: uppercase;
}

.timeline-event-player {
  font-size: 1rem;
  font-weight: 700;
  color: #e2e8f0;
  display: block;
}

.timeline-center-minute {
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.timeline-center-minute span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 24px;
  background: #0f172a;
  border: 1px solid rgba(16, 185, 129, 0.45);
  border-radius: 9999px;
  font-size: 1rem;
  font-weight: 800;
  color: #10b981;
}

.timeline-neutral-card {
  display: inline-flex;
  align-items: center;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid var(--tb-border);
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 1rem;
  color: #e2e8f0;
}

.dialog-header-section {
  background: var(--tb-surface-raised);
  border-bottom: 1px solid var(--tb-border);
}

.match-edit-teams {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 14px;
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  background: var(--tb-surface-raised);
}

.match-edit-team {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
}

.match-edit-team > span {
  overflow-wrap: anywhere;
}

.match-edit-team__crest {
  flex: 0 0 50px;
  width: 50px;
  height: 50px;
  padding: 4px;
}

.match-edit-vs {
  flex: 0 0 auto;
  color: var(--tb-muted);
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.match-edit-field {
  margin-bottom: 4px;
}

.matchday-history-trigger {
  min-height: 40px;
  white-space: normal;
}

.matchday-history-menu {
  width: min(420px, 90vw);
  max-height: 65vh;
  overflow: auto;
  background: #161f30;
  color: #fff;
  border: 1px solid #2a374a;
  border-radius: 12px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
}

.matchday-history-item {
  width: 100%;
  justify-content: flex-start;
  padding: 8px 10px;
  border: 1px solid #2a374a;
  border-radius: 8px;
  background: rgba(11, 17, 30, 0.55);
}

.matchday-history-item--played {
  border-color: rgba(16, 185, 129, 0.35);
}

.matchday-history-upcoming {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border: 1px solid #2a374a;
  border-radius: 8px;
  background: rgba(11, 17, 30, 0.55);
  color: #cbd5e1;
  font-size: 1rem;
}

.match-reschedule-warning {
  border: 1px solid rgba(245, 158, 11, 0.55);
  background: rgba(245, 158, 11, 0.12);
  color: #f8fafc;
}

@media (max-width: 520px) {
  .match-edit-teams {
    gap: 8px;
    padding: 10px;
  }

  .match-edit-team {
    flex-direction: column;
    text-align: center;
    font-size: 1rem;
  }
}
</style>
