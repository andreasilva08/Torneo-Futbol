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
const isLive = computed(() => normalizeMatchStatus(match.value?.status) === 'IN_PROGRESS')
const participantTeams = computed(() => [match.value?.homeTeam, match.value?.awayTeam].filter(Boolean))

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

// Opciones dinámicas para el modal de edición
const editPlayerOptions = computed(() => store.players
  .filter((player) => isPlayerInTeam(player, editForm.team))
  .map((player) => ({ label: formatPlayerOption(player), value: getId(player) })))

const editAssistOptions = computed(() => store.players
  .filter((player) => isPlayerInTeam(player, editForm.team) && String(getId(player)) !== String(editForm.player))
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
  player: getId(goal.player) || null,
  scorer: goal.scorer || '',
  team: getId(goal.team),
  minute: Number(goal.minute) || 1,
  isOwnGoal: Boolean(goal.isOwnGoal || goal.isAutogol),
  isAutogol: Boolean(goal.isOwnGoal || goal.isAutogol),
  ...(goal.assistPlayer ? { assistPlayer: getId(goal.assistPlayer) } : {}),
  ...(goal.assist ? { assist: goal.assist } : {}),
}))

const scoreFor = (teamId, goals) => goals.filter((goal) => String(goal.team) === String(teamId)).length

