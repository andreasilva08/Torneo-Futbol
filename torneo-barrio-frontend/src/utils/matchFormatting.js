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

export const matchStatusLabel = (status) => ({
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizado',
}[status] || 'Estado desconocido')

export const matchStatusColor = (status) => ({
  SCHEDULED: 'blue-grey',
  IN_PROGRESS: 'positive',
  FINISHED: 'dark',
}[status] || 'grey')

export const eventTypeLabel = (type) => ({
  GOAL: 'Gol',
  ASSIST: 'Asistencia',
  YELLOW_CARD: 'Tarjeta amarilla',
  RED_CARD: 'Tarjeta roja',
}[type] || 'Evento')
