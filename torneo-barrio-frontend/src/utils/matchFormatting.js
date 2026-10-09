export const getId = (value) => {
  if (!value) {
    return ''
  }

  return typeof value === 'object' ? value._id || value.id || '' : value
}

export const formatMatchDate = (value, options = {}) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible'
  }

  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(date)
}

export const normalizeMatchStatus = (status) => String(status ?? '').trim().toUpperCase()

export const matchStatusLabel = (status) => ({
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizado',
}[normalizeMatchStatus(status)] || 'Estado desconocido')

export const matchStatusColor = (status) => ({
  SCHEDULED: 'blue-grey',
  IN_PROGRESS: 'positive',
  FINISHED: 'dark',
}[normalizeMatchStatus(status)] || 'grey')

export const eventTypeLabel = (type) => {
  const norm = String(type || '').toUpperCase()
  if (norm === 'GOAL' || norm === 'GOL') return 'Gol'
  if (norm === 'ASSIST' || norm.includes('ASISTENCIA')) return 'Asistencia'
  if (norm === 'YELLOW_CARD' || norm.includes('AMARILLA')) return 'Tarjeta Amarilla'
  if (norm === 'RED_CARD' || norm.includes('ROJA')) return 'Tarjeta Roja'
  if (norm === 'OWN_GOAL' || norm.includes('AUTOGOL')) return 'Autogol (Gol en contra)'
  if (norm === 'SUBSTITUTION' || norm.includes('SUSTITUCION') || norm.includes('CAMBIO')) return 'Sustitución'
  if (norm === 'INJURY' || norm.includes('LESION')) return 'Lesión de Jugador'
  return type || 'Evento'
}