// ─── Registro de Goles ────────────────────────────────────────────────────────
const registerGoal = async () => {
  if (!match.value || isFinished.value) return

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
      const existingEvents = (match.value.events || []).map((event) => ({
        type: event.type,
        player: getId(event.player),
        team: getId(event.team),
        minute: Number(event.minute),
      }))
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
      status: 'IN_PROGRESS',
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
  if (!match.value || isFinished.value) return

  eventSaving.value = true
  try {
    const existingEvents = (match.value.events || []).map((event) => ({
      type: event.type,
      player: getId(event.player) || null,
      team: getId(event.team) || null,
      minute: Number(event.minute) || 1,
      playerIn: getId(event.playerIn) || null,
      playerOut: getId(event.playerOut) || null,
      injuryTime: event.injuryTime || '',
      description: event.description || '',
    }))

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
  if (isFinished.value) return

  Object.assign(editForm, {
    isGoal: event.isGoal,
    id: getId(event.rawItem?._id) || '',
    index: event.sourceOrder,
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
  editSaving.value = true
  try {
    const homeTeamId = getId(match.value.homeTeam)
    const awayTeamId = getId(match.value.awayTeam)

    if (editForm.isGoal) {
      // Modificar gol
      const currentGoals = apiGoals()
      const targetIndex = editForm.index >= 0 && editForm.index < currentGoals.length
        ? editForm.index
        : currentGoals.findIndex((g) => getId(g._id) === editForm.id)

      if (targetIndex >= 0) {
        currentGoals[targetIndex] = {
          player: editForm.player || null,
          team: editForm.team,
          minute: Number(editForm.minute),
          isOwnGoal: Boolean(editForm.isOwnGoal),
          isAutogol: Boolean(editForm.isOwnGoal),
          ...(editForm.assistPlayer && !editForm.isOwnGoal ? { assistPlayer: editForm.assistPlayer } : {}),
        }
      }

      await store.updateMatchResult(match.value._id, {
        homeScore: scoreFor(homeTeamId, currentGoals),
        awayScore: scoreFor(awayTeamId, currentGoals),
        goals: currentGoals,
      })

      $q.notify({ type: 'positive', message: 'Gol modificado y marcador recalculado correctamente.' })
    } else {
      // Modificar evento disciplinario o sustitución
      const currentEvents = (match.value.events || []).map((e) => ({
        type: e.type,
        player: getId(e.player) || null,
        team: getId(e.team) || null,
        minute: Number(e.minute) || 1,
        playerIn: getId(e.playerIn) || null,
        playerOut: getId(e.playerOut) || null,
        injuryTime: e.injuryTime || '',
      }))

      const targetIndex = editForm.index >= 0 && editForm.index < currentEvents.length
        ? editForm.index
        : 0

      if (targetIndex >= 0 && targetIndex < currentEvents.length) {
        currentEvents[targetIndex] = {
          type: editForm.type,
          player: editForm.player || editForm.playerOut || null,
          team: editForm.team,
          minute: Number(editForm.minute),
          playerIn: editForm.playerIn || null,
          playerOut: editForm.playerOut || null,
          injuryTime: editForm.injuryTime || '',
        }
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
  if (isFinished.value) return

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
        const currentEvents = (match.value.events || []).map((e) => ({
          type: e.type,
          player: getId(e.player) || null,
          team: getId(e.team) || null,
          minute: Number(e.minute) || 1,
          playerIn: getId(e.playerIn) || null,
          playerOut: getId(e.playerOut) || null,
          injuryTime: e.injuryTime || '',
        }))
        const eventIndex = event.sourceOrder - (match.value.goals || []).length
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

// ─── Finalización del Encuentro ──────────────────────────────────────────────
const finishMatch = () => {
  $q.dialog({
    title: 'Finalizar Encuentro',
    message: '¿Confirmas la finalización del partido? Una vez finalizado, los resultados impactarán la tabla general de posiciones.',
    cancel: true,
    persistent: true,
    ok: { label: 'Sí, Finalizar', color: 'negative' },
    cancel: { label: 'Cancelar', color: 'grey-5', flat: true },
  }).onOk(async () => {
    try {
      const goals = apiGoals()
      await store.updateMatchResult(match.value._id, {
        homeScore: scoreFor(getId(match.value.homeTeam), goals),
        awayScore: scoreFor(getId(match.value.awayTeam), goals),
        status: 'FINISHED',
        goals,
      })
      $q.notify({ type: 'positive', message: 'Partido finalizado con éxito.' })
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
              <span class="text-caption text-grey-4">{{ match.homeTeam?.stadium || match.homeTeam?.cancha || 'Cancha Local' }}</span>
            </div>
            <q-badge :color="matchStatusColor(match.status)" class="q-px-sm q-py-xs text-weight-bolder">
              {{ isLive ? '🔴 EN VIVO' : matchStatusLabel(match.status).toUpperCase() }}
            </q-badge>
          </div>

          <div class="match-banner-grid">
            <!-- HOME TEAM -->
            <div class="banner-team banner-team--home">
              <div class="sport-crest-container banner-crest-box">
                <ImagePreview
                  :src="match.homeTeam?.logoUrl || match.homeTeam?.escudo_url"
                  fallback="/images/default-team.svg"
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
              <div v-if="match.status === 'SCHEDULED'" class="banner-vs-label">VS</div>
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
                  fallback="/images/default-team.svg"
                  :alt="`Escudo de ${teamName(match.awayTeam)}`"
                  width="72px"
                  height="72px"
                />
              </div>
              <div class="banner-team-name">{{ teamName(match.awayTeam) }}</div>
              <div class="banner-team-role">VISITANTE</div>
            </div>
          </div>

          <!-- BOTÓN FINALIZAR PARTIDO -->
          <div v-if="!isFinished" class="row justify-end q-mt-md">
            <q-btn
              unelevated
              color="negative"
              outline
              icon="flag"
              label="Finalizar Partido"
              @click="finishMatch"
            />
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

              <q-form class="q-gutter-y-md" @submit.prevent="registerGoal">
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
                  <q-toggle v-model="goalForm.isOwnGoal" color="negative" dense />
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
                  :disable="!goalForm.team"
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
                  :disable="!goalForm.team"
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
                />
                <q-btn
                  type="submit"
                  :color="goalForm.isOwnGoal ? 'negative' : 'primary'"
                  icon="sports_soccer"
                  :label="goalForm.isOwnGoal ? 'Guardar Autogol' : 'Guardar Gol'"
                  class="full-width q-py-sm"
                  :loading="goalSaving.value"
                  :disable="!goalForm.team || !goalForm.player"
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

              <q-form class="q-gutter-y-md" @submit.prevent="registerEvent">
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
                  :disable="!eventForm.team"
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
                    :disable="!eventForm.team"
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
                    :disable="!eventForm.team"
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
                    :disable="!eventForm.team"
                  />
                  <q-input
                    v-model="eventForm.injuryTime"
                    label="Tiempo estimado de baja médica (Ej: 15 días, 3 semanas) *"
                    outlined
                    stack-label
                    placeholder="Ej: 15 días"
                    required
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
                    :disable="!eventForm.team"
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
                />

                <q-btn
                  type="submit"
                  color="secondary"
                  icon="add_task"
                  label="Guardar Incidencia"
                  class="full-width q-py-sm"
                  :loading="eventSaving.value"
                  :disable="!eventForm.team"
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
            <div v-if="!isFinished" class="text-caption text-grey-4">
              Puedes corregir o eliminar incidencias antes de finalizar el partido.
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

                  <!-- ACCIONES EDITAR / ELIMINAR (SI NO FINALIZADO) -->
                  <div v-if="!isFinished" class="row items-center q-ml-xs">
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
                  <!-- ACCIONES EDITAR / ELIMINAR (SI NO FINALIZADO) -->
                  <div v-if="!isFinished" class="row items-center q-mr-xs">
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
                  <template v-if="!isFinished">
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
                />
                <q-select
                  v-model="editForm.playerIn"
                  :options="editPlayerOptions"
                  emit-value
                  map-options
                  label="Jugador que ingresa ⬆️"
                  outlined
                  stack-label
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
              <q-btn unelevated color="primary" label="Guardar Corrección" type="submit" :loading="editSaving" />
            </div>
          </q-form>
        </q-card>
      </q-dialog>
    </template>
  </div>
</template>

<style scoped>
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
  font-size: 0.76rem;
  font-weight: 800;
  color: #ffffff;
  text-transform: uppercase;
}

.timeline-event-player {
  font-size: 0.86rem;
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
  font-size: 0.72rem;
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
  font-size: 0.8rem;
  color: #e2e8f0;
}

.dialog-header-section {
  background: var(--tb-surface-raised);
  border-bottom: 1px solid var(--tb-border);
}
</style>
