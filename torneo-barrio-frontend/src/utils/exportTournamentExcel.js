/**
 * Exporta EXCLUSIVAMENTE la Tabla de Posiciones a un archivo Excel (.xlsx)
 */
export const exportStandingsExcel = async (store, filename = 'tabla-de-posiciones.xlsx') => {
  try {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const standingsData = [
      ['TABLA GENERAL DE POSICIONES - TORNEO DE BARRIO 2026'],
      ['Posición', 'Equipo', 'Barrio / Cancha', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Puntos'],
      ...(store.standings || []).map((row) => [
        row.position ?? '',
        row.name || row.nombre || '',
        row.neighborhood || row.barrio || row.stadium || '',
        Number(row.played || 0),
        Number(row.wins || 0),
        Number(row.draws || 0),
        Number(row.losses || 0),
        Number(row.goalsFor || 0),
        Number(row.goalsAgainst || 0),
        Number(row.goalDifference || 0),
        Number(row.points || 0),
      ]),
    ]
    const wsStandings = XLSX.utils.aoa_to_sheet(standingsData)
    wsStandings['!cols'] = [
      { wch: 10 },
      { wch: 28 },
      { wch: 22 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 10 },
    ]
    XLSX.utils.book_append_sheet(wb, wsStandings, 'Clasificación General')

    XLSX.writeFile(wb, filename)
  } catch (err) {
    console.error('Error al exportar tabla de posiciones a Excel, usando fallback CSV:', err)
    downloadSingleTableCsv(
      [
        ['TABLA DE POSICIONES - CLASIFICACIÓN GENERAL'],
        ['Posición', 'Equipo', 'Barrio', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Puntos'],
        ...(store.standings || []).map((row) => [
          row.position,
          row.name || row.nombre,
          row.neighborhood || row.barrio || '',
          row.played,
          row.wins,
          row.draws,
          row.losses,
          row.goalsFor,
          row.goalsAgainst,
          row.goalDifference,
          row.points,
        ]),
      ],
      filename.replace('.xlsx', '.csv'),
    )
  }
}

/**
 * Exporta las tablas de estadísticas completas del Torneo a un archivo Excel (.xlsx)
 * con 4 hojas independientes:
 * - Hoja 1: Tabla de Posiciones / Clasificación General
 * - Hoja 2: Tabla de Goleadores (Posición, Jugador, Equipo, Goles)
 * - Hoja 3: Máximos Asistidores (Posición, Jugador, Equipo, Asistencias)
 * - Hoja 4: Valla Invicta / Porteros (Posición, Arquero, Equipo, PJ, Partidos Imbatidos, Goles Recibidos)
 */
export const exportTournamentExcel = async (store, filename = 'torneo-barrio-estadisticas-completas.xlsx') => {
  try {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    // 1. CLASIFICACIÓN GENERAL
    const standingsData = [
      ['TABLA GENERAL DE POSICIONES - TORNEO DE BARRIO 2026'],
      ['Posición', 'Equipo', 'Barrio / Cancha', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Puntos'],
      ...(store.standings || []).map((row) => [
        row.position ?? '',
        row.name || row.nombre || '',
        row.neighborhood || row.barrio || row.stadium || '',
        Number(row.played || 0),
        Number(row.wins || 0),
        Number(row.draws || 0),
        Number(row.losses || 0),
        Number(row.goalsFor || 0),
        Number(row.goalsAgainst || 0),
        Number(row.goalDifference || 0),
        Number(row.points || 0),
      ]),
    ]
    const wsStandings = XLSX.utils.aoa_to_sheet(standingsData)
    wsStandings['!cols'] = [
      { wch: 10 },
      { wch: 28 },
      { wch: 22 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 10 },
    ]
    XLSX.utils.book_append_sheet(wb, wsStandings, 'Clasificación General')

    // 2. TABLA DE GOLEADORES
    const scorersData = [
      ['TABLA OFICIAL DE MÁXIMOS GOLEADORES'],
      ['Posición', 'Jugador', 'Equipo', 'Goles'],
      ...(store.scorers || []).map((row, index) => [
        row.position || index + 1,
        row.player || row.name || 'Desconocido',
        row.team || 'Sin equipo',
        Number(row.goals ?? row.goles ?? 0),
      ]),
    ]
    const wsScorers = XLSX.utils.aoa_to_sheet(scorersData)
    wsScorers['!cols'] = [
      { wch: 10 },
      { wch: 28 },
      { wch: 24 },
      { wch: 10 },
    ]
    XLSX.utils.book_append_sheet(wb, wsScorers, 'Goleadores')

    // 3. MÁXIMOS ASISTIDORES
    const assistsData = [
      ['TABLA OFICIAL DE MÁXIMOS ASISTIDORES'],
      ['Posición', 'Jugador', 'Equipo', 'Asistencias'],
      ...(store.assists || []).map((row, index) => [
        row.position || index + 1,
        row.player || row.name || 'Desconocido',
        row.team || 'Sin equipo',
        Number(row.assists ?? row.asistencias ?? 0),
      ]),
    ]
    const wsAssists = XLSX.utils.aoa_to_sheet(assistsData)
    wsAssists['!cols'] = [
      { wch: 10 },
      { wch: 28 },
      { wch: 24 },
      { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, wsAssists, 'Asistencias')

    // 4. VALLA INVICTA / PORTEROS
    const goalkeepersData = [
      ['TABLA OFICIAL DE VALLA INVICTA / PORTEROS'],
      ['Posición', 'Arquero', 'Equipo', 'PJ', 'Partidos Imbatidos', 'Goles Recibidos'],
      ...(store.goalkeepers || []).map((row, index) => [
        row.position || index + 1,
        (row.goalkeepers || []).map((keeper) => keeper.player).join(' / ') || 'Sin portero registrado',
        row.team || 'Sin equipo',
        Number(row.matches || 0),
        Number(row.cleanSheets || 0),
        Number(row.goalsAgainst || 0),
      ]),
    ]
    const wsGoalkeepers = XLSX.utils.aoa_to_sheet(goalkeepersData)
    wsGoalkeepers['!cols'] = [
      { wch: 10 },
      { wch: 32 },
      { wch: 24 },
      { wch: 8 },
      { wch: 20 },
      { wch: 18 },
    ]
    XLSX.utils.book_append_sheet(wb, wsGoalkeepers, 'Valla Invicta')

    // Descargar el archivo XLSX
    XLSX.writeFile(wb, filename)
  } catch (err) {
    console.error('Error al generar Excel con xlsx, recurriendo a CSV:', err)
    downloadFallbackCsv(store, filename.replace('.xlsx', '.csv'))
  }
}

/**
 * Fallback a CSV en caso de contingencia para tabla individual
 */
const downloadSingleTableCsv = (rows, filename) => {
  const csvField = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const csv = `\uFEFF${rows.map((row) => row.map(csvField).join(';')).join('\r\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Fallback a CSV en caso de contingencia para reporte completo
 */
const downloadFallbackCsv = (store, filename) => {
  const csvField = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

  const csvRows = [
    ['TABLA DE POSICIONES - CLASIFICACIÓN GENERAL'],
    ['Posición', 'Equipo', 'Barrio', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Puntos'],
    ...(store.standings || []).map((row) => [
      row.position,
      row.name || row.nombre,
      row.neighborhood || row.barrio || '',
      row.played,
      row.wins,
      row.draws,
      row.losses,
      row.goalsFor,
      row.goalsAgainst,
      row.goalDifference,
      row.points,
    ]),
    [],
    ['TABLA DE GOLEADORES'],
    ['Posición', 'Jugador', 'Equipo', 'Goles'],
    ...(store.scorers || []).map((row, index) => [
      row.position || index + 1,
      row.player || row.name,
      row.team,
      row.goals ?? row.goles ?? 0,
    ]),
    [],
    ['MAXIMOS ASISTIDORES'],
    ['Posición', 'Jugador', 'Equipo', 'Asistencias'],
    ...(store.assists || []).map((row, index) => [
      row.position || index + 1,
      row.player || row.name,
      row.team,
      row.assists ?? row.asistencias ?? 0,
    ]),
    [],
    ['VALLA INVICTA / PORTEROS'],
    ['Posición', 'Arquero', 'Equipo', 'PJ', 'Partidos Imbatidos', 'Goles Recibidos'],
    ...(store.goalkeepers || []).map((row, index) => [
      row.position || index + 1,
      (row.goalkeepers || []).map((gk) => gk.player).join(' / ') || 'Sin portero registrado',
      row.team,
      row.matches,
      row.cleanSheets,
      row.goalsAgainst,
    ]),
  ]

  const csv = `\uFEFF${csvRows.map((row) => row.map(csvField).join(';')).join('\r\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
