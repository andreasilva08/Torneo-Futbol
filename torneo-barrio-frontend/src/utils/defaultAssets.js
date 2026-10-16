export const getDefaultTeamLogo = (team = '') => {
  let source = 'default-team'
  if (typeof team === 'string') {
    source = team.trim()
  } else if (team && typeof team === 'object') {
    source = team.name || team.nombre || team._id || team.id || 'default-team'
  }
  const normalized = String(source).toLowerCase().trim() || 'default-team'

  let hash = 0
  for (let index = 0; index < normalized.length; index += 1) {
    hash = normalized.charCodeAt(index) + ((hash << 5) - hash)
  }

  const safeHash = Math.abs(hash)
  const index = (safeHash % 6) + 1
  return `/images/default-team-${index}.svg`
}

export const getTeamLogoUrl = (team) => {
  if (!team) return '/images/default-team-1.svg'
  if (typeof team === 'string') {
    if (team.startsWith('http') || team.startsWith('/') || team.startsWith('data:')) {
      return team
    }
    return getDefaultTeamLogo(team)
  }
  const logo = team.logoUrl || team.escudo_url || ''
  if (logo && String(logo).trim()) {
    return String(logo).trim()
  }
  return getDefaultTeamLogo(team)
}

export const getPlayerUnifiedLogo = (player, team = null) => {
  if (player?.photoUrl && String(player.photoUrl).trim()) {
    return String(player.photoUrl).trim()
  }
  if (team) {
    return getTeamLogoUrl(team)
  }
  return '/images/default-player.svg'
}
